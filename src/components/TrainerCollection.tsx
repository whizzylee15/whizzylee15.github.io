import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Search, ExternalLink, Grid, List as ListIcon, Star, ArrowRightLeft } from 'lucide-react';
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

interface TrainerCollectionProps {
  user: any;
}

export const TrainerCollection: React.FC<TrainerCollectionProps> = ({ user }) => {
  const [collectionItems, setCollectionItems] = useState<ArchivedAuction[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [activeTab, setActiveTab] = useState<'collection' | 'history'>('collection');

  useEffect(() => {
    if (!user) {
      setCollectionItems([]);
      setTradeHistory([]);
      setIsLoading(false);
      setIsLoadingHistory(false);
      return;
    }

    const fetchCollection = async () => {
      const { data, error } = await supabase
        .from('auction_archives')
        .select('*')
        .eq('winnerUid', user.id);

      if (error) {
        handleSupabaseError(error, OperationType.LIST, 'auction_archives');
        return;
      }

      setCollectionItems(data || []);
      setIsLoading(false);
    };

    const fetchTradeHistory = async () => {
      // Assuming a foreign key relation exists between trade_offers and trade_items
      const { data, error } = await supabase
        .from('trade_offers')
        .select('*, trade_items(pokemonName, imageUrl, sellerName)')
        .in('status', ['accepted', 'rejected'])
        .or(`offererUid.eq.${user.id},sellerUid.eq.${user.id}`);

      if (error) {
        console.error('Error fetching trade history:', error);
      } else {
        setTradeHistory(data || []);
      }
      setIsLoadingHistory(false);
    };

    fetchCollection();
    fetchTradeHistory();

    const channel = supabase
      .channel(`trainer_collection_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_archives', filter: `winnerUid=eq.${user.id}` }, () => {
        fetchCollection();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_offers' }, () => {
        fetchTradeHistory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const sortedItems = [...collectionItems].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'date') {
      comparison = a.timestamp - b.timestamp;
    } else if (sortBy === 'price') {
      comparison = a.finalPrice - b.finalPrice;
    } else if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name);
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const filteredItems = sortedItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mt-12 glass-card rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 glass-modal">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/20 rounded-xl">
            <Trophy className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest text-white">Trainer's Collection</h2>
            <p className="text-xs font-bold text-white/40 uppercase tracking-tighter">Your Winning Pokémon</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="text"
              placeholder="Search your collection..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input rounded-xl pl-10 pr-4 py-2 text-sm text-white w-full md:w-48"
            />
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-white/60 focus:outline-none px-2 py-1 cursor-pointer hover:text-white transition-colors"
            >
              <option value="date" className="bg-[#1a1a3a]">Date Won</option>
              <option value="price" className="bg-[#1a1a3a]">Price</option>
              <option value="name" className="bg-[#1a1a3a]">Name</option>
            </select>
            <button 
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 hover:bg-white/5 rounded-lg transition-all text-white/40 hover:text-white"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              <div className={`transition-transform duration-300 ${sortOrder === 'desc' ? 'rotate-180' : ''}`}>
                <ArrowRightLeft className="w-3 h-3 rotate-90" />
              </div>
            </button>
          </div>

          <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-2 border-b border-white/5 bg-white/5 flex gap-4">
        <button 
          onClick={() => setActiveTab('collection')}
          className={`text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-lg transition-all ${activeTab === 'collection' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-white/40 hover:text-white/60'}`}
        >
          My Collection
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-lg transition-all ${activeTab === 'history' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-white/40 hover:text-white/60'}`}
        >
          Trade History
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'history' ? (
          isLoadingHistory ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="flex-1">
                    <SkeletonText className="h-4 w-3/4 mb-2" />
                    <SkeletonText className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : tradeHistory.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
              <ArrowRightLeft className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40 italic">Your trade history is empty.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tradeHistory.map((trade) => {
                const isOfferer = trade.offererUid === user?.id;
                const otherParty = isOfferer ? (trade.trade_items?.sellerName || 'Unknown Trainer') : trade.offererName;
                const tradeLabel = isOfferer ? 'Your offer to' : 'Offer received from';
                
                return (
                  <div key={trade.id} className="bg-black/20 border border-white/5 p-4 rounded-xl shadow-inner">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className={`w-4 h-4 ${trade.status === 'accepted' ? 'text-green-500' : 'text-red-500'}`} />
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{tradeLabel} <span className="text-white/80">{otherParty}</span></span>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                        trade.status === 'accepted' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {trade.status}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black/40 rounded-lg flex items-center justify-center overflow-hidden border border-white/10">
                          {trade.trade_items?.imageUrl ? (
                            <SafeImage src={trade.trade_items.imageUrl} alt={trade.trade_items.pokemonName} className="w-8 h-8 object-contain" />
                          ) : (
                            <Star className="w-4 h-4 text-white/20" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-black text-sm uppercase italic tracking-tighter">{trade.trade_items?.pokemonName || 'Unknown Pokémon'}</p>
                          <p className="text-[10px] text-white/40 uppercase font-bold mt-0.5">Offered Amount</p>
                        </div>
                      </div>
                      <div className="text-yellow-500 font-black text-lg flex items-center gap-1 sm:self-center">
                        <span className="text-xs">🪙</span>{trade.offerAmount?.toLocaleString() || 0}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : isLoading ? (
          <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" : "space-y-2"}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`bg-white/5 border border-white/10 rounded-2xl p-4 ${viewMode === 'list' ? 'flex items-center gap-4' : ''}`}>
                <Skeleton className={viewMode === 'grid' ? "aspect-square w-full mb-3 rounded-xl" : "w-12 h-12 rounded-lg"} />
                <div className="flex-1">
                  <SkeletonText className="h-4 w-3/4 mb-2" />
                  <SkeletonText className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-white/10" />
            </div>
            <p className="text-white/40 italic">Your collection is empty. Win an auction to start your trophy case!</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="glass-card rounded-2xl p-4 hover:border-yellow-500/50 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-2">
                    <Trophy className="w-3 h-3 text-yellow-500/40" />
                  </div>
                  <div className="aspect-square bg-black/20 rounded-xl flex items-center justify-center mb-3 border border-white/5 overflow-hidden">
                    {item.imageUrl ? (
                      <SafeImage 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform" 
                      />
                    ) : (
                      <Star className="w-8 h-8 text-white/10" />
                    )}
                  </div>
                  <h3 className="font-black text-white uppercase tracking-tight truncate text-xs">{item.name}</h3>
                  <p className="text-[8px] font-bold text-yellow-500 uppercase tracking-widest mt-1">🪙 {item.finalPrice.toLocaleString()}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <div key={item.id} className="glass-card rounded-xl p-3 flex items-center gap-4 hover:border-yellow-500/30 transition-all">
                <div className="w-12 h-12 bg-black/20 rounded-lg flex items-center justify-center overflow-hidden border border-white/5">
                  {item.imageUrl ? (
                    <SafeImage src={item.imageUrl} alt={item.name} className="w-8 h-8 object-contain" />
                  ) : (
                    <Star className="w-4 h-4 text-white/10" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-white uppercase tracking-tight truncate text-sm">{item.name}</h3>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Won on {new Date(item.timestamp).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-yellow-500">🪙 {item.finalPrice.toLocaleString()}</p>
                  <p className="text-[8px] text-white/20 font-bold uppercase tracking-widest">{item.roomId}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
