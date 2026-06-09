import { useRoom } from '@livekit/react';
import { XIcon } from 'lucide-react';

interface LeaveButtonProps {
  onLeave: () => void;
}

export function LeaveButton({ onLeave }: LeaveButtonProps) {
  const { connectionState } = useRoom();

  const handleLeave = () => {
    // In a real app, we might want to confirm before leaving
    if (window.confirm('Are you sure you want to leave the meeting?')) {
      onLeave();
    }
  };

  return (
    <button
      onClick={handleLeave}
      className="p-2 rounded-full bg-red-500 bg-opacity-50 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
      aria-label="Leave meeting"
      disabled={connectionState === 'disconnecting'}
    >
      <XIcon className="h-4 w-4 text-white" />
    </button>
  );
}