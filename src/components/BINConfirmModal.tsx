import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap } from 'lucide-react';

interface AuctionData {
  name: string;
  binPrice: number | string;
}

interface BINConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  auction: AuctionData;
}

export const BINConfirmModal: React.FC<BINConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  auction
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0a0a2e]/60 backdrop-blur-2xl"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="glass-modal rounded-3xl p-8 w-full max-w-md text-center"
          >
            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Zap className="text-yellow-500 w-10 h-10 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase italic mb-2 tracking-tighter">Confirm Purchase</h2>
            <p className="text-white/60 text-sm mb-8">
              Are you sure you want to buy <span className="text-white font-bold">{auction.name}</span> immediately for <span className="text-yellow-500 font-black">${(Number(auction.binPrice) || 0).toLocaleString()}</span>?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={onClose}
                className="bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all border border-white/10"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  try {
                    await onConfirm();
                  } catch (error) {
                    console.error('BIN confirmation failed:', error);
                  }
                }}
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 text-black font-black py-4 rounded-2xl transition-all shadow-lg shadow-yellow-500/20 uppercase italic"
              >
                Confirm BIN
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
