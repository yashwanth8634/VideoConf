import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { RecordIcon, StopIcon } from 'lucide-react';

interface RecordingControlsProps {
  meetingId: string;
}

export default function RecordingControls({ meetingId }: RecordingControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const startRecording = async () => {
    setLoading(true);
    try {
      // In a real app, we would call our backend endpoint to start recording
      // For now, we'll simulate
      const { data, error } = await supabase
        .from('recordings')
        .insert({
          meeting_id: meetingId,
          started_at: new Date(),
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      setIsRecording(true);
      toast({
        title: 'Recording started',
        description: 'The meeting is now being recorded.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to start recording',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const stopRecording = async () => {
    setLoading(true);
    try {
      // In a real app, we would call our backend endpoint to stop recording
      const { data, error } = await supabase
        .from('recordings')
        .update({
          stopped_at: new Date(),
          status: 'stopped',
        })
        .eq('meeting_id', meetingId)
        .eq('status', 'active')
        .select()
        .single();

      if (error) throw error;
      setIsRecording(false);
      toast({
        title: 'Recording stopped',
        description: 'The meeting recording has been stopped and is ready for download.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to stop recording',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={loading}
        className="p-2 rounded-full bg-gray-200 bg-opacity-50 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording ? (
          <StopIcon className="h-4 w-4 text-red-500" />
        ) : (
          <RecordIcon className="h-4 w-4 text-indigo-500" />
        )}
      </button>
      {/* Recording status indicator */}
      {isRecording && (
        <div className="absolute -top-2 left-2 flex h-3 w-3 items-center justify-center rounded-full bg-red-500">
          <div className="h-1.5 w-1.5 rounded-full bg-white" />
        </div>
      )}
    </div>
  );
}