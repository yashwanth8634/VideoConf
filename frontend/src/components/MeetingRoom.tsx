import { useEffect, useState, useCallback } from 'react';
import { useRoom } from '@livekit/react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { CameraToggle } from './CameraToggle';
import { MicrophoneToggle } from './MicrophoneToggle';
import { ScreenShareToggle } from './ScreenShareToggle';
import { LeaveButton } from './LeaveButton';
import { ChatBox } from './ChatBox';
import { ParticipantsPanel } from './ParticipantsPanel';
import { RecordingControls } from './RecordingControls';
import { FocusIndicator } from './FocusIndicator';
import { SettingsPanel } from './SettingsPanel';
import { RoomName } from './RoomName';
import { AudioVisualizer } from './AudioVisualizer';

interface MeetingRoomProps {
  meeting: {
    id: string;
    title: string;
    hostId: string;
    // ... other meeting fields
  };
  userId: string;
}

export default function MeetingRoom({ meeting, userId }: MeetingRoomProps) {
  const { room, join, leave, localParticipant, remoteParticipants, connectionQuality, connectionState } = useRoom();
  const [isJoinEnabled, setIsJoinEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch token from backend to join the LiveKit room
  const fetchToken = useCallback(async () => {
    if (!meeting.id) return null;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('meetings')
        .select('meetingToken')
        .eq('id', meeting.id)
        .single();

      if (error) throw error;
      // In a real app, we would have an endpoint that returns a LiveKit token
      // For now, we'll use the meetingToken as a placeholder (not secure)
      // We should have an endpoint like /api/meetings/:id/join that returns a LiveKit token
      const { data: joinData, error: joinError } = await supabase
        .from('meetings_join') // This is a hypothetical RPC or we can create a custom endpoint
        .eq('meeting_id', meeting.id)
        .single();

      // For simplicity, we'll assume we have a function to get a LiveKit token
      // We'll create a placeholder token for now. In production, we must get this from the backend.
      const token = `placeholder-livekit-token-${meeting.id}-${userId}`; // NOT SECURE, FOR DEMO ONLY
      return token;
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to get meeting token',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [meeting.id, toast, userId]);

  // Join room when token is available
  useEffect(() => {
    if (!isJoinEnabled || loading) return;

    const joinRoom = async () => {
      const token = await fetchToken();
      if (token) {
        try {
          await join(token, {
            name: meeting.title,
            // We can set additional metadata here
          });
        } catch (err) {
          toast({
            title: 'Error',
            description: err instanceof Error ? err.message : 'Failed to join room',
            variant: 'destructive',
          });
        }
      }
    };

    joinRoom();
  }, [fetchToken, isJoinEnabled, join, loading, meeting.title, toast]);

  // Leave room when leaving the page or explicitly leaving
  useEffect(() => {
    return () => {
      leave();
    };
  }, [leave]);

  // Handle connection state changes
  useEffect(() => {
    if (connectionState === 'disconnected') {
      toast({
        title: 'Connection Lost',
        description: 'You have been disconnected from the meeting. Attempting to reconnect...',
        variant: 'warning',
      });
    }
    if (connectionState === 'connected') {
      toast({
        title: 'Connected',
        description: 'Successfully connected to the meeting.',
      });
    }
  }, [connectionState, toast]);

  if (loading || !isJoinEnabled) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Joining meeting...</h2>
          {loading && <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 flex flex-col bg-white">
        <RoomName roomName={meeting.title} />
        <ParticipantsPanel />
        <ChatBox />
        <SettingsPanel />
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 overflow-hidden relative">
          {/* Local video preview */}
          {localParticipant && (
            <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 bg-white bg-opacity-75 rounded-lg p-2 shadow-lg">
              <AudioVisualizer track={localParticipant.trackPublications.get('camera')?.track} />
              <video
                autoPlay
                muted
                playsInline
                className="h-24 w-24 rounded-lg"
                srcObject={localParticipant.trackPublications.get('camera')?.track as MediaStream | null}
              />
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">{user?.name || 'You'}</span>
                <span className="text-xs text-gray-500">(Local)</span>
              </div>
            </div>
          )}

          {/* Remote videos */}
          <div className="flex-1 overflow-hidden">
            <div className="grid gap-2 p-4">
              {remoteParticipants.map((participant) => (
                <div key={participant.identity} className="relative bg-gray-200 rounded-lg overflow-hidden">
                  <AudioVisualizer
                    track={participant.trackPublications.get('camera')?.track}
                    className="absolute inset-0 pointer-events-none"
                  />
                  {participant.trackPublications.get('camera')?.track ? (
                    <video
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                      srcObject={participant.trackPublications.get('camera')?.track as MediaStream | null}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-300 text-gray-500">
                      {participant.identity}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <MicrophoneToggle />
            <CameraToggle />
            <ScreenShareToggle />
            <RecordingControls meetingId={meeting.id} />
          </div>
          <div className="flex items-center space-x-2">
            <FocusIndicator meetingId={meeting.id} userId={userId} />
            <LeaveButton onLeave={() => leave()} />
          </div>
        </div>
      </main>
    </div>
  );
}