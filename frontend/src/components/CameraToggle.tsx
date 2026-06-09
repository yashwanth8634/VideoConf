import { useRoom } from '@livekit/react';
import { useState } from 'react';
import { VideoIcon, VideoOffIcon } from 'lucide-react';

export function CameraToggle() {
  const { localParticipant } = useRoom();
  const [isOpen, setIsOpen] = useState(false);

  const isCameraEnabled = localParticipant?.trackPublications.has('camera') ?? false;

  const handleClick = async () => {
    try {
      if (isCameraEnabled) {
        await localParticipant?.disableCamera();
      } else {
        await localParticipant?.enableCamera();
      }
    } catch (err) {
      console.error('Failed to toggle camera:', err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="p-2 rounded-full bg-gray-200 bg-opacity-50 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label={isCameraEnabled ? 'Disable camera' : 'Enable camera'}
      >
        {isCameraEnabled ? (
          <VideoIcon className="h-4 w-4 text-gray-900" />
        ) : (
          <VideoOffIcon className="h-4 w-4 text-gray-900" />
        )}
      </button>
      {/* Dropdown for camera selection (placeholder) */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
          <div className="py-1">
            {/* Camera selection options would go here */}
            <div className="px-2 py-1 text-sm text-gray-700">
              Select Camera
            </div>
          </div>
        </div>
      )}
    </div>
  );
}