import React from 'react';
import { Trophy, Medal, Crown, TrendingUp } from 'lucide-react';
import { SafeImage } from './SafeImage';

interface UserProfile {
  uid: string;
  displayName: string;
  avatarUrl: string;
  winCount: number;
  lossCount: number;
  whatsappName: string;
}

interface LeaderboardProps {
  leaderboard: UserProfile[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ leaderboard }) => {
  const calculateWinRate = (wins: number, losses: number) => {
    const total = wins + losses;
    if (total === 0) return 0;
    return Math.round((wins / total) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
            <Trophy className="w-10 h-10 text-yellow-400" /> Hall of Fame
          </h2>
          <p className="text-white/40 text-sm font-bold uppercase tracking-[0.2em] mt-2">
            The Elite Trainers of DreddBotz
          </p>
        </div>
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Live Updates</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {leaderboard.length > 0 ? (
          leaderboard.map((entry, index) => {
            const winRate = calculateWinRate(entry.winCount || 0, entry.lossCount || 0);
            const isTopThree = index < 3;
            
            return (
              <div 
                key={entry.uid}
                className={`flex items-center justify-between p-1 rounded-[2rem] transition-all relative group overflow-hidden ${
                  index === 0 
                    ? 'bg-gradient-to-r from-yellow-500/20 to-transparent border border-yellow-500/30' 
                    : index === 1
                    ? 'bg-gradient-to-r from-gray-400/10 to-transparent border border-white/10'
                    : index === 2
                    ? 'bg-gradient-to-r from-orange-600/10 to-transparent border border-orange-500/20'
                    : 'bg-white/5 border border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-6 p-3 flex-1">
                  {/* Rank & Avatar */}
                  <div className="relative flex items-center gap-4">
                    <div className="w-12 h-12 flex items-center justify-center relative">
                      {index === 0 ? (
                        <Crown className="w-8 h-8 text-yellow-400 absolute -top-4 -rotate-12 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                      ) : index === 1 ? (
                        <Medal className="w-6 h-6 text-gray-300 absolute -top-3 -rotate-12" />
                      ) : index === 2 ? (
                        <Medal className="w-6 h-6 text-orange-400 absolute -top-3 -rotate-12" />
                      ) : null}
                      <span className={`text-2xl font-black italic tracking-tighter ${
                        index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-white/20'
                      }`}>
                        {index + 1}
                      </span>
                    </div>
                    
                    <div className={`w-14 h-14 rounded-2xl overflow-hidden border-2 transition-transform group-hover:scale-105 ${
                      index === 0 ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : 'border-white/10'
                    }`}>
                      {entry.avatarUrl ? (
                        <SafeImage 
                          src={entry.avatarUrl} 
                          alt={entry.displayName} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center text-lg font-black text-white/20 italic">
                          {entry.displayName.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-lg font-black tracking-tight ${index === 0 ? 'text-white' : 'text-white/90'}`}>
                        {entry.displayName}
                      </h4>
                      {index === 0 && (
                        <span className="bg-yellow-500 text-black text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Champion</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                        {entry.whatsappName || 'Elite Trainer'}
                      </span>
                      <div className="w-1 h-1 rounded-full bg-white/10" />
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-green-500/50" />
                        <span className="text-[10px] text-green-500/60 font-black uppercase tracking-widest">{winRate}% Win Rate</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-8 px-8">
                  <div className="text-center">
                    <div className={`text-2xl font-black italic tracking-tighter leading-none ${
                      index === 0 ? 'text-yellow-400' : 'text-white'
                    }`}>
                      {entry.winCount || 0}
                    </div>
                    <div className="text-[8px] text-white/20 font-black uppercase tracking-[0.2em] mt-1">Total Wins</div>
                  </div>
                  
                  <div className="hidden md:block w-px h-8 bg-white/5" />
                  
                  <div className="hidden md:block text-center opacity-40">
                    <div className="text-xl font-black italic tracking-tighter leading-none text-white">
                      {entry.lossCount || 0}
                    </div>
                    <div className="text-[8px] text-white/20 font-black uppercase tracking-[0.2em] mt-1">Losses</div>
                  </div>
                </div>

                {/* Background Decoration */}
                {index === 0 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent pointer-events-none" />
                )}
              </div>
            );
          })
        ) : (
          <div className="glass-card rounded-[2rem] p-12 text-center border border-white/5">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-white/10" />
            </div>
            <h3 className="text-white font-black uppercase tracking-widest text-sm mb-2">No Champions Yet</h3>
            <p className="text-white/40 text-xs max-w-xs mx-auto">
              The arena is quiet. Be the first to claim your spot in the Hall of Fame.
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 p-6 glass-card rounded-[2rem] border border-white/5 bg-gradient-to-br from-purple-600/5 to-blue-600/5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0">
            <Medal className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h4 className="text-white font-black uppercase tracking-widest text-xs mb-1">How to Rank Up?</h4>
            <p className="text-white/40 text-[10px] leading-relaxed">
              Win counts are updated after every successful auction. The Hall of Fame displays the top 10 trainers with the highest win counts. Keep bidding and winning to secure your place among the elite.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
