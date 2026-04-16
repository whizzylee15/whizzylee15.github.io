import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, History, ShoppingBag, Radio, Shield, User, Trophy, Info, Bell, BellOff, LayoutGrid } from 'lucide-react';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  roomsStatus: Record<string, string | null>;
  activeRoomId: string;
  setActiveRoomId: (id: string) => void;
  activeView: 'auction' | 'trading' | 'collection' | 'archives' | 'leaderboard';
  setActiveView: (view: 'auction' | 'trading' | 'collection' | 'archives' | 'leaderboard') => void;
  onlineCount: number;
}

export const SideMenu: React.FC<SideMenuProps> = ({
  isOpen,
  onClose,
  roomsStatus,
  activeRoomId,
  setActiveRoomId,
  activeView,
  setActiveView,
  onlineCount
}) => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (isOpen) {
      const hasSeenTutorial = localStorage.getItem('dreddbotz_tutorial_seen');
      if (!hasSeenTutorial) {
        setShowTutorial(true);
      }
      
      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
    }
  }, [isOpen]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const dismissTutorial = () => {
    localStorage.setItem('dreddbotz_tutorial_seen', 'true');
    setShowTutorial(false);
  };

  const rooms = [
    { id: 'Room 1', key: 'room1' },
    { id: 'Room 2', key: 'room2' },
    { id: 'Room 3', key: 'room3' }
  ];

  const handleNavClick = (view: 'auction' | 'trading' | 'collection' | 'archives' | 'leaderboard') => {
    setActiveView(view);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md"
          />

          {/* Menu Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-[300px] z-[101] bg-[#0a0a2e]/40 backdrop-blur-3xl border-r border-white/[0.12] flex flex-col shadow-[16px_0_64px_rgba(0,0,0,0.6)]"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Shield className="text-white w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tighter uppercase italic text-white leading-none">DreddBotz</h2>
                  <span className="text-[10px] text-purple-400 font-bold uppercase tracking-[0.3em]">Navigation</span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-8 relative">
              
              {/* Tutorial Overlay */}
              <AnimatePresence>
                {showTutorial && (
                  <motion.div
                    initial={{ opacity: 0, y: -20, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -20, height: 0 }}
                    className="overflow-hidden mb-6"
                  >
                    <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
                      <button 
                        onClick={dismissTutorial}
                        className="absolute top-3 right-3 text-white/50 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-2 mb-3">
                        <Info className="w-5 h-5 text-purple-400" />
                        <h3 className="text-white font-black uppercase tracking-widest text-sm">Welcome to DreddBotz!</h3>
                      </div>
                      <p className="text-white/80 text-xs leading-relaxed mb-4">
                        Navigate between different sections to explore the platform:
                      </p>
                      <ul className="space-y-2 text-xs text-white/70 mb-5">
                        <li className="flex items-start gap-2">
                          <Radio className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                          <span><strong className="text-white">Live Auction:</strong> Bid on active Pokémon in real-time.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <History className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                          <span><strong className="text-white">Archives:</strong> View past auctions and winning bids.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ShoppingBag className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                          <span><strong className="text-white">Trading Floor:</strong> Browse the user marketplace.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <User className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                          <span><strong className="text-white">Collection:</strong> See the Pokémon you've won.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Trophy className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                          <span><strong className="text-white">Hall of Fame:</strong> Check out the top trainers.</span>
                        </li>
                      </ul>
                      <button 
                        onClick={dismissTutorial}
                        className="w-full bg-white text-black font-black uppercase tracking-widest text-xs py-2.5 rounded-xl hover:bg-gray-200 transition-colors"
                      >
                        Got it, let's go!
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main Links */}
              <div className="space-y-2">
                <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4">Main Navigation</h3>
                
                <button
                  onClick={() => handleNavClick('auction')}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group border ${
                    activeView === 'auction' ? 'bg-purple-600/20 border-purple-500/50' : 'hover:bg-white/5 border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    activeView === 'auction' ? 'bg-purple-500' : 'bg-purple-500/10 group-hover:bg-purple-500/20'
                  }`}>
                    <Radio className={`w-5 h-5 ${activeView === 'auction' ? 'text-white' : 'text-purple-400'}`} />
                  </div>
                  <div className="text-left">
                    <div className={`text-sm font-bold ${activeView === 'auction' ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>Live Auction</div>
                    <div className="text-[10px] text-white/20 font-medium">Real-time bidding</div>
                  </div>
                </button>

                <button
                  onClick={() => handleNavClick('archives')}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group border ${
                    activeView === 'archives' ? 'bg-purple-600/20 border-purple-500/50' : 'hover:bg-white/5 border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    activeView === 'archives' ? 'bg-purple-500' : 'bg-purple-500/10 group-hover:bg-purple-500/20'
                  }`}>
                    <History className={`w-5 h-5 ${activeView === 'archives' ? 'text-white' : 'text-purple-400'}`} />
                  </div>
                  <div className="text-left">
                    <div className={`text-sm font-bold ${activeView === 'archives' ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>Auction Archives</div>
                    <div className="text-[10px] text-white/20 font-medium">Past sales & history</div>
                  </div>
                </button>

                <button
                  onClick={() => handleNavClick('trading')}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group border ${
                    activeView === 'trading' ? 'bg-blue-600/20 border-blue-500/50' : 'hover:bg-white/5 border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    activeView === 'trading' ? 'bg-blue-500' : 'bg-blue-500/10 group-hover:bg-blue-500/20'
                  }`}>
                    <ShoppingBag className={`w-5 h-5 ${activeView === 'trading' ? 'text-white' : 'text-blue-400'}`} />
                  </div>
                  <div className="text-left">
                    <div className={`text-sm font-bold ${activeView === 'trading' ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>Trading Floor</div>
                    <div className="text-[10px] text-white/20 font-medium">User marketplace</div>
                  </div>
                </button>

                <button
                  onClick={() => handleNavClick('collection')}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group border ${
                    activeView === 'collection' ? 'bg-green-600/20 border-green-500/50' : 'hover:bg-white/5 border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    activeView === 'collection' ? 'bg-green-500' : 'bg-green-500/10 group-hover:bg-green-500/20'
                  }`}>
                    <User className={`w-5 h-5 ${activeView === 'collection' ? 'text-white' : 'text-green-400'}`} />
                  </div>
                  <div className="text-left">
                    <div className={`text-sm font-bold ${activeView === 'collection' ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>Trainer's Collection</div>
                    <div className="text-[10px] text-white/20 font-medium">Your won Pokémon</div>
                  </div>
                </button>

                <button
                  onClick={() => handleNavClick('leaderboard')}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group border ${
                    activeView === 'leaderboard' ? 'bg-yellow-600/20 border-yellow-500/50' : 'hover:bg-white/5 border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    activeView === 'leaderboard' ? 'bg-yellow-500' : 'bg-yellow-500/10 group-hover:bg-yellow-500/20'
                  }`}>
                    <Trophy className={`w-5 h-5 ${activeView === 'leaderboard' ? 'text-white' : 'text-yellow-400'}`} />
                  </div>
                  <div className="text-left">
                    <div className={`text-sm font-bold ${activeView === 'leaderboard' ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>Hall of Fame</div>
                    <div className="text-[10px] text-white/20 font-medium">Top trainers</div>
                  </div>
                </button>
              </div>

              {/* Rooms */}
              <div className="space-y-2">
                <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4">Active Rooms</h3>
                <div className="grid gap-2">
                  {rooms.map((room) => {
                    const pokeName = roomsStatus[room.key];
                    const isActive = activeRoomId === room.id;
                    
                    return (
                      <button
                        key={room.id}
                        onClick={() => {
                          setActiveRoomId(room.id);
                          onClose();
                        }}
                        className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group border ${
                          isActive 
                            ? 'bg-purple-600/20 border-purple-500/50' 
                            : 'hover:bg-white/5 border-transparent'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                          isActive ? 'bg-purple-500' : 'bg-white/5 group-hover:bg-white/10'
                        }`}>
                          <Radio className={`w-5 h-5 ${isActive ? 'text-white' : 'text-white/40'}`} />
                        </div>
                        <div className="text-left flex-1">
                          <div className={`text-sm font-bold ${isActive ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>
                            {pokeName || room.id}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${pokeName ? 'bg-green-500 animate-pulse' : 'bg-white/10'}`} />
                            <div className="text-[10px] text-white/20 font-medium">
                              {pokeName ? 'Auction Live' : 'Waiting...'}
                            </div>
                          </div>
                        </div>
                        {isActive && (
                          <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Active</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 glass-modal space-y-4">
              {/* Notification Toggle */}
              {'Notification' in window && (
                <button
                  onClick={requestNotificationPermission}
                  disabled={notificationPermission === 'denied'}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                    notificationPermission === 'granted' 
                      ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                      : notificationPermission === 'denied'
                        ? 'bg-red-500/10 border-red-500/30 text-red-400 opacity-50 cursor-not-allowed'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {notificationPermission === 'granted' ? (
                      <Bell className="w-4 h-4" />
                    ) : (
                      <BellOff className="w-4 h-4" />
                    )}
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {notificationPermission === 'granted' ? 'Push Enabled' : notificationPermission === 'denied' ? 'Push Blocked' : 'Enable Push'}
                    </span>
                  </div>
                  {notificationPermission === 'default' && (
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  )}
                </button>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 opacity-40">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                    DreddBotz v2.5
                  </div>
                </div>
                
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-green-400">
                    {onlineCount} Online
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
