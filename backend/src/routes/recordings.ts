import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { validateRequest } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { ApiResponse } from '../../shared-types/src/index';
import { z } from 'zod';
import { LivekitService } from '../services/livekitService';

const livekitService = new LivekitService();

const router = Router();

/**
 * @route   POST /api/recordings/:meetingId/start
 * @desc    Start recording a meeting (only host)
 * @access  Private
 */
router.post(
  '/:meetingId/start',
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

      if (meeting.hostId !== userId) {
        return res
          .status(403)
          .json({ success: false, error: 'Only host can start recording' } as ApiResponse<null>);
      }

      // Start recording via LiveKit
      const recordingInfo = await livekitService.startRecording(meetingId);

      // Optionally, we can store the recording info in the database
      // For now, we just return it.

      res.status(200).json({
        success: true,
        data: recordingInfo,
      } as ApiResponse<typeof recordingInfo>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/recordings/:meetingId/stop
 * @desc    Stop recording a meeting (only host)
 * @access  Private
 */
router.post(
  '/:meetingId/stop',
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

      if (meeting.hostId !== userId) {
        return res
          .status(403)
          .json({ success: false, error: 'Only host can stop recording' } as ApiResponse<null>);
      }

      // Stop recording via LiveKit
      const recordingInfo = await livekitService.stopRecording(meetingId);

      res.status(200).json({
        success: true,
        data: recordingInfo,
      } as ApiResponse<typeof recordingInfo>);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/recordings/:meetingId
 * @desc    Get recording details for a meeting
 * @access  Private
 */
router.get(
  '/:meetingId',
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

      // Check if user is host or participant
      const isHost = meeting.hostId === userId;
      const isParticipant = await prisma.participant.findFirst({
        where: { meetingId, userId },
      });

      if (!isHost && !isParticipant) {
        return res
          .status(403)
          .json({ success: false, error: 'Access denied' } as ApiResponse<null>);
      }

      // Get recording info from LiveKit (or from our database if we stored it)
      const recordingInfo = await livekitService.getRecording(meetingId);

      res.status(200).json({
        success: true,
        data: recordingInfo,
      } as ApiResponse<typeof recordingInfo>);
    } catch (error) {
      next(error);
    }
  }
);

export default router;