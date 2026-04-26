import React, { useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Heart, Swords, Shield, Zap, Trophy, Loader2, Dna, Compass, Star } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { DreddBotzLogo } from './Logo';
import { SafeImage } from './SafeImage';

interface AuctionData {
  name: string;
  level: string;
  hp: string;
  atk: string;
  def: string;
  spd: string;
  moves: string;
  gmaxFactor: string;
  currentPrice: number | string;
  binPrice: number | string;
  endTime: number;
  winner: string;
  winnerUid?: string;
  isSold: boolean;
  imageUrl?: string;
  duration?: number | string;
}

interface PokemonCardProps {
  auction: AuctionData;
  isAuctionActive: boolean;
  pokemonImageUrl: string;
  isImageLoading: boolean;
  timeLeft: string;
  isEndingSoon: boolean;
  user: User | null;
  onBuyItNow: () => void;
  isWatchlisted?: boolean;
  onToggleWatchlist?: () => void;
}

export const PokemonCard: React.FC<PokemonCardProps> = ({
  auction,
  isAuctionActive,
  pokemonImageUrl,
  isImageLoading,
  timeLeft,
  isEndingSoon,
  user,
  onBuyItNow,
  isWatchlisted,
  onToggleWatchlist
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const handleToggleWatchlist = () => {
    if (!user) {
      toast.error('Please login to use the watchlist');
      return;
    }
    
    if (onToggleWatchlist) {
      onToggleWatchlist();
      
      if (isWatchlisted) {
        toast.success(`Removed ${auction.name} from watchlist`);
      } else {
        toast.success(`Added ${auction.name} to watchlist!`, { icon: '⭐' });
      }
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 mb-8 relative" style={{ perspective: 1000 }}>
      {/* Timer Display / Status Tag */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20">
        {!isAuctionActive ? (
          <div className="glass-modal rounded-full px-8 py-2 flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                <span className="text-gray-400 font-mono font-black text-xl tracking-widest uppercase">OFFLINE</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className={`glass-modal ${isEndingSoon ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : ''} rounded-full px-6 py-2 flex items-center gap-3 transition-all duration-500`}>
              <div className="flex flex-col items-center">
                <span className={`text-[8px] ${isEndingSoon ? 'text-red-400' : 'text-white/40'} font-bold uppercase tracking-widest leading-none mb-1`}>Time Remaining</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isEndingSoon ? 'bg-red-500 animate-ping' : 'bg-red-500 animate-pulse'}`} />
                  <div className="flex items-baseline gap-1">
                    {timeLeft.split(':').map((unit, i) => (
                      <React.Fragment key={i}>
                        <div className="flex flex-col items-center">
                          <span className={`${isEndingSoon ? 'text-red-500' : 'text-white'} font-mono font-black text-xl tracking-tighter`}>{unit}</span>
                          <span className={`text-[6px] font-bold uppercase ${isEndingSoon ? 'text-red-500/60' : 'text-white/20'}`}>
                            {i === 0 ? 'H' : i === 1 ? 'M' : 'S'}
                          </span>
                        </div>
                        {i < 2 && <span className={`${isEndingSoon ? 'text-red-500/40' : 'text-white/20'} font-mono font-black text-lg mb-2`}>:</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <AnimatePresence>
              {isEndingSoon && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                  className="bg-red-500 text-white text-[10px] font-black px-4 py-1 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)] uppercase italic tracking-widest flex items-center gap-2"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  Final 5 Minutes
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Sold Overlay */}
      <AnimatePresence>
        {auction.isSold && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center glass-modal rounded-3xl border-4 border-purple-500/50"
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: -5 }}
              className="text-center px-4"
            >
              {user && auction.winnerUid === user.id ? (
                <>
                  <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-6xl font-black px-12 py-6 rounded-2xl shadow-[0_0_50px_rgba(234,179,8,0.6)] mb-6 border-4 border-white uppercase italic">
                    YOU WON!
                  </div>
                  <div className="text-3xl font-black text-white mb-2 flex items-center justify-center gap-3">
                    <Trophy className="text-yellow-400 w-10 h-10" />
                    CLAIM YOUR PRIZE
                  </div>
                  <a 
                    href="https://chat.whatsapp.com/BAfBWraYjOHCYTD1Mlpoab?mode=gi_t"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-white/80 max-w-sm mx-auto mb-4 bg-black/40 p-4 rounded-xl border border-white/10 hover:bg-black/60 hover:border-green-500/50 transition-all block group"
                  >
                    Join the <span className="text-green-400 group-hover:underline">dreddz auction group chat</span> in the dreddz community to claim your Pokemon
                  </a>
                </>
              ) : (
                <>
                  <div className="bg-red-600 text-white text-7xl font-black px-12 py-6 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.6)] mb-6 border-4 border-white uppercase italic">
                    SOLD!
                  </div>
                  <div className="text-3xl font-black text-white mb-2 flex items-center justify-center gap-3">
                    <Trophy className="text-yellow-400 w-8 h-8" />
                    {auction.winner}
                  </div>
                </>
              )}
              <div className="text-yellow-500 font-black text-xl italic flex items-center justify-center gap-1">
                Final Price: <span className="text-lg">🪙</span>{(Number(auction.currentPrice) || 0).toLocaleString()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Pokémon Card */}
      <motion.div 
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className={`glass-card ${isEndingSoon ? 'border-red-500/40 shadow-[0_0_50px_rgba(239,68,68,0.2)]' : ''} rounded-3xl p-6 sm:p-8 flex flex-col items-center relative overflow-hidden mt-6 sm:mt-0 transition-all duration-1000`}
      >
        <button 
          onClick={handleToggleWatchlist}
          className={`absolute top-6 right-6 z-30 p-2 ${isWatchlisted ? 'bg-yellow-500/20 border-yellow-500/50' : 'glass-button'} rounded-full transition-colors group`}
        >
          <Star className={`w-5 h-5 ${isWatchlisted ? 'text-yellow-400 fill-yellow-400' : 'text-white/40 group-hover:text-yellow-400'} transition-colors`} />
        </button>

        {/* "You Won!" / Winning Badge */}
        {isAuctionActive && user && auction.winnerUid === user.id && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-6 left-6 z-30 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-black text-xs sm:text-sm px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.5)] border-2 border-white/50 uppercase italic flex items-center gap-1.5 animate-pulse"
          >
            <Trophy className="w-4 h-4" />
            You're Winning!
          </motion.div>
        )}

        {/* Current Leader Badge (when not you) */}
        {isAuctionActive && auction.winner && auction.winner !== 'None' && auction.winnerUid !== user?.id && (
          <motion.div 
            key={auction.winner}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-6 left-6 z-30 bg-white/5 backdrop-blur-md text-white/60 font-black text-[10px] sm:text-xs px-4 py-1.5 rounded-full border border-white/10 uppercase italic flex items-center gap-1.5"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
            Leader: {auction.winner}
          </motion.div>
        )}

        <div className={`grid ${isAuctionActive ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'} gap-8 lg:gap-12 w-full items-center`} style={{ transform: "translateZ(50px)" }}>
          {/* Left Side: Image / Logo */}
          <div className={`flex flex-col items-center justify-center relative ${isAuctionActive ? 'lg:col-span-5' : ''}`}>
            <motion.div
              key={auction.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`relative ${isAuctionActive ? 'w-48 h-48 sm:w-64 sm:h-64 lg:w-72 lg:h-72' : 'w-64 h-64 sm:w-80 sm:h-80'} flex items-center justify-center`}
            >
              <div className="absolute inset-0 bg-purple-500/10 blur-3xl rounded-full" />
              
              {(!isAuctionActive || !pokemonImageUrl) ? (
                <motion.div
                  layoutId="main-logo"
                  transition={{ type: "spring", stiffness: 100, damping: 15 }}
                  className="relative z-20 flex flex-col items-center"
                >
                  <DreddBotzLogo isActive={isAuctionActive} isSold={auction.isSold} />
                </motion.div>
              ) : (
                <div className="w-full h-full relative z-10">
                  <SafeImage 
                    src={pokemonImageUrl} 
                    alt={auction.name} 
                    className={`w-full h-full object-contain drop-shadow-2xl transition-all duration-500 ${auction.name === 'Awaiting Signal...' ? 'grayscale blur-sm' : ''}`}
                    containerClassName="w-full h-full"
                  />
                </div>
              )}
            </motion.div>

            {/* Current Price Indicator on Image */}
            {isAuctionActive && !auction.isSold && (
              <motion.div
                key={auction.currentPrice}
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute bottom-0 bg-black/60 backdrop-blur-xl border border-white/10 px-4 py-1.5 rounded-2xl z-20 shadow-2xl"
              >
                <div className="text-[8px] text-white/40 font-black uppercase tracking-widest text-center mb-0.5">Current Bid</div>
                <div className="text-yellow-500 font-black text-sm sm:text-base italic tracking-tighter flex items-center justify-center gap-0.5">
                  <span className="text-xs">🪙</span>{(Number(auction.currentPrice) || 0).toLocaleString()}
                </div>
              </motion.div>
            )}

            {/* BIN Button */}
            {Number(auction.binPrice) > 0 && !auction.isSold && (
              <motion.button
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                onClick={onBuyItNow}
                className="mt-10 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-black text-[10px] sm:text-xs px-6 py-2.5 rounded-full shadow-lg shadow-yellow-500/40 z-20 hover:scale-110 transition-transform uppercase italic flex items-center gap-1.5"
              >
                ⚡ BUY IT NOW: <span className="text-[10px]">🪙</span>{Number(auction.binPrice).toLocaleString()}
              </motion.button>
            )}
          </div>

          {/* Right Side: Info & Stats */}
          <div className={`flex flex-col ${isAuctionActive ? 'lg:col-span-7' : ''}`}>
            {!isAuctionActive ? (
              <div className="flex flex-col items-center justify-center h-full py-4 text-center">
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">
                  Next Auction <span className="text-purple-500">Soon...</span>
                </h2>
              </div>
            ) : (
              <div className="flex flex-col justify-center h-full">
                <div className="mb-6 lg:mb-8 text-center lg:text-left">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-white mb-2 uppercase italic leading-none">
                    {auction.name}
                  </h1>
                  <div className="text-purple-400 text-xl sm:text-2xl lg:text-3xl font-bold uppercase tracking-widest">
                    Level {auction.level || '??'}
                  </div>
                </div>

                {/* Core Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {[
                    { label: 'HP', value: auction.hp, icon: <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />, color: 'rose' },
                    { label: 'ATK', value: auction.atk, icon: <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />, color: 'orange' },
                    { label: 'DEF', value: auction.def, icon: <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />, color: 'blue' },
                    { label: 'SPD', value: auction.spd, icon: <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />, color: 'yellow' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10 flex flex-col items-center justify-center gap-2 sm:gap-3 hover:bg-white/10 transition-colors shadow-inner">
                      <div className="opacity-80">{stat.icon}</div>
                      <div className="h-6 sm:h-8 flex items-center justify-center overflow-hidden">
                        <AnimatePresence mode="popLayout">
                          <motion.span
                            key={stat.value || 'empty'}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="text-white font-black text-2xl sm:text-3xl leading-none block tracking-tighter"
                          >
                            {stat.value || '--'}
                          </motion.span>
                        </AnimatePresence>
                      </div>
                      <span className="text-white/50 text-[10px] sm:text-xs font-black uppercase tracking-widest">{stat.label}</span>
                    </div>
                  ))}
                </div>

                {/* Additional Details */}
                <div className="mt-6 space-y-4">
                  <div className="bg-black/20 rounded-2xl p-4 sm:p-5 border border-white/5 shadow-inner">
                    <span className="text-white/30 text-[10px] font-black uppercase tracking-widest block mb-2">Moveset</span>
                    <p className="text-white/80 font-medium tracking-wide uppercase text-xs sm:text-sm leading-relaxed">
                      {auction.moves || 'Unknown'}
                    </p>
                  </div>

                  {auction.gmaxFactor && auction.gmaxFactor.toLowerCase() !== 'no' && auction.gmaxFactor.toLowerCase() !== 'none' && (
                    <div className="inline-flex items-center gap-2 text-yellow-400 text-[10px] sm:text-xs font-black uppercase tracking-widest bg-yellow-400/10 px-4 py-2.5 rounded-full border border-yellow-400/20 w-fit shadow-lg shadow-yellow-500/10">
                      <Zap className="w-4 h-4" /> Gigantamax Factor: {auction.gmaxFactor}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
