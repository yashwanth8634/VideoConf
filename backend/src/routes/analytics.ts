import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { validateRequest } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { ApiResponse } from '../../shared-types/src/index';
import { z } from 'zod';

const router = Router();

/**
 * @route   POST /api/analytics/focus-score
 * @desc    Submit focus score from client (AI detection)
 * @access  Private
 */
const submitFocusScoreSchema = z.object({
  meetingId: z.string(),
  focusScore: z.number().min(0).max(100),
  // Optional: individual scores for eye contact, face presence, head position
  eyeContactScore: z.number().min(0).max(100).optional(),
  facePresenceScore: z.number().min(0).max(100).optional(),
  headPositionScore: z.number().min(0).max(100).optional(),
});

router.post(
  '/focus-score',
  authenticate,
  validateRequest(submitFocusScoreSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;
      const { meetingId, focusScore, eyeContactScore, facePresenceScore, headPositionScore } = req.body;

      // Verify meeting exists and user is a participant
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        return res
          .status(404)
          .json({ success: false, error: 'Meeting not found' } as ApiResponse<null>);
      }

      const isParticipant = await prisma.participant.findFirst({
        where: { meetingId, userId, leftAt: null },
      });

      if (!isParticipant) {
        return res
          .status(403)
          .json({ success: false, error: 'Only participants can submit focus scores' } as ApiResponse<null>);
      }

      // Upsert analytics record (update if exists, create if not)
      const analytics = await prisma.analytics.upsert({
        where: {
          meetingId_userId: {
            meetingId,
            userId,
          },
        },
        update: {
          focusScore,
          // We could also store individual scores if we add columns for them
          // For now, we're just storing the composite focus score
        },
        create: {
          meetingId,
          userId,
          focusScore,
        },
      });

      res.status(200).json({
        success: true,
        data: analytics,
      } as ApiResponse<typeof analytics>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/analytics/meeting/:meetingId
 * @desc    Get analytics for a meeting (host only)
 * @access  Private
 */
router.get(
  '/meeting/:meetingId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const meetingId = req.params.meetingId;
      const userId = req.userId;

      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        return res
          .status(404)
          .json({ success: false, error: 'Meeting not found' } as ApiResponse<null>);
      }

      // Only host can get meeting analytics
      if (meeting.hostId !== userId) {
        return res
          .status(403)
          .json({ success: false, error: 'Only host can view meeting analytics' } as ApiResponse<null>);
      }

      const analytics = await prisma.analytics.findMany({
        where: { meetingId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { focusScore: 'desc' }, // Highest focus first
      });

      res.status(200).json({
        success: true,
        data: analytics,
      } as ApiResponse<typeof analytics>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/analytics/user/:userId
 * @desc    Get analytics for a user (own data only)
 * @access  Private
 */
router.get(
  '/user/:userId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.userId;
      const currentUserId = req.userId;

      // Users can only view their own analytics
      if (userId !== currentUserId) {
        return res
          .status(403)
          .json({ success: false, error: 'Access denied' } as ApiResponse<null>);
      }

      const analytics = await prisma.analytics.findMany({
        where: { userId },
        include: {
          meeting: {
            select: {
              id: true,
              title: true,
              actualStart: true,
              actualEnd: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: analytics,
      } as ApiResponse<typeof analytics>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/analytics/meeting/:meetingId/complete
 * @desc    Generate post-meeting analytics (host only)
 * @access  Private
 */
const completeMeetingSchema = z.object({
  // We might want to allow manual override of some scores
  attentionScore: z.number().min(0).max(100).optional(),
  speakingTime: z.number().min(0).optional(),
  joinDuration: z.number().min(0).optional(),
  participationScore: z.number().min(0).max(100).optional(),
});

router.post(
  '/meeting/:meetingId/complete',
  authenticate,
  validateRequest(completeMeetingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const meetingId = req.params.meetingId;
      const userId = req.userId;
      const {
        attentionScore,
        speakingTime,
        joinDuration,
        participationScore,
      } = req.body;

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
          .json({ success: false, error: 'Only host can complete meeting analytics' } as ApiResponse<null>);
      }

      // Update meeting end time if not already set
      if (!meeting.actualEnd) {
        await prisma.meeting.update({
          where: { id: meetingId },
          data: {
            actualEnd: new Date(),
          },
        });
      }

      // For each participant, update their analytics with post-meeting scores
      // In a real implementation, we would calculate these from actual data
      // For now, we'll use the provided scores or calculate defaults

      const participants = await prisma.participant.findMany({
        where: { meetingId, leftAt: { not: null } }, // Only those who have left
        include: {
          analytics: true,
        },
      });

      const updatedAnalytics = await Promise.all(
        participants.map(async (participant) => {
          // If analytics record exists, update it; otherwise create
          if (participant.analytics) {
            return await prisma.analytics.update({
              where: { id: participant.analytics.id },
              data: {
                attentionScore: attentionScore ?? participant.analytics.attentionScore ?? 0,
                speakingTime: speakingTime ?? participant.analytics.speakingTime ?? 0,
                joinDuration: joinDuration ?? participant.analytics.joinDuration ?? 0,
                participationScore:
                  participationScore ?? participant.analytics.participationScore ?? 0,
              },
            });
          } else {
            return await prisma.analytics.create({
              data: {
                meetingId,
                userId: participant.userId,
                attentionScore,
                speakingTime,
                joinDuration,
                participationScore,
                // focusScore would have been submitted during the meeting
              },
            });
          }
        })
      );

      res.status(200).json({
        success: true,
        data: updatedAnalytics,
      } as ApiResponse<typeof updatedAnalytics>);
    } catch (error) {
      next(error);
    }
  }
);

export default router;