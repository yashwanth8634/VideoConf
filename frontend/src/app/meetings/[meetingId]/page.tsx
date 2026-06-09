import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import MeetingRoom from '@/components/MeetingRoom';
import { useAuth } from '@/context/AuthContext';

export default function MeetingRoomPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch meeting details
  const loadMeeting = useCallback(async () => {
    if (!meetingId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (error) throw error;
      if (!data) {
        throw new Error('Meeting not found');
      }
      setMeeting(data);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load meeting',
        variant: 'destructive',
      });
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [meetingId, router, toast]);

  useEffect(() => {
    loadMeeting();
  }, [loadMeeting]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Loading meeting...</h2>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Meeting not found</h2>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Check if the user is authorized to join this meeting
  // For now, we'll allow if the meeting is public or if the user is the host or invited
  // In a real app, we would check invitations and waiting room status
  const isAuthorized =
    meeting.isPublic ||
    meeting.hostId === user?.id ||
    // TODO: Check if user has an invitation or is already a participant
    true; // For simplicity in this example, we allow join

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Access denied</h2>
          <p className="text-gray-600 mb-4">
            You do not have permission to join this meeting.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MeetingRoom meeting={meeting} userId={user?.id || ''} />
    </div>
  );
}