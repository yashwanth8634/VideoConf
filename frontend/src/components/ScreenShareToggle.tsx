import { useRoom } from '@livekit/react';
import { MonitorShareIcon, MonitorIcon } from 'lucide-react';

export function ScreenShareToggle() {
  const { localParticipant } = useRoom();
  const [isOpen, setIsOpen] = useState(false);

  // Check if screen share is active
  const isScreenSharing = localParticipant?.trackPublications.has('screen_share') ?? false;

  const handleClick = async () => {
    try {
      if (isScreenSharing) {
        await localParticipant?.disableScreenShare();
      } else {
        await localParticipant?.enableScreenShare();
      }
    } catch (err) {
      console.error('Failed to toggle screen share:', err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="p-2 rounded-full bg-gray-200 bg-opacity-50 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label={isScreenSharing ? 'Disable screen share' : 'Enable screen share'}
      >
        {isScreenSharing ? (
          <MonitorShareIcon className="h-4 w-4 text-gray-900" />
        ) : (
          <MonitorIcon className="h-4 w-4 text-gray-900" />
        )}
      </button>
      {/* Dropdown for screen share sources (placeholder) */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
          <div className="py-1">
            <div className="px-2 py-1 text-sm text-gray-700">
              Select Screen Share Source
            </div>
          </div>
        </div>
      )}
    </div>
  );
}