import { useRoom } from '@livekit/react';
import { MicIcon, MicOffIcon } from 'lucide-react';

export function MicrophoneToggle() {
  const { localParticipant } = useRoom();
  const [isOpen, setIsOpen] = useState(false);

  const isMicrophoneEnabled = localParticipant?.trackPublications.has('microphone') ?? false;

  const handleClick = async () => {
    try {
      if (isMicrophoneEnabled) {
        await localParticipant?.disableMicrophone();
      } else {
        await localParticipant?.enableMicrophone();
      }
    } catch (err) {
      console.error('Failed to toggle microphone:', err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="p-2 rounded-full bg-gray-200 bg-opacity-50 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label={isMicrophoneEnabled ? 'Disable microphone' : 'Enable microphone'}
      >
        {isMicrophoneEnabled ? (
          <MicIcon className="h-4 w-4 text-gray-900" />
        ) : (
          <MicOffIcon className="h-4 w-4 text-gray-900" />
        )}
      </button>
      {/* Dropdown for microphone selection (placeholder) */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
          <div className="py-1">
            <div className="px-2 py-1 text-sm text-gray-700">
              Select Microphone
            </div>
          </div>
        </div>
      )}
    </div>
  );
}