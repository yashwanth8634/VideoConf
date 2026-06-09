import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useRoom } from '@livekit/react';
import { Message } from '@/components/ui/message'; // We'll create this later
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ChatBoxProps {
  // We can pass meetingId if needed, but we'll get it from the room
}

export default function ChatBox() {
  const { room } = useRoom();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch messages when room is available
  useEffect(() => {
    if (!room) return;
    const loadMessages = async () => {
      // We would fetch messages from our backend via Supabase or directly from the database
      // For now, we'll simulate by setting up a real-time subscription
      setLoading(true);
      try {
        // In a real app, we would have an endpoint to get messages for a meeting
        // We'll use a placeholder for now
        // We can also subscribe to real-time updates
        // For simplicity, we'll just set an empty array and rely on real-time updates
        setMessages([]);
      } catch (err) {
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to load messages',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [room, toast]);

  // Listen for new messages via Supabase real-time (if we set it up)
  // For now, we'll just use a placeholder

  const sendMessage = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      // In a real app, we would send the message to our backend
      // For now, we'll just clear the input and simulate
      setInput('');
      // We would also update the messages state via real-time subscription
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-white border-l border-gray-200">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
        <h3 className="text-lg font-medium">Chat</h3>
        <Button variant="outline" size="sm" onClick={() => {}}>
          Settings
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Loading messages...
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
          </>
        )}
      </div>
      <div className="flex items-center px-4 py-2 border-t border-gray-200 bg-gray-50">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              sendMessage();
            }
          }}
          className="flex-1"
        />
        <Button
          onClick={sendMessage}
          disabled={loading}
          className="ml-2"
        >
          {loading ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}