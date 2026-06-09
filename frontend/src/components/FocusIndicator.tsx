import { useFocusDetection } from '@/lib/ai/useFocusDetection';
import { useRef } from 'react';
import { VideoIcon } from 'lucide-react';

interface FocusIndicatorProps {
  meetingId: string;
  userId: string;
}

export default function FocusIndicator({ meetingId, userId }: FocusIndicatorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    focusScore,
    eyeContactScore,
    facePresenceScore,
    headPositionScore,
    isActive,
    error,
  } = useFocusDetection(videoRef, {
    interval: 1000, // Check once per second
    smoothing: true,
    smoothingWindowSize: 5,
  });

  // Determine color based on score
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  // In a real app, we would send this score to our backend periodically
  // For now, we'll just display it locally

  return (
    <div className="relative">
      <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
        <VideoIcon className="h-4 w-4 text-gray-400" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Focus Score</span>
            <span className={`text-sm font-bold ${getScoreColor(focusScore)}`}>
              {focusScore}%
            </span>
          </div>
          {isActive && focusScore > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`${getScoreColor(focusScore)} h-1.5 rounded-full`}
                style={{ width: `${focusScore}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>
      {/* Tooltip with detailed scores */}
      {isActive && (
        <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 dark:bg-gray-800">
          <div className="py-2 px-3 text-sm text-gray-700 dark:text-gray-200">
            <div className="flex items-center space-x-2 mb-1">
              <span className="h-3 w-3 rounded-full bg-green-400" />
              <span>Eye Contact: {eyeContactScore}%</span>
            </div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span>Face Presence: {facePresenceScore}%</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="h-3 w-3 rounded-full bg-blue-400" />
              <span>Head Position: {headPositionScore}%</span>
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-red-50 dark:bg-red-900/20 ring-1 ring-red-500 dark:ring-red-900">
          <div className="py-2 px-3 text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        </div>
      )}
      {/* Hidden video element for analysis */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ position: 'absolute', width: 0, height: 0 }}
      />
    </div>
  );
}