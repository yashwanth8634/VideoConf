import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { validateRequest } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { ApiResponse } from '../../shared-types/src/index';
import { z } from 'zod';
import { io } from '../socket'; // Socket.IO instance

const router = Router();

/**
 * @route   POST /api/chat/:meetingId/messages
 * @desc    Send a message in a meeting
 * @access  Private
 */
const sendMessageSchema = z.object({
  content: z.string().min(1).max(1000),
  type: z.enum(['TEXT', 'FILE']).default('TEXT'),
  fileUrl: z.string().url().optional(),
  fileName: z.string().optional(),
});

router.post(
  '/:meetingId/messages',
  authenticate,
  validateRequest(sendMessageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const meetingId = req.params.meetingId;
      const userId = req.userId;
      const { content, type, fileUrl, fileName } = req.body;

      // Verify meeting exists and user is a participant
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          participants: true,
        },
      });

      if (!meeting) {
        return res
          .status(404)
          .json({ success: false, error: 'Meeting not found' } as ApiResponse<null>);
      }

      const isParticipant = meeting.participants.some(
        (p) => p.userId === userId && p.leftAt === null
      );

      if (!isParticipant) {
        return res
          .status(403)
          .json({ success: false, error: 'Only participants can send messages' } as ApiResponse<null>);
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          meetingId,
          senderId: userId,
          content,
          type,
          fileUrl,
          fileName,
        },
      });

      // Emit to Socket.IO room for real-time updates
      io.to(meetingId).emit('new-message', {
        id: message.id,
        meetingId: message.meetingId,
        senderId: message.senderId,
        content: message.content,
        type: message.type,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        createdAt: message.createdAt,
      });

      res.status(201).json({
        success: true,
        data: message,
      } as ApiResponse<typeof message>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/chat/:meetingId/messages
 * @desc    Get messages for a meeting (with pagination)
 * @access  Private
 */
router.get(
  '/:meetingId/messages',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const meetingId = req.params.meetingId;
      const userId = req.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      // Verify meeting exists and user is a participant
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          participants: true,
        },
      });

      if (!meeting) {
        return res
          .status(404)
          .json({ success: false, error: 'Meeting not found' } as ApiResponse<null>);
      }

      const isParticipant = meeting.participants.some(
        (p) => p.userId === userId
      );

      if (!isParticipant && !meeting.isPublic) {
        return res
          .status(403)
          .json({ success: false, error: 'Access denied' } as ApiResponse<null>);
      }

      const [messages, total] = await prisma.$transaction([
        prisma.message.findMany({
          where: { meetingId },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'asc' }, // Oldest first for chat
        }),
        prisma.message.count({
          where: { meetingId },
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          messages,
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      } as ApiResponse<{ messages: any[]; total: number; page: number; limit: number; pages: number }>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/chat/:messageId
 * @desc    Delete a message (only sender or host can delete)
 * @access  Private
 */
router.delete(
  '/:messageId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messageId = req.params.messageId;
      const userId = req.userId;

      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          meeting: true,
        },
      });

      if (!message) {
        return res
          .status(404)
          .json({ success: false, error: 'Message not found' } as ApiResponse<null>);
      }

      // Check if user is sender
      const isSender = message.senderId === userId;

      // Check if user is host of the meeting
      const isHost = message.meeting?.hostId === userId;

      if (!isSender && !isHost) {
        return res
          .status(403)
          .json({ success: false, error: 'Only sender or host can delete message' } as ApiResponse<null>);
      }

      // Delete message
      await prisma.message.delete({
        where: { id: messageId },
      });

      // Emit deletion to Socket.IO room
      io.to(message.meetingId).emit('message-deleted', {
        messageId,
      });

      res.status(200).json({ success: true, data: null } as ApiResponse<null>);
    } catch (error) {
      next(error);
    }
  }
);

export default router;