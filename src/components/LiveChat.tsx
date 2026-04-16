import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, User } from 'lucide-react';
import { supabase } from '../supabase';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  timestamp: number;
}

interface LiveChatProps {
  isAuctionActive: boolean;
  user: any;
  activeRoomId: string;
  socket: any;
}

export const LiveChat: React.FC<LiveChatProps> = ({ isAuctionActive, user, activeRoomId, socket }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const roomPath = activeRoomId.toLowerCase().replace(' ', '');
    
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room', roomPath)
        .order('timestamp', { ascending: true })
        .limit(50);
      
      if (data) setMessages(data);
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat_${roomPath}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room=eq.${roomPath}` }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoomId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      const roomPath = activeRoomId.toLowerCase().replace(' ', '');
      
      const { error } = await supabase.from('chat_messages').insert([{
        room: roomPath,
        userId: user.id,
        userName: user.user_metadata?.full_name || 'Anonymous',
        userAvatar: user.user_metadata?.avatar_url || '',
        text: newMessage.trim(),
        timestamp: new Date().getTime(),
      }]);
      
      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!isAuctionActive) return null;

  return (
    <div className="mt-8 glass-card rounded-3xl overflow-hidden flex flex-col h-[400px]">
      <div 
        className="p-4 border-b border-white/10 flex items-center justify-between glass-modal cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-purple-400" />
          <h3 className="font-black uppercase tracking-widest text-sm text-white">Live Bidder Chat</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">Live</span>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/20 italic text-sm">
                  <p>No messages yet. Be the first to speak!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex items-start gap-3 ${msg.userId === user?.id ? 'flex-row-reverse' : ''}`}>
                    {msg.userAvatar ? (
                      <img src={msg.userAvatar} alt={msg.userName} className="w-8 h-8 rounded-full border border-white/10" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                        <User className="w-4 h-4 text-white/40" />
                      </div>
                    )}
                    <div className={`flex flex-col ${msg.userId === user?.id ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] font-black text-white/40 mb-1 uppercase tracking-tighter">{msg.userName}</span>
                      <div className={`px-4 py-2 rounded-2xl text-sm ${
                        msg.userId === user?.id 
                          ? 'bg-purple-600 text-white rounded-tr-none' 
                          : 'bg-white/10 text-white/90 rounded-tl-none border border-white/5'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 glass-modal border-t border-white/10 flex gap-2">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={user ? "Type a message..." : "Log in to chat"}
                disabled={!user}
                className="flex-1 glass-input rounded-xl px-4 py-2 text-sm text-white disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={!user || !newMessage.trim()}
                className="bg-purple-600 hover:bg-purple-500 disabled:bg-white/10 disabled:text-white/20 text-white p-2 rounded-xl transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
