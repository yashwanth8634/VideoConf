import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { validateRequest } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { ApiResponse } from '../../shared-types/src/index';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { LivekitService } from '../services/livekitService';

// Initialize LivekitService
const livekitService = new LivekitService();

const router = Router();

/**
 * @route   POST /api/meetings
 * @desc    Create a new meeting
 * @access  Private
 */
const createMeetingSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  scheduledStart: z.string().datetime().optional(),
  isPublic: z.boolean().optional(),
  waitingRoomEnabled: z.boolean().optional(),
  maxParticipants: z.number().int().min(1).max(100).optional(),
});

router.post(
  '/',
  authenticate,
  validateRequest(createMeetingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId; // Set by authenticate middleware
      const {
        title,
        description,
        scheduledStart,
        isPublic = false,
        waitingRoomEnabled = true,
        maxParticipants = 50,
      } = req.body;

      // Create meeting in database
      const meeting = await prisma.meeting.create({
        data: {
          title,
          description,
          scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
          hostId: userId,
          isPublic,
          waitingRoomEnabled,
          maxParticipants,
          meetingToken: uuidv4(), // We'll use this as a simple token, but in reality we'll use LiveKit tokens
        },
      });

      // Generate a LiveKit token for the host (if needed)
      // For now, we'll just return the meeting details.
      // In a real implementation, we would generate a LiveKit token for the host to join.

      res.status(201).json({
        success: true,
        data: meeting,
      } as ApiResponse<typeof meeting>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/meetings/:id
 * @desc    Get meeting by ID
 * @access  Private (or public if meeting is public)
 */
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const meetingId = req.params.id;
      const userId = req.userId;

      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          host: true,
          participants: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!meeting) {
        return res
          .status(404)
          .json({ success: false, error: 'Meeting not found' } as ApiResponse<null>);
      }

      // Check if the meeting is public or if the user is the host or a participant
      const isParticipant = meeting.participants.some(
        (p) => p.userId === userId
      );
      const isHost = meeting.hostId === userId;

      if (!meeting.isPublic && !isHost && !isParticipant) {
        return res
          .status(403)
          .json({ success: false, error: 'Access denied' } as ApiResponse<null>);
      }

      res.status(200).json({
        success: true,
        data: meeting,
      } as ApiResponse<typeof meeting>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PATCH /api/meetings/:id
 * @desc    Update meeting (only host can update)
 * @access  Private
 */
const updateMeetingSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  scheduledStart: z.string().datetime().optional(),
  isPublic: z.boolean().optional(),
  waitingRoomEnabled: z.boolean().optional(),
  maxParticipants: z.number().int().min(1).max(100).optional(),
});

router.patch(
  '/:id',
  authenticate,
  validateRequest(updateMeetingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const meetingId = req.params.id;
      const userId = req.userId;

      // Check if meeting exists and user is host
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
          .json({ success: false, error: 'Only host can update meeting' } as ApiResponse<null>);
      }

      const {
        title,
        description,
        scheduledStart,
        isPublic,
        waitingRoomEnabled,
        maxParticipants,
      } = req.body;

      const updatedMeeting = await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          title,
          description,
          scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
          isPublic,
          waitingRoomEnabled,
          maxParticipants,
        },
      });

      res.status(200).json({
        success: true,
        data: updatedMeeting,
      } as ApiResponse<typeof updatedMeeting>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/meetings/:id
 * @desc    End meeting (only host can end)
 * @access  Private
 */
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const meetingId = req.params.id;
      const userId = req.userId;

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
          .json({ success: false, error: 'Only host can end meeting' } as ApiResponse<null>);
      }

      // Update meeting end time
      const endedMeeting = await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          actualEnd: new Date(),
        },
      });

      // Optionally, we can disconnect all participants and end the LiveKit room
      // For now, we'll just update the database.

      res.status(200).json({
        success: true,
        data: endedMeeting,
      } as ApiResponse<typeof endedMeeting>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/meetings/:id/join
 * @desc    Join a meeting
 * @access  Private
 */
const joinMeetingSchema = z.object({
  password: z.string().optional(), // For password-protected meetings (not implemented yet)
});

router.post(
  '/:id/join',
  authenticate,
  validateRequest(joinMeetingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const meetingId = req.params.id;
      const userId = req.userId;

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

      // Check if meeting has ended
      if (meeting.actualEnd) {
        return res
          .status(400)
          .json({ success: false, error: 'Meeting has ended' } as ApiResponse<null>);
      }

      // Check if user is already a participant
      const existingParticipant = meeting.participants.find(
        (p) => p.userId === userId
      );

      if (existingParticipant) {
        // If already joined, we can update the leave time to null (rejoin)
        await prisma.participant.update({
          where: { id: existingParticipant.id },
          data: {
            leftAt: null,
            isWaiting: false, // Assuming they are not waiting if they are rejoining
          },
        });

        // Generate a LiveKit token for the user to join the room
        const livekitToken = await livekitService.generateToken({
          roomName: meetingId,
          participantIdentity: userId,
          participantName: (await prisma.user.findUnique({ where: { id: userId } }))?.name || 'User',
          canPublish: true,
          canSubscribe: true,
        });

        return res.status(200).json({
          success: true,
          data: {
            meeting,
            livekitToken,
          },
        } as ApiResponse<{ meeting: typeof meeting; livekitToken: string }>);
      }

      // Check if meeting is full
      if (meeting.participants.length >= meeting.maxParticipants) {
        return res
          .status(400)
          .json({ success: false, error: 'Meeting is full' } as ApiResponse<null>);
      }

      // Check waiting room
      let isWaiting = meeting.waitingRoomEnabled && !meeting.isPublic;
      // If the meeting is public or waiting room is disabled, user can join directly
      // Also, the host can bypass waiting room
      const isHost = meeting.hostId === userId;
      if (isHost) {
        isWaiting = false;
      }

      // Create participant record
      const participant = await prisma.participant.create({
        data: {
          userId,
          meetingId,
          isHost: false, // We already checked that the user is not the host (if they were, we would have set isHost to true above? Actually, we didn't. Let's set isHost based on whether the user is the host.)
          isWaiting,
        },
      });

      // Update the participant to set isHost if the user is the host
      if (isHost) {
        await prisma.participant.update({
          where: { id: participant.id },
          data: {
            isHost: true,
          },
        });
      }

      // Generate a LiveKit token for the user
      const livekitToken = await livekitService.generateToken({
        roomName: meetingId,
        participantIdentity: userId,
        participantName: (await prisma.user.findUnique({ where: { id: userId } }))?.name || 'User',
        canPublish: true,
        canSubscribe: true,
      });

      res.status(201).json({
        success: true,
        data: {
          meeting,
          participant,
          livekitToken,
        },
      } as ApiResponse<{ meeting: typeof meeting; participant: typeof participant; livekitToken: string }>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/meetings/:id/leave
 * @desc    Leave a meeting
 * @access  Private
 */
router.post(
  '/:id/leave',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const meetingId = req.params.id;
      const userId = req.userId;

      const participant = await prisma.participant.findFirst({
        where: {
          meetingId,
          userId,
          leftAt: null, // Only leave if currently in meeting
        },
      });

      if (!participant) {
        return res
          .status(400)
          .json({ success: false, error: 'Not in meeting' } as ApiResponse<null>);
      }

      // Update participant left time
      await prisma.participant.update({
        where: { id: participant.id },
        data: {
          leftAt: new Date(),
        },
      });

      // If the user was the host and leaves, we might want to end the meeting or transfer host.
      // For simplicity, we'll just leave the meeting. Host transfer can be implemented later.

      res.status(200).json({ success: true, data: null } as ApiResponse<null>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/meetings
 * @desc    Get list of meetings (with pagination and filtering)
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      // We can filter by:
      // - Meetings hosted by the user
      // - Meetings the user is a participant in
      // - Public meetings
      // For now, let's get meetings where the user is host or participant, plus public meetings.

      const [meetings, total] = await prisma.$transaction([
        prisma.meeting.findMany({
          where: {
            OR: [
              { hostId: userId },
              { participants: { some: { userId } } },
              { isPublic: true },
            ],
          },
          include: {
            host: true,
            _count: {
              select: { participants: true },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.meeting.count({
          where: {
            OR: [
              { hostId: userId },
              { participants: { some: { userId } } },
              { isPublic: true },
            ],
          },
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          meetings,
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      } as ApiResponse<{ meetings: any[]; total: number; page: number; limit: number; pages: number }>);
    } catch (error) {
      next(error);
    }
  }
);

export default router;