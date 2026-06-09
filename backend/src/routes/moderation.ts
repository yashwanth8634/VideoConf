import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { validateRequest } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { ApiResponse } from '../../shared-types/src/index';
import { z } from 'zod';
import { io } from '../socket'; // Socket.IO instance
import { moderationService } from '../services/moderationService';

const router = Router();

/**
 * @route   POST /api/moderation/check-toxicity
 * @desc    Check if a message is toxic (used by client before sending)
 * @access  Private
 */
const checkToxicitySchema = z.object({
  content: z.string().min(1),
});

router.post(
  '/check-toxicity',
  authenticate,
  validateRequest(checkToxicitySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { content } = req.body;

      // Use moderation service to check toxicity
      const result = await moderationService.checkToxicity(content);

      res.status(200).json({
        success: true,
        data: result,
      } as ApiResponse<{ isToxic: boolean; confidence: number; details?: any }>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/moderation/check-spam
 * @desc    Check if a message is spam
 * @access  Private
 */
const checkSpamSchema = z.object({
  content: z.string().min(1),
  userId: z.string(), // To check user's history
});

router.post(
  '/check-spam',
  authenticate,
  validateRequest(checkSpamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { content, userId } = req.body;

      // Verify the userId matches the authenticated user (or they are checking their own)
      if (userId !== req.userId) {
        return res
          .status(403)
          .json({ success: false, error: 'Can only check spam for own user' } as ApiResponse<null>);
      }

      const result = await moderationService.checkSpam(content, userId);

      res.status(200).json({
        success: true,
        data: result,
      } as ApiResponse<{ isSpam: boolean; confidence: number; details?: any }>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/moderation/check-profanity
 * @desc    Check if a message contains profanity
 * @access  Private
 */
const checkProfanitySchema = z.object({
  content: z.string().min(1),
});

router.post(
  '/check-profanity',
  authenticate,
  validateRequest(checkProfanitySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { content } = req.body;

      const result          = await moderationService.checkProfanity(content);

      res.status(200).json({
        success: true,
        data: result,
      } as ApiResponse<{ containsProfanity: boolean; profanityCount: number; details?: any }>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/moderation/warn
 * @desc    Warn a participant (host only)
 * @access  Private
 */
const warnSchema = z.object({
  meetingId: z.string(),
  participantId: z.string(), // User ID to warn
  message: z.string().optional(),
});

router.post(
  '/warn',
  authenticate,
  validateRequest(warnSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { meetingId, participantId, message } = req.body;
      const userId = req.userId;

      // Verify meeting exists and user is host
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        return res
          .status(404)
          .json({ success: false, error: 'Meeting not found' } as ApiResponse<null>);
      }

      if (meeting.hostId !== userId) {
        return res
          .status(403)
          .json({ success: false, error: 'Only host can warn participants' } as ApiResponse<null>);
      }

      // Verify participant is in the meeting
      const participant = await prisma.participant.findFirst({
        where: { meetingId, userId: participantId },
      });

      if (!participant) {
        return res
          .status(400)
          .json({ success: false, error: 'Participant not in meeting' } as ApiResponse<null>);
      }

      // Create notification for the warned user
      await prisma.notification.create({
        data: {
          userId: participantId,
          meetingId,
          type: 'MODERATION_ACTION',
          title: 'Warning Issued',
          body: message || 'You have received a warning from the meeting host.',
        },
      });

      // Emit to Socket.IO for real-time notification
      io.to(participantId).emit('moderation-warning', {
        meetingId,
        message: message || 'You have received a warning from the meeting host.',
      });

      // Log audit trail
      await prisma.auditLog.create({
        data: {
          userId, // host
          action: 'PARTICIPANT_WARNED',
          entityType: 'USER',
          entityId: participantId,
          details: {
            meetingId,
            message,
          },
        },
      });

      res.status(200).json({
        success: true,
        data: { message: 'Warning issued successfully' },
      } as ApiResponse<{ message: string }>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/moderation/mute
 * @desc    Mute a participant (host only)
 * @access  Private
 */
const muteSchema = z.object({
  meetingId: z.string(),
  participantId: z.string(), // User ID to mute
  duration: z.number().int().positive().optional(), // Duration in minutes, null for indefinite
});

router.post(
  '/mute',
  authenticate,
  validateRequest(muteSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { meetingId, participantId, duration } = req.body;
      const userId = req.userId;

      // Verify meeting exists and user is host
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        return res
          .status(404)
          .json({ success: false, error: 'Meeting not found' } as ApiResponse<null>);
      }

      if (meeting.hostId !== userId) {
        return res
          .status(403)
          .json({ success: false, error: 'Only host can mute participants' } as ApiResponse<null>);
      }

      // Verify participant is in the meeting
      const participant = await prisma.participant.findFirst({
        where: { meetingId, userId: participantId },
      });

      if (!participant) {
        return res
          .status(400)
          .json({ success: false, error: 'Participant not in meeting' } as ApiResponse<null>);
      }

      // We could store mute info in database, but for now we'll just emit via Socket.IO
      // In a production app, we might want to store mutes in a table with expiry

      // Emit to Socket.IO for real-time muting
      io.to(participantId).emit('moderation-mute', {
        meetingId,
        duration: duration || null, // null means indefinite
      });

      // Notify the muted user
      await prisma.notification.create({
        data: {
          userId: participantId,
          meetingId,
          type: 'MODERATION_ACTION',
          title: 'You have been muted',
          body: duration
            ? `You have been muted for ${duration} minutes.`
            : 'You have been muted indefinitely.',
        },
      });

      // Log audit trail
      await prisma.auditLog.create({
        data: {
          userId, // host
          action: 'PARTICIPANT_MUTED',
          entityType: 'USER',
          entityId: participantId,
          details: {
            meetingId,
            duration,
          },
        },
      });

      res.status(200).json({
        success: true,
        data: { message: 'Participant muted successfully' },
      } as ApiResponse<{ message: string }>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/moderation/kick
 * @desc    Kick a participant from meeting (host only)
 * @access  Private
 */
const kickSchema = z.object({
  meetingId: z.string(),
  participantId: z.string(), // User ID to kick
  message: z.string().optional(),
});

router.post(
  '/kick',
  authenticate,
  validateRequest(kickSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { meetingId, participantId, message } = req.body;
      const userId = req.userId;

      // Verify meeting exists and user is host
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        return res
          .status(404)
          .json({ success: false, error: 'Meeting not found' } as ApiResponse<null>);
      }

      if (meeting.hostId !== userId) {
        return res
          .status(403)
          .json({ success: false, error: 'Only host can kick participants' } as ApiResponse<null>);
      }

      // Verify participant is in the meeting
      const participant = await prisma.participant.findFirst({
        where: { meetingId, userId: participantId, leftAt: null },
      });

      if (!participant) {
        return res
          .status(400)
          .json({ success: false, error: 'Participant not in meeting' } as ApiResponse<null>);
      }

      // Update participant left time (kick them)
      await prisma.participant.update({
        where: { id: participant.id },
        data: {
          leftAt: new Date(),
        },
      });

      // Create notification for the kicked user
      await prisma.notification.create({
        data: {
          userId: participantId,
          meetingId,
          type: 'MODERATION_ACTION',
          title: 'You have been removed from the meeting',
          body: message || 'You have been removed from the meeting by the host.',
        },
      });

      // Emit to Socket.IO for real-time kick
      io.to(participantId).emit('moderation-kick', {
        meetingId,
        message: message || 'You have been removed from the meeting by the host.',
      });

      // Also notify other participants that someone was kicked
      io.to(meetingId).emit('participant-left', {
        participantId,
        reason: 'kicked_by_host',
      });

      // Log audit trail
      await prisma.auditLog.create({
        data: {
          userId, // host
          action: 'PARTICIPANT_KICKED',
          entityType: 'USER',
          entityId: participantId,
          details: {
            meetingId,
            message,
          },
        },
      });

      res.status(200).json({
        success: true,
        data: { message: 'Participant kicked successfully' },
      } as ApiResponse<{ message: string }>);
    } catch (error) {
      next(error);
    }
  }
);

export default router;