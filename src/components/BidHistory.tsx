import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, Sparkles } from 'lucide-react';

interface BidEntry {
  id: string;
  bidder: string;
  amount: number;
  timestamp: number;
  avatar?: string;
}

interface BidHistoryProps {
  bidHistory: BidEntry[];
}

export const BidHistory: React.FC<BidHistoryProps> = ({ bidHistory }) => {
  const [highlightedBidId, setHighlightedBidId] = useState<string | null>(null);

  useEffect(() => {
    if (bidHistory.length > 0) {
      const latestBidId = bidHistory[0].id;
      setHighlightedBidId(latestBidId);
      
      const timer = setTimeout(() => {
        setHighlightedBidId(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [bidHistory]);

  return (
    <div className="glass-card rounded-3xl p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-bold uppercase tracking-widest text-sm flex items-center gap-2">
          <History className="w-4 h-4 text-purple-400" /> Recent Bids
        </h3>
        <span className="text-white/20 text-[10px] font-bold uppercase">Live Feed</span>
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {bidHistory.length > 0 ? (
            bidHistory.map((bid, index) => (
              <motion.div
                key={bid.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  backgroundColor: bid.id === highlightedBidId ? 'rgba(168, 85, 247, 0.25)' : index === 0 ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  borderColor: bid.id === highlightedBidId ? 'rgba(168, 85, 247, 0.5)' : index === 0 ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.05)'
                }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ 
                  duration: 0.3, 
                  ease: "easeOut",
                  layout: { duration: 0.3 }
                }}
                className={`flex items-center justify-between p-4 rounded-2xl border relative overflow-hidden group transition-all duration-500 ${bid.id === highlightedBidId ? 'shadow-[0_0_15px_rgba(168,85,247,0.5)] scale-[1.02] z-20' : ''}`}
              >
                {index === 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent pointer-events-none"
                  />
                )}
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white uppercase overflow-hidden border border-white/10 shrink-0">
                    <img 
                      src={bid.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${bid.bidder}`} 
                      alt={bid.bidder} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${bid.bidder}`;
                      }}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white font-bold text-sm flex items-center gap-2">
                      {bid.bidder}
                      {index === 0 && bid.id !== highlightedBidId && (
                        <span className="text-[8px] bg-purple-500 text-white px-1.5 py-0.5 rounded-full font-black animate-pulse">NEW</span>
                      )}
                      <AnimatePresence>
                        {bid.id === highlightedBidId && (
                          <motion.span 
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="text-[10px] bg-yellow-500 text-black px-2 py-0.5 rounded-full font-black flex items-center gap-1 shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                          >
                            <Sparkles className="w-3 h-3" /> JUST NOW
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                    <span className="text-[8px] text-white/30 font-bold uppercase">
                      {new Date(bid.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end relative z-10">
                  <span className="text-yellow-500 font-black text-sm leading-none flex items-center gap-1">
                    <span className="text-xs">🪙</span>{(bid.amount || 0).toLocaleString()}
                  </span>
                  <span className="text-[8px] text-white/20 font-bold uppercase mt-1">Current High</span>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div 
              key="empty-bids"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 border-2 border-dashed border-white/5 rounded-3xl"
            >
              <History className="w-8 h-8 text-white/10 mx-auto mb-3" />
              <div className="text-white/20 text-sm font-bold uppercase tracking-widest">No bids placed yet</div>
              <div className="text-white/10 text-[10px] uppercase mt-1">Be the first to claim this bot!</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
