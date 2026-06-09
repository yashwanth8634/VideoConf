import { useEffect, useState, useCallback, useRef } from 'react';
import { detectEyeContact, detectFacePresence, detectHeadPosition } from './eyeContact'; // We'll import from the correct files
import { calculateFocusScoreWeighted, FocusScoreSmoother } from './focusScore';

// Correct imports
import eyeContact from './eyeContact';
import facePresence from './facePresence';
import headPosition from './headPosition';
import { calculateFocusScoreWeighted, FocusScoreSmoother } from './focusScore';

interface FocusDetectionOptions {
  /** How often to run detection (in milliseconds) */
  interval?: number;
  /** Whether to enable smoothing of the score */
  smoothing?: boolean;
  /** Smoothing window size (if smoothing enabled) */
  smoothingWindowSize?: number;
  /** Minimum face presence score required to consider other metrics */
  minFacePresence?: number;
}

interface FocusDetectionResult {
  /** Current focus score (0-100) */
  focusScore: number;
  /** Individual component scores */
  eyeContactScore: number;
  facePresenceScore: number;
  headPositionScore: number;
  /** Whether detection is active */
  isActive: boolean;
  /** Error if detection failed */
  error: string | null;
}

/**
 * Hook for AI-powered focus detection using MediaPipe
 * 
 * This hook continuously analyzes the user's video stream to generate
 * a focus score based on eye contact, face presence, and head position.
 * 
 * @param videoElementRef - Ref to the HTML video element to analyze
 * @param options - Configuration options
 * @returns Object containing focus score and detection state
 */
export function useFocusDetection(
  videoElementRef: React.RefObject<HTMLVideoElement>,
  options: FocusDetectionOptions = {}
): FocusDetectionResult {
  const {
    interval = 1000, // Default to once per second
    smoothing = true,
    smoothingWindowSize = 5,
    minFacePresence = 30, // Require at least 30% face presence
  } = options;

  const [focusScore, setFocusScore] = useState(0);
  const [eyeContactScore, setEyeContactScore] = useState(0);
  const [facePresenceScore, setFacePresenceScore] = useState(0);
  const [headPositionScore, setHeadPositionScore] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const focusSmootherRef = useRef<FocusScoreSmoother | null>(null);

  // Initialize smoother if enabled
  useEffect(() => {
    if (smoothing) {
      focusSmootherRef.current = new FocusScoreSmoother(smoothingWindowSize);
    }
    
    // Set the video ref from the parameter
    videoRef.current = videoElementRef.current;
    
    return () => {
      // Cleanup
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [smoothing, smoothingWindowSize]);

  // Start/stop detection based on video element availability
  useEffect(() => {
    const videoElement = videoElementRef.current;
    
    if (!videoElement) {
      setIsActive(false);
      return;
    }

    // Check if video is ready
    if (videoElement.readyState >= 2) { // HAVE_CURRENT_DATA or better
      startDetection();
    } else {
      const handleLoadedData = () => {
        startDetection();
        videoElement.removeEventListener('loadeddata', handleLoadedData);
      };
      videoElement.addEventListener('loadeddata', handleLoadedData);
    }

    return () => {
      stopDetection();
    };
  }, [videoElementRef]);

  const startDetection = useCallback(() => {
    if (isActive) return;
    setIsActive(true);
    setError(null);
    detectFrame();
  }, [isActive]);

  const stopDetection = useCallback(() => {
    setIsActive(false);
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const detectFrame = useCallback(async () => {
    if (!isActive) return;
    
    const videoElement = videoRef.current;
    if (!videoElement) {
      stopDetection();
      return;
    }

    try {
      // Run detection for each metric
      const [eyeContact, facePresence, headPosition] = await Promise.all([
        eyeContact.detectEyeContact(videoElement),
        facePresence.detectFacePresence(videoElement),
        headPosition.detectHeadPosition(videoElement),
      ]);

      setEyeContactScore(eyeContact);
      setFacePresenceScore(facePresence);
      setHeadPositionScore(headPosition);

      // Calculate focus score
      let rawFocusScore = calculateFocusScoreWeighted(
        eyeContact,
        facePresence,
        headPosition
      );

      // Apply face presence gating: if face presence is too low, focus score is 0
      if (facePresence < minFacePresence) {
        rawFocusScore = 0;
      }

      // Apply smoothing if enabled
      const finalScore = smoothing && focusSmootherRef.current
        ? focusSmootherRef.current.update(rawFocusScore)
        : rawFocusScore;

      setFocusScore(finalScore);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error in detection');
      console.error('Focus detection error:', err);
    }

    // Schedule next detection
    if (isActive) {
      timeoutRef.current = setTimeout(() => {
        // Use requestAnimationFrame for better synchronization with video paint
        animationFrameRef.current = requestAnimationFrame(() => {
          detectFrame();
        });
      }, interval);
    }
  }, [
    isActive,
    interval,
    smoothing,
    minFacePresence,
    eyeContact.detectEyeContact,
    facePresence.detectFacePresence,
    headPosition.detectHeadPosition,
    calculateFocusScoreWeighted,
  ]);

  // Reset detection when video element changes significantly
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, []);

  return {
    focusScore,
    eyeContactScore,
    facePresenceScore,
    headPositionScore,
    isActive,
    error,
  };
}

export default useFocusDetection;