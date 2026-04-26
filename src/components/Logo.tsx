import React, { useState, useEffect } from 'react';
import { Bot } from 'lucide-react';
import { motion } from 'motion/react';

export const DreddBotzLogo = ({ isActive = false, isSold = false }: { isActive?: boolean, isSold?: boolean }) => {
  const [imageError, setImageError] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);

  useEffect(() => {
    if (isSold) {
      setHasSpun(false); // Reset spin state when it becomes sold so it can spin once
    }
  }, [isSold]);

  let glowColor1 = 'transparent';
  let glowColor2 = 'transparent';
  let initialFilter = 'none';
  let sizeClass = 'w-64 h-64 sm:w-80 sm:h-80'; // Matches poke pic container perfectly

  if (isSold) {
    glowColor1 = '#facc15';
    glowColor2 = '#facc15';
    initialFilter = 'drop-shadow(0 0 20px #facc15)';
    sizeClass = 'w-20 h-20 sm:w-28 sm:h-28'; // Smaller when at the top
  } else if (isActive) {
    glowColor1 = '#4ade80'; // neon green
    glowColor2 = '#a855f7'; // neon purple
    initialFilter = 'drop-shadow(0 0 20px #4ade80)';
    sizeClass = 'w-20 h-20 sm:w-28 sm:h-28'; // Smaller when at the top
  } else {
    glowColor1 = '#6b7280'; // Grey for offline
    glowColor2 = '#6b7280';
    initialFilter = 'drop-shadow(0 0 10px #6b7280)';
    sizeClass = 'w-64 h-64 sm:w-80 sm:h-80'; // Bigger in the Pokemon card
  }

  return (
    <motion.div 
      id="top-logo-container"
      className="relative flex flex-col items-center justify-center z-10 bg-transparent p-0"
      animate={{ 
        scale: [1, 1.05, 1],
        rotate: isSold && !hasSpun ? 360 : 0 
      }}
      transition={{ 
        scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: 1, ease: "easeOut" }
      }}
      onAnimationComplete={(definition) => {
        if (definition.rotate === 360) {
          setHasSpun(true);
        }
      }}
    >
      {!imageError ? (
        <motion.img 
          src="/logo.png" 
          alt="DreddBotz Auctions" 
          className={`relative z-10 object-contain transition-all duration-1000 ${sizeClass} block m-auto`}
          style={{ filter: initialFilter }}
          animate={{
            filter: [
              `drop-shadow(0 0 10px ${glowColor1})`,
              `drop-shadow(0 0 30px ${glowColor2})`,
              `drop-shadow(0 0 10px ${glowColor1})`
            ]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          referrerPolicy="no-referrer"
          onError={(e) => {
            setImageError(true);
          }}
        />
      ) : (
        <motion.div 
          className={`relative z-10 flex items-center justify-center transition-all duration-1000 ${sizeClass} block m-auto ${isSold ? 'text-yellow-400' : isActive ? 'text-[#4ade80]' : 'text-gray-500'}`}
          style={{ filter: initialFilter }}
          animate={{
            filter: [
              `drop-shadow(0 0 10px ${glowColor1})`,
              `drop-shadow(0 0 30px ${glowColor2})`,
              `drop-shadow(0 0 10px ${glowColor1})`
            ]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Bot className="w-full h-full" />
        </motion.div>
      )}
    </motion.div>
  );
};
