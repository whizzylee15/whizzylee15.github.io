import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, User, Maximize2, Minimize2, Bell, BellOff, Smile, Pin, ArrowDown } from 'lucide-react';
import { supabase } from '../supabase';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  timestamp: number;
}

const renderMessageText = (text: string, currentUserName?: string) => {
  if (!currentUserName) return text;
  
  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const firstName = currentUserName.split(' ')[0];
  const mentionTerm = `@${currentUserName}`;
  const mentionTermFirst = `@${firstName}`;
  
  const terms = [escapeRegExp(mentionTerm)];
  if (mentionTerm !== mentionTermFirst) {
    terms.push(escapeRegExp(mentionTermFirst));
  }
  
  const regex = new RegExp(`(${terms.join('|')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) => {
    const isMention = terms.some(term => new RegExp(`^${term}$`, 'i').test(escapeRegExp(part)));
    return isMention ? (
      <span key={i} className="bg-fuchsia-500/40 text-fuchsia-100 px-1 py-0.5 rounded-md font-bold shadow-[0_0_10px_rgba(217,70,239,0.3)]">
        {part}
      </span>
    ) : (
      part
    );
  });
};

interface LiveChatProps {
  isAuctionActive: boolean;
  user: any;
  activeRoomId: string;
  socket: any;
  isAdmin?: boolean;
}

export const LiveChat: React.FC<LiveChatProps> = ({ isAuctionActive, user, activeRoomId, socket, isAdmin = false }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isChatMuted, setIsChatMuted] = useState(false);
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [pinnedMessage, setPinnedMessage] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const isChatMutedRef = useRef(isChatMuted);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    isChatMutedRef.current = isChatMuted;
  }, [isChatMuted]);

  const playChatSound = () => {
    if (!isChatMutedRef.current) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.error('Audio play failed:', e));
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (!user) return;
    
    setReactions(prev => ({
      ...prev,
      [messageId]: {
        ...(prev[messageId] || {}),
        [emoji]: ((prev[messageId] || {})[emoji] || 0) + 1
      }
    }));

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'reaction',
        payload: { messageId, emoji }
      });
    }
  };

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room=eq.${roomPath}` }, (payload) => {
        fetchMessages();
        
        if (payload.new && payload.new.userId !== user?.id) {
          playChatSound();
        }
      })
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const { messageId, emoji } = payload;
        setReactions(prev => ({
          ...prev,
          [messageId]: {
            ...(prev[messageId] || {}),
            [emoji]: ((prev[messageId] || {})[emoji] || 0) + 1
          }
        }));
      })
      .on('broadcast', { event: 'pin_message' }, ({ payload }) => {
        if (payload.text === null || typeof payload.text === 'string') {
          setPinnedMessage(payload.text);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoomId]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    
    // A small threshold of 10px to account for decimal scaling/zooming
    if (scrollHeight - scrollTop - clientHeight < 10) {
      setIsAtBottom(true);
    } else {
      setIsAtBottom(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    if (scrollRef.current && isAtBottom) {
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
    <div className={`mt-8 glass-card overflow-hidden flex flex-col transition-all duration-300 ${isFullScreen ? 'fixed inset-0 z-[100] mt-0 rounded-none bg-black/95 backdrop-blur-3xl' : 'h-[400px] rounded-3xl'}`}>
      <div 
        className="p-4 border-b border-white/10 flex items-center justify-between glass-modal cursor-pointer"
        onClick={() => !isFullScreen && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-purple-400" />
          <h3 className="font-black uppercase tracking-widest text-sm text-white">Live Bidder Chat</h3>
        </div>
        <div className="flex items-center gap-4">
          {isOpen && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsChatMuted(!isChatMuted);
                }}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white"
                title={isChatMuted ? "Unmute chat" : "Mute chat notifications"}
              >
                {isChatMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFullScreen(!isFullScreen);
                }}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white"
                title={isFullScreen ? "Exit full screen" : "Full screen"}
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </>
          )}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">Live</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="flex-1 flex flex-col overflow-hidden relative"
          >
            {pinnedMessage && (
              <div className="bg-purple-900/50 backdrop-blur border-b border-purple-500/30 p-2 px-4 shadow-lg flex justify-between items-start text-xs z-10 shrink-0">
                <div className="flex items-start gap-2 max-w-[90%]">
                  <Pin className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
                  <p className="text-purple-100 font-medium break-words leading-tight">
                    {pinnedMessage}
                  </p>
                </div>
                {isAdmin && (
                  <button onClick={() => handlePinMessage('')} className="text-white/40 hover:text-white shrink-0 ml-2">
                    &times;
                  </button>
                )}
              </div>
            )}
            
            <div 
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/20 italic text-sm">
                  <p>No messages yet. Be the first to speak!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const currentUserName = user?.user_metadata?.full_name;
                  let isMentioned = false;
                  
                  if (currentUserName && msg.userId !== user?.id) {
                    const firstName = currentUserName.split(' ')[0];
                    const mentionTerm = `@${currentUserName}`.toLowerCase();
                    const mentionTermFirst = `@${firstName}`.toLowerCase();
                    const msgLower = msg.text.toLowerCase();
                    
                    if (msgLower.includes(mentionTerm) || msgLower.includes(mentionTermFirst)) {
                      isMentioned = true;
                    }
                  }

                  return (
                    <div key={msg.id} className={`flex items-start gap-3 ${msg.userId === user?.id ? 'flex-row-reverse' : ''}`}>
                      {msg.userAvatar ? (
                        <img src={msg.userAvatar} alt={msg.userName} className="w-8 h-8 rounded-full border border-white/10" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                          <User className="w-4 h-4 text-white/40" />
                        </div>
                      )}
                      <div className={`flex flex-col ${msg.userId === user?.id ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] font-black text-white/40 mb-1 uppercase tracking-tighter">
                          {msg.userName}
                          <span className="ml-2 font-normal opacity-70 normal-case">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                        <div className={`px-4 py-2 rounded-2xl text-sm relative group ${
                          msg.userId === user?.id 
                            ? 'bg-purple-600 text-white rounded-tr-none' 
                            : isMentioned 
                              ? 'bg-fuchsia-500/20 text-white border border-fuchsia-400/50 rounded-tl-none shadow-[0_0_15px_rgba(217,70,239,0.1)]'
                              : 'bg-white/10 text-white/90 rounded-tl-none border border-white/5'
                        }`}>
                          {renderMessageText(msg.text, currentUserName)}
                          
                          {/* Reaction Button (hover) */}
                          <div className={`absolute -top-3 ${msg.userId === user?.id ? '-left-3' : '-right-3'} opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 rounded-full flex gap-1 p-1 border border-white/10 shadow-lg z-10`}>
                            {isAdmin && (
                              <button 
                                onClick={() => handlePinMessage(msg.text)}
                                className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded-full text-xs transition-colors text-purple-400"
                                title="Pin message"
                              >
                                <Pin className="w-3 h-3" />
                              </button>
                            )}
                            {['👍', '❤️', '🔥', '😂'].map(emoji => (
                              <button 
                                key={emoji}
                                onClick={() => handleReaction(msg.id, emoji)}
                                className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded-full text-xs transition-colors"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Display Reactions */}
                        {reactions[msg.id] && Object.keys(reactions[msg.id]).length > 0 && (
                          <div className={`flex gap-1 mt-1 ${msg.userId === user?.id ? 'flex-row-reverse' : ''}`}>
                            {Object.entries(reactions[msg.id]).map(([emoji, count]) => (
                              <div key={emoji} className="bg-black/40 border border-white/5 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 backdrop-blur-sm">
                                <span>{emoji}</span>
                                <span className="text-white/60">{count as number}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {!isAtBottom && (
              <div className="absolute bottom-16 left-0 right-0 flex justify-center pointer-events-none z-20">
                <button
                  onClick={scrollToBottom}
                  className="pointer-events-auto flex items-center gap-2 bg-purple-600/90 hover:bg-purple-500 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-purple-900/20 transition-all cursor-pointer border border-purple-400/30"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  JUMP TO LATEST
                </button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="p-4 glass-modal border-t border-white/10 flex gap-2 z-10 shrink-0">
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
