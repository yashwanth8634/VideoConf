import { useRoom } from '@livekit/react';
import { UserIcon } from 'lucide-react';

export function ParticipantsPanel() {
  const { room, localParticipant } = useRoom();

  // Get all participants (local and remote)
  const participants = room ? [localParticipant, ...room.remoteParticipants] : [];
  // Filter out undefined localParticipant (if not connected)
  const filteredParticipants = participants.filter((p): p is NonNullable<typeof p> => p !== undefined);

  return (
    <div className="flex flex-col flex-1 bg-white border-l border-gray-200">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
        <h3 className="text-lg font-medium">Participants</h3>
        <div className="text-sm text-gray-500">
          {filteredParticipants.length} connected
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredParticipants.map((participant) => (
          <div key={participant.identity} className="flex items-center space-x-2 p-2 rounded-lg bg-gray-50">
            <UserIcon className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <div className="font-medium text-gray-900">{participant.identity}</div>
              {participant === localParticipant && (
                <span className="ml-2 text-xs text-indigo-500">(You)</span>
              )}
            </div>
            {/* Connection indicator */}
            <div className="w-2 h-2 rounded-full">
              {participant.connectionQuality === 'excellent' && <div className="bg-green-500" />}
              {participant.connectionQuality === 'good' && <div className="bg-yellow-400" />}
              {participant.connectionQuality === 'poor' && <div className="bg-red-500" />}
              {participant.connectionQuality === 'unknown' && <div className="bg-gray-400" />}
            </div>
          </div>
        ))}
        {filteredParticipants.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No other participants
          </div>
        )}
      </div>
    </div>
  );
}