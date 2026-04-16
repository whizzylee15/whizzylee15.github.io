import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, AlertCircle, Bot } from 'lucide-react';

interface BiddingSectionProps {
  currentPrice: number | string;
  winner: string;
  winnerUid?: string;
  userId?: string;
  bidAmount: string;
  setBidAmount: (val: string) => void;
  onPlaceBid: () => void;
  isBidding: boolean;
  error?: string | null;
  isFinalCountdown?: boolean;
}

export const BiddingSection: React.FC<BiddingSectionProps> = ({
  currentPrice,
  winner,
  winnerUid,
  userId,
  bidAmount,
  setBidAmount,
  onPlaceBid,
  isBidding,
  error,
  isFinalCountdown
}) => {
  const [shake, setShake] = useState(false);
  const [isAutoBidEnabled, setIsAutoBidEnabled] = useState(false);
  const [maxAutoBid, setMaxAutoBid] = useState('');

  useEffect(() => {
    if (error) {
      setShake(true);
      const timer = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const isWinning = userId && winnerUid === userId;

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 mb-8 relative overflow-hidden">
      {/* Background Glow for Winning State */}
      <AnimatePresence>
        {isWinning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-green-500/5 pointer-events-none z-0"
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col items-center text-center mb-6 sm:mb-8 relative z-10">
        <div className="flex flex-col items-center gap-1 mb-2">
          <span className="text-white/40 text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em]">Current Highest Bid</span>
          <AnimatePresence mode="wait">
            <motion.div
              key={winner}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-1.5"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isWinning ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-white/20'}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${isWinning ? 'text-green-400' : 'text-white/40'}`}>
                {isWinning ? 'You are leading' : `Leader: ${winner || 'None'}`}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="text-4xl sm:text-5xl font-black text-yellow-500 drop-shadow-[0_0_20px_rgba(234,179,8,0.4)] italic tracking-tighter h-[1.2em] flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPrice}
              initial={{ y: 30, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -30, opacity: 0, scale: 0.8 }}
              transition={{ 
                duration: 0.4, 
                ease: [0.23, 1, 0.32, 1],
                scale: { type: "spring", stiffness: 300, damping: 15 }
              }}
              className="flex items-center"
            >
              <span className="text-2xl sm:text-3xl mr-1">🪙</span>{(Number(currentPrice) || 0).toLocaleString()}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-2 text-[10px] sm:text-xs font-bold text-white/20 uppercase tracking-widest">
          Min. Next Bid: <span className="text-white/40">🪙{( (Number(currentPrice) || 0) + 1000000 ).toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6">
        <motion.div 
          className="relative"
          animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Enter Bid Amount"
            value={bidAmount}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setBidAmount(val);
            }}
            className={`w-full bg-black/40 border ${error ? 'border-fuchsia-500/80 focus:border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.3)]' : 'border-white/10 focus:border-purple-500/50'} rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-white placeholder:text-white/20 focus:outline-none transition-all font-bold text-center text-xl sm:text-2xl`}
          />
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden flex justify-center"
              >
                <div className="flex items-center gap-1.5 text-fuchsia-100 bg-fuchsia-900/90 border border-fuchsia-500/50 px-4 py-2 rounded-xl text-xs sm:text-sm font-black shadow-[0_0_15px_rgba(217,70,239,0.6)] w-full justify-center">
                  <AlertCircle className="w-4 h-4 text-fuchsia-300 shrink-0" />
                  <span className="truncate">{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Auto-Bid Toggle */}
      <div className="mb-6 glass-modal rounded-2xl p-4 border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bot className={`w-4 h-4 ${isAutoBidEnabled ? 'text-purple-400' : 'text-white/40'}`} />
            <span className="text-xs font-bold uppercase tracking-widest text-white/80">Proxy Auto-Bidder</span>
          </div>
          <button
            onClick={() => setIsAutoBidEnabled(!isAutoBidEnabled)}
            className={`w-10 h-5 rounded-full relative transition-colors ${isAutoBidEnabled ? 'bg-purple-600' : 'bg-white/10'}`}
          >
            <motion.div
              animate={{ x: isAutoBidEnabled ? 20 : 2 }}
              className="w-4 h-4 bg-white rounded-full absolute top-0.5"
            />
          </button>
        </div>
        <AnimatePresence>
          {isAutoBidEnabled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Maximum Auto-Bid Amount"
                value={maxAutoBid}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setMaxAutoBid(val);
                }}
                className="w-full glass-input rounded-xl px-4 py-2 text-white placeholder:text-white/20 transition-all font-bold text-center text-sm mt-2"
              />
              <p className="text-[9px] text-white/40 text-center mt-2 uppercase tracking-widest">
                System will automatically bid up to this amount
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={() => {
          if (isAutoBidEnabled && maxAutoBid) {
            // In a real app, this would send the max auto-bid to the server
            onPlaceBid();
          } else {
            onPlaceBid();
          }
        }}
        disabled={isBidding}
        className={`w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-purple-800 disabled:to-blue-800 disabled:cursor-not-allowed text-white font-black py-4 sm:py-5 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-purple-500/20 uppercase tracking-widest text-base sm:text-lg flex items-center justify-center gap-2 ${isFinalCountdown ? 'animate-pulse shadow-[0_0_20px_rgba(168,85,247,0.6)] border-2 border-purple-400' : ''}`}
      >
        {isBidding ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : isAutoBidEnabled ? (
          <>
            <Bot className="w-5 h-5" />
            Set Auto-Bid
          </>
        ) : (
          'Place Your Bid'
        )}
      </button>
    </div>
  );
};
