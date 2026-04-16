import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, Trophy, Calendar, ExternalLink, Search, ArrowLeft, Coins, User, Clock, MapPin } from 'lucide-react';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { Skeleton, SkeletonText } from './Skeleton';
import { SafeImage } from './SafeImage';

interface ArchivedAuction {
  id: string;
  name: string;
  winner: string;
  winnerUid: string;
  finalPrice: number;
  timestamp: number;
  imageUrl?: string;
  roomId: string;
}

interface AuctionArchivesProps {
  user: any;
}

export const AuctionArchives: React.FC<AuctionArchivesProps> = ({ user }) => {
  const [archives, setArchives] = useState<ArchivedAuction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAuction, setSelectedAuction] = useState<ArchivedAuction | null>(null);

  useEffect(() => {
    if (!user) {
      setArchives([]);
      setIsLoading(false);
      return;
    }

    const fetchArchives = async () => {
      const { data, error } = await supabase
        .from('auction_archives')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) {
        handleSupabaseError(error, OperationType.LIST, 'auction_archives');
        return;
      }

      setArchives(data || []);
      setIsLoading(false);
    };

    fetchArchives();

    const channel = supabase
      .channel('auction_archives_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_archives' }, () => {
        fetchArchives();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filteredArchives = archives.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.winner.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mt-12 glass-card rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 glass-modal">
        <div className="flex items-center gap-3">
          {selectedAuction ? (
            <button 
              onClick={() => setSelectedAuction(null)}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          ) : (
            <div className="p-2 bg-purple-500/20 rounded-xl">
              <History className="w-6 h-6 text-purple-400" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest text-white">
              {selectedAuction ? 'Auction Details' : 'Auction Archives'}
            </h2>
            <p className="text-xs font-bold text-white/40 uppercase tracking-tighter">
              {selectedAuction ? `Viewing ${selectedAuction.name}` : 'Historical Winning Bids'}
            </p>
          </div>
        </div>

        {!selectedAuction && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="text"
              placeholder="Search Pokémon or Trainer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input rounded-xl pl-10 pr-4 py-2 text-sm text-white w-full md:w-64"
            />
          </div>
        )}
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-16 h-16 rounded-xl" />
                  <div className="flex-1">
                    <SkeletonText className="h-5 w-3/4 mb-2" />
                    <SkeletonText className="h-3 w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : selectedAuction ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <div className="glass-modal rounded-3xl p-8 border border-white/5">
              <div className="flex flex-col items-center text-center gap-6">
                <div className="w-48 h-48 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 p-8 overflow-hidden">
                  {selectedAuction.imageUrl ? (
                    <SafeImage 
                      src={selectedAuction.imageUrl} 
                      alt={selectedAuction.name} 
                      className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]" 
                    />
                  ) : (
                    <Trophy className="w-24 h-24 text-white/10" />
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-4xl font-black text-white uppercase tracking-tighter italic">
                    {selectedAuction.name}
                  </h3>
                  <div className="inline-flex items-center gap-2 px-4 py-1 bg-purple-500/20 rounded-full border border-purple-500/30">
                    <Coins className="w-4 h-4 text-purple-400" />
                    <span className="text-xl font-black text-purple-400">
                      {selectedAuction.finalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-8">
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 rounded-xl">
                      <User className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Winner</p>
                      <p className="text-lg font-black text-white truncate">{selectedAuction.winner}</p>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                    <div className="p-3 bg-green-500/20 rounded-xl">
                      <Clock className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Date & Time</p>
                      <p className="text-lg font-black text-white">
                        {new Date(selectedAuction.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center gap-4 sm:col-span-2">
                    <div className="p-3 bg-orange-500/20 rounded-xl">
                      <MapPin className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Auction Room</p>
                      <p className="text-lg font-black text-white uppercase tracking-widest">{selectedAuction.roomId}</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedAuction(null)}
                  className="mt-8 px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-black uppercase tracking-widest transition-all"
                >
                  Return to Archives
                </button>
              </div>
            </div>
          </motion.div>
        ) : filteredArchives.length === 0 ? (
          <div className="text-center py-12 text-white/20 italic">
            <p>No archived auctions found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredArchives.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => setSelectedAuction(item)}
                  className="glass-card rounded-2xl p-4 hover:border-purple-500/50 transition-all group cursor-pointer active:scale-95"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-black/20 rounded-xl flex items-center justify-center overflow-hidden border border-white/5">
                      {item.imageUrl ? (
                        <SafeImage src={item.imageUrl} alt={item.name} className="w-12 h-12 object-contain" />
                      ) : (
                        <Trophy className="w-8 h-8 text-white/10" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-white uppercase tracking-tight truncate">{item.name}</h3>
                      <div className="flex items-center gap-1 text-purple-400 font-bold text-sm">
                        <span>🪙 {item.finalPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter">
                      <span className="text-white/40">Winner</span>
                      <span className="text-white">{item.winner}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter">
                      <span className="text-white/40">Date</span>
                      <span className="text-white">{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter">
                      <span className="text-white/40">Room</span>
                      <span className="text-white">{item.roomId}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
