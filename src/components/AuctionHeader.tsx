import React from 'react';
import { Shield, LogIn, LogOut, Loader2, Volume2, VolumeX, MessageCircle } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface UserProfile {
  uid: string;
  displayName: string;
  avatarUrl: string;
  winCount: number;
  lossCount: number;
  whatsappName: string;
}

interface AuctionHeaderProps {
  user: User | null;
  profile: UserProfile | null;
  isAuthLoading: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onOpenProfile: () => void;
  onOpenMenu: () => void;
  activeRoomId: string;
  setActiveRoomId: (val: string) => void;
  isSoundEnabled: boolean;
  setIsSoundEnabled: (val: boolean) => void;
  auctionStatus: string;
  onlineCount: number;
}

export const AuctionHeader: React.FC<AuctionHeaderProps> = ({
  user,
  profile,
  isAuthLoading,
  onLogin,
  onLogout,
  onOpenProfile,
  onOpenMenu,
  activeRoomId,
  setActiveRoomId,
  isSoundEnabled,
  setIsSoundEnabled,
  auctionStatus,
  onlineCount
}) => {
  const rooms = ['Room 1', 'Room 2', 'Room 3'];
  return (
    <header className="fixed top-0 left-0 right-0 z-[60] bg-[#0a0a2e]/40 backdrop-blur-3xl border-b border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={onOpenMenu}
              className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 hover:scale-110 transition-transform active:scale-95 group"
            >
              <Shield className="text-white w-4 h-4 sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tighter uppercase italic leading-none text-white">DreddBotz</h1>
                <span className="md:hidden px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-purple-500/20 text-purple-400">
                  {activeRoomId}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 uppercase">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {onlineCount} Online
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[8px] sm:text-[10px] text-purple-400 font-bold uppercase tracking-[0.3em]">Auctions</span>
                <span className={`md:hidden px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                  auctionStatus === 'Live' ? 'bg-green-500/20 text-green-400' :
                  auctionStatus === 'Sold' ? 'bg-blue-500/20 text-blue-400' :
                  auctionStatus === 'Ended' ? 'bg-red-500/20 text-red-400' :
                  'bg-white/10 text-white/60'
                }`}>
                  {auctionStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Room Switcher */}
          <div className="hidden md:flex items-center glass-input rounded-full p-1 gap-1">
            {rooms.map((room) => (
              <button
                key={room}
                onClick={() => setActiveRoomId(room)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  activeRoomId === room 
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                {room}
                {activeRoomId === room && (
                  <span className={`px-1.5 py-0.5 rounded text-[8px] ${
                    auctionStatus === 'Live' ? 'bg-green-500/20 text-green-400' :
                    auctionStatus === 'Sold' ? 'bg-blue-500/20 text-blue-400' :
                    auctionStatus === 'Ended' ? 'bg-red-500/20 text-red-400' :
                    'bg-white/10 text-white/60'
                  }`}>
                    {auctionStatus}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* WhatsApp Community Link */}
          <a 
            href="https://chat.whatsapp.com/BAfBWraYjOHCYTD1Mlpoab?mode=gi_t"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-[10px] font-black uppercase tracking-widest hover:bg-green-500/20 transition-all group"
          >
            <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Join Community
          </a>

          {/* Sound Toggle */}
          <button 
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className={`p-2 rounded-full border transition-all ${
              isSoundEnabled ? 'border-purple-500/50 text-purple-400 bg-purple-500/10' : 'border-white/10 text-white/20 hover:text-white/40'
            }`}
          >
            {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {isAuthLoading ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white/20" />
          ) : user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                onClick={onOpenProfile}
                className="flex items-center gap-2 sm:gap-3 glass-card hover:bg-white/10 rounded-full pl-1.5 pr-3 sm:pl-2 sm:pr-4 py-1 sm:py-1.5 transition-all group"
              >
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-purple-500/50">
                  {profile?.avatarUrl ? (
                    <img 
                      src={profile.avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.user_metadata?.full_name || 'Anonymous'}`;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[10px] sm:text-xs font-bold text-white">
                      {(user.user_metadata?.full_name || 'Anonymous').substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start hidden sm:flex">
                  <span className="text-xs font-bold text-white/80 group-hover:text-white transition-colors">
                    {profile?.displayName || user.user_metadata?.full_name || 'Anonymous'}
                  </span>
                  <span className="text-[8px] text-purple-400 font-black uppercase tracking-widest">View Profile</span>
                </div>
              </button>
              <button 
                onClick={onLogout}
                className="p-1.5 sm:p-2 text-white/40 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={onLogin}
              className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-[10px] sm:text-xs font-black px-4 sm:px-6 py-2 sm:py-2.5 rounded-full transition-all shadow-lg shadow-purple-500/20 uppercase tracking-widest"
            >
              <LogIn className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Login with Google</span><span className="sm:hidden">Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
