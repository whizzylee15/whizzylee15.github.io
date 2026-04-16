import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Tag, User, MessageCircle, ArrowRightLeft, X, HandCoins, Check, Trash2, Star, Pencil } from 'lucide-react';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { toast } from 'sonner';
import { Skeleton, SkeletonText } from './Skeleton';
import { SafeImage } from './SafeImage';

interface TradeItem {
  id: string;
  pokemonName: string;
  sellerName: string;
  sellerUid: string;
  price: number;
  description: string;
  timestamp: any;
  imageUrl?: string;
}

interface TradeOffer {
  id: string;
  itemId: string;
  offererUid: string;
  offererName: string;
  sellerUid: string;
  offerAmount: number;
  message: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
  messages?: {
    senderUid: string;
    text: string;
    timestamp: number;
  }[];
  offeredPokemonIds?: string[];
  counterAmount?: number;
  counterPokemonIds?: string[];
}

interface TradingFloorProps {
  user: any;
  profile: any;
}

export const TradingFloor: React.FC<TradingFloorProps> = ({ user, profile }) => {
  const [items, setItems] = useState<TradeItem[]>([]);
  const [offers, setOffers] = useState<TradeOffer[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);
  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'offers' | 'history'>('buy');
  const [isListingOpen, setIsListingOpen] = useState(false);
  const [isOfferOpen, setIsOfferOpen] = useState<string | null>(null);
  const [newListing, setNewListing] = useState({
    pokemonName: '',
    price: '',
    description: ''
  });
  const [newOffer, setNewOffer] = useState({
    amount: '',
    message: ''
  });
  const [negotiationOpen, setNegotiationOpen] = useState<string | null>(null);
  const [negotiationText, setNegotiationText] = useState('');
  const [userCollection, setUserCollection] = useState<any[]>([]);
  const [selectedTradePokemon, setSelectedTradePokemon] = useState<string[]>([]);
  const [isTradeMode, setIsTradeMode] = useState(false);
  const [offeredPokemonDetails, setOfferedPokemonDetails] = useState<any[]>([]);
  const [quickBidAmounts, setQuickBidAmounts] = useState<{[key: string]: string}>({});
  const [isCountering, setIsCountering] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [selectedCounterPokemon, setSelectedCounterPokemon] = useState<string[]>([]);
  const [isEditOfferOpen, setIsEditOfferOpen] = useState<string | null>(null);
  const [editOfferData, setEditOfferData] = useState({ amount: '', message: '' });

  useEffect(() => {
    if (!negotiationOpen) {
      setOfferedPokemonDetails([]);
      return;
    }

    const offer = offers.find(o => o.id === negotiationOpen);
    if (!offer?.offeredPokemonIds || offer.offeredPokemonIds.length === 0) return;

    // Fetch details for each offered pokemon
    const fetchDetails = async () => {
      try {
        const details = await Promise.all(
          offer.offeredPokemonIds!.map(async (id) => {
            const { data, error } = await supabase.from('auction_archives').select('*').eq('id', id).single();
            return data || null;
          })
        );
        setOfferedPokemonDetails(details.filter(d => d !== null));
      } catch (error) {
        console.error('Error fetching offered pokemon details:', error);
      }
    };

    fetchDetails();
  }, [negotiationOpen, offers]);

  useEffect(() => {
    if (!user) return;
    
    const fetchUserCollection = async () => {
      const { data, error } = await supabase
        .from('auction_archives')
        .select('*')
        .eq('winnerUid', user.id);
      
      if (data) setUserCollection(data);
    };

    fetchUserCollection();

    const channel = supabase
      .channel(`user_collection_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_archives', filter: `winnerUid=eq.${user.id}` }, () => {
        fetchUserCollection();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('trading_floor')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) {
        handleSupabaseError(error, OperationType.LIST, 'trading_floor');
        setIsLoadingItems(false);
        return;
      }

      setItems(data || []);
      setIsLoadingItems(false);
    };

    fetchItems();

    const channel = supabase
      .channel('trading_floor_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trading_floor' }, () => {
        fetchItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setOffers([]);
      return;
    }

    const fetchOffers = async () => {
      const { data, error } = await supabase
        .from('trade_offers')
        .select('*');

      if (error) {
        handleSupabaseError(error, OperationType.LIST, 'trade_offers');
        setIsLoadingOffers(false);
        return;
      }

      setOffers(data || []);
      setIsLoadingOffers(false);
    };

    fetchOffers();

    const channel = supabase
      .channel('trade_offers_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_offers' }, () => {
        fetchOffers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleCreateListing = async () => {
    if (!user || !newListing.pokemonName || !newListing.price) return;
    
    try {
      const { error } = await supabase.from('trading_floor').insert([{
        pokemonName: newListing.pokemonName,
        price: parseInt(newListing.price),
        description: newListing.description,
        sellerName: profile?.whatsappName || profile?.displayName || user.user_metadata?.full_name || 'Anonymous',
        sellerUid: user.id,
        timestamp: Date.now()
      }]);

      if (error) throw error;

      setNewListing({ pokemonName: '', price: '', description: '' });
      setIsListingOpen(false);
      toast.success('Listing Created', { description: `Your ${newListing.pokemonName} is now on the trading floor.` });
    } catch (error) {
      console.error('Error creating listing:', error);
      handleSupabaseError(error, OperationType.CREATE, 'trading_floor');
    }
  };

  const handleMakeOffer = async (itemId: string) => {
    if (!user) return;
    if (!newOffer.amount && selectedTradePokemon.length === 0) {
      toast.error('Please enter an amount or select a Pokémon for trade');
      return;
    }

    try {
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      const { error } = await supabase.from('trade_offers').insert([{
        itemId,
        offererUid: user.id,
        offererName: profile?.whatsappName || profile?.displayName || user.user_metadata?.full_name || 'Anonymous',
        sellerUid: item.sellerUid,
        offerAmount: parseInt(newOffer.amount) || 0,
        message: newOffer.message,
        timestamp: Date.now(),
        status: 'pending',
        messages: [],
        offeredPokemonIds: selectedTradePokemon
      }]);

      if (error) throw error;

      setNewOffer({ amount: '', message: '' });
      setSelectedTradePokemon([]);
      setIsTradeMode(false);
      setIsOfferOpen(null);
      toast.success('Offer Sent', { description: 'The seller has been notified of your offer.' });
    } catch (error) {
      console.error('Error making offer:', error);
      handleSupabaseError(error, OperationType.CREATE, 'trade_offers');
    }
  };

  const handleUpdateOfferStatus = async (offerId: string, status: 'accepted' | 'rejected' | 'countered') => {
    try {
      const offer = offers.find(o => o.id === offerId);
      if (!offer) return;

      const updateData: any = { status };
      
      if (status === 'countered') {
        updateData.counterAmount = parseInt(counterAmount) || 0;
        updateData.counterPokemonIds = selectedCounterPokemon;
        updateData.timestamp = Date.now();
        
        // Add a system message to the chat
        const currentMessages = offer.messages || [];
        const systemMsg = {
          senderUid: 'system',
          text: `Seller proposed a counter-offer: 🪙 ${updateData.counterAmount.toLocaleString()}${selectedCounterPokemon.length > 0 ? ` + ${selectedCounterPokemon.length} Pokémon` : ''}`,
          timestamp: Date.now()
        };
        updateData.messages = [...currentMessages, systemMsg];
      }

      const { error } = await supabase.from('trade_offers').update(updateData).eq('id', offerId);
      if (error) throw error;
      
      if (status === 'accepted') {
        // Remove the listing from the trading floor
        const { error: deleteError } = await supabase.from('trading_floor').delete().eq('id', offer.itemId);
        if (deleteError) throw deleteError;

        // Transfer ownership of offered Pokémon (from buyer to seller)
        if (offer.offeredPokemonIds && offer.offeredPokemonIds.length > 0) {
          for (const pokeId of offer.offeredPokemonIds) {
            await supabase.from('auction_archives').update({ winnerUid: offer.sellerUid }).eq('id', pokeId);
          }
        }

        // Transfer ownership of counter-offered Pokémon (from seller to buyer)
        if (offer.counterPokemonIds && offer.counterPokemonIds.length > 0) {
          for (const pokeId of offer.counterPokemonIds) {
            await supabase.from('auction_archives').update({ winnerUid: offer.offererUid }).eq('id', pokeId);
          }
        }

        toast.success('Offer Accepted', { description: 'Trade completed and Pokémon ownership transferred.' });
      } else if (status === 'countered') {
        toast.success('Counter-offer Sent');
        setIsCountering(false);
        setCounterAmount('');
        setSelectedCounterPokemon([]);
      } else {
        toast.success('Offer Rejected');
      }
    } catch (error) {
      console.error('Error updating offer:', error);
      handleSupabaseError(error, OperationType.UPDATE, `trade_offers/${offerId}`);
    }
  };

  const handleQuickBid = async (itemId: string) => {
    if (!user) return;
    const amount = parseInt(quickBidAmounts[itemId]);
    if (!amount || isNaN(amount)) {
      toast.error('Please enter a valid bid amount');
      return;
    }

    try {
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      const { error } = await supabase.from('trade_offers').insert([{
        itemId,
        offererUid: user.id,
        offererName: profile?.whatsappName || profile?.displayName || user.user_metadata?.full_name || 'Anonymous',
        sellerUid: item.sellerUid,
        offerAmount: amount,
        message: 'Quick bid placed from browse.',
        timestamp: Date.now(),
        status: 'pending',
        messages: []
      }]);

      if (error) throw error;
      
      setQuickBidAmounts(prev => ({ ...prev, [itemId]: '' }));
      toast.success('Bid Placed', { description: 'Your bid has been sent as an offer.' });
    } catch (error) {
      console.error('Error placing quick bid:', error);
      handleSupabaseError(error, OperationType.CREATE, 'trade_offers');
    }
  };

  const handleUpdateOfferAmount = async (offerId: string, newAmount: number) => {
    try {
      const { error } = await supabase.from('trade_offers').update({
        offerAmount: newAmount,
        timestamp: Date.now()
      }).eq('id', offerId);

      if (error) throw error;

      toast.success('Offer Updated', { description: `New offer amount: 🪙 ${newAmount.toLocaleString()}` });
    } catch (error) {
      console.error('Error updating offer amount:', error);
      handleSupabaseError(error, OperationType.UPDATE, `trade_offers/${offerId}`);
    }
  };

  const handleUpdateOffer = async () => {
    if (!isEditOfferOpen) return;
    try {
      const { error } = await supabase.from('trade_offers').update({
        offerAmount: parseInt(editOfferData.amount),
        message: editOfferData.message,
        offeredPokemonIds: selectedTradePokemon,
        timestamp: Date.now()
      }).eq('id', isEditOfferOpen);

      if (error) throw error;

      toast.success('Offer Updated', { description: 'Your offer has been successfully modified.' });
      setIsEditOfferOpen(null);
      setSelectedTradePokemon([]);
    } catch (error) {
      console.error('Error updating offer:', error);
      handleSupabaseError(error, OperationType.UPDATE, `trade_offers/${isEditOfferOpen}`);
    }
  };

  const handleSendMessage = async (offerId: string) => {
    if (!user || !negotiationText.trim()) return;

    try {
      const offer = offers.find(o => o.id === offerId);
      const currentMessages = offer?.messages || [];
      const newMessage = {
        senderUid: user.id,
        text: negotiationText.trim(),
        timestamp: Date.now()
      };

      const { error } = await supabase.from('trade_offers').update({
        messages: [...currentMessages, newMessage]
      }).eq('id', offerId);

      if (error) throw error;

      setNegotiationText('');
    } catch (error) {
      console.error('Error sending message:', error);
      handleSupabaseError(error, OperationType.UPDATE, `trade_offers/${offerId}`);
    }
  };

  const handleDeleteListing = async (id: string) => {
    try {
      const { error } = await supabase.from('trading_floor').delete().eq('id', id);
      if (error) throw error;
      toast.success('Listing Removed');
    } catch (error) {
      console.error('Error deleting listing:', error);
      handleSupabaseError(error, OperationType.DELETE, `trading_floor/${id}`);
    }
  };

  const getOffersForItem = (itemId: string) => offers.filter(o => o.itemId === itemId);

  return (
    <div className="mt-12 glass-card rounded-3xl p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-purple-500/20 p-2 rounded-xl">
            <ShoppingBag className="text-purple-400 w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Trading Floor</h2>
            <p className="text-white/40 text-xs font-medium uppercase tracking-widest">Resell & Trade your Pokémon</p>
          </div>
        </div>
        
        <div className="flex items-center glass-input p-1 rounded-2xl w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('buy')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === 'buy' 
                ? 'bg-purple-600/30 text-white border border-purple-500/50 backdrop-blur-md shadow-lg shadow-purple-900/40' 
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            Browse
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === 'sell' 
                ? 'bg-purple-600/30 text-white border border-purple-500/50 backdrop-blur-md shadow-lg shadow-purple-900/40' 
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            My Listings
          </button>
          <button
            onClick={() => setActiveTab('offers')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === 'offers' 
                ? 'bg-purple-600/30 text-white border border-purple-500/50 backdrop-blur-md shadow-lg shadow-purple-900/40' 
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            My Trades
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === 'history' 
                ? 'bg-purple-600/30 text-white border border-purple-500/50 backdrop-blur-md shadow-lg shadow-purple-900/40' 
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            History
          </button>
        </div>

        <button 
          onClick={() => setIsListingOpen(true)}
          className="w-full md:w-auto bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 backdrop-blur-md font-black px-8 py-4 rounded-2xl transition-all shadow-xl shadow-green-900/40 flex items-center justify-center gap-3 scale-105 hover:scale-110 active:scale-95"
        >
          <Tag className="w-5 h-5" /> 
          <span className="uppercase tracking-widest text-xs">List Item</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(activeTab === 'buy' || activeTab === 'sell') && isLoadingItems ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-black/40 border border-white/10 rounded-2xl p-6">
              <div className="flex justify-between mb-4">
                <div className="flex-1">
                  <SkeletonText className="h-6 w-1/2 mb-2" />
                  <SkeletonText className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
              <SkeletonText className="h-4 w-full mb-2" />
              <SkeletonText className="h-4 w-2/3 mb-6" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))
        ) : null}

        {!isLoadingItems && activeTab === 'buy' && (
          items.filter(item => item.sellerUid !== user?.id).length > 0 ? (
            items
              .filter(item => item.sellerUid !== user?.id)
              .map((item) => (
                <motion.div 
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card rounded-2xl p-6 hover:border-purple-500/50 transition-all group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-black text-white italic uppercase tracking-tight">{item.pokemonName}</h3>
                      <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">
                        <User className="w-3 h-3" /> {item.sellerName}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-yellow-500 font-black text-lg">🪙{item.price.toLocaleString()}</div>
                      <div className="text-[8px] text-white/20 font-bold uppercase tracking-widest">Asking Price</div>
                    </div>
                  </div>

                  <p className="text-white/60 text-xs mb-6 line-clamp-2 italic">"{item.description || 'No description provided.'}"</p>

                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input 
                        type="number"
                        value={quickBidAmounts[item.id] || ''}
                        onChange={(e) => setQuickBidAmounts(prev => ({ ...prev, [item.id]: e.target.value }))}
                        placeholder="Quick Bid..."
                        className="flex-1 glass-input rounded-xl px-3 py-2 text-[10px] text-white"
                      />
                      <button 
                        onClick={() => handleQuickBid(item.id)}
                        className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 backdrop-blur-md font-black px-4 py-2 rounded-xl text-[10px] uppercase transition-all"
                      >
                        Bid
                      </button>
                    </div>
                    <div className="flex gap-2">
                      {(() => {
                        const existingOffer = offers.find(o => o.itemId === item.id && o.offererUid === user?.id);
                        return existingOffer ? (
                          <button 
                            onClick={() => setNegotiationOpen(existingOffer.id)}
                            className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 backdrop-blur-md font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                          >
                            <MessageCircle className="w-3 h-3" /> Negotiate
                          </button>
                        ) : (
                          <button 
                            onClick={() => setIsOfferOpen(item.id)}
                            className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 backdrop-blur-md font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                          >
                            <HandCoins className="w-3 h-3" /> Make Offer
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </motion.div>
              ))
          ) : (
            <div className="col-span-full py-12 text-center">
              <div className="text-white/20 text-sm italic mb-2">The trading floor is currently empty.</div>
              <div className="text-white/10 text-[10px] font-bold uppercase tracking-widest">Be the first to list a Pokémon!</div>
            </div>
          )
        )}

        {!isLoadingItems && activeTab === 'sell' && (
          items.filter(item => item.sellerUid === user?.id).length > 0 ? (
            items
              .filter(item => item.sellerUid === user?.id)
              .map((item) => (
                <motion.div 
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card rounded-2xl p-6 hover:border-purple-500/50 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleDeleteListing(item.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-black text-white italic uppercase tracking-tight">{item.pokemonName}</h3>
                      <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">
                        <User className="w-3 h-3" /> {item.sellerName}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-yellow-500 font-black text-lg">🪙{item.price.toLocaleString()}</div>
                      <div className="text-[8px] text-white/20 font-bold uppercase tracking-widest">Asking Price</div>
                    </div>
                  </div>

                  <p className="text-white/60 text-xs mb-6 line-clamp-2 italic">"{item.description || 'No description provided.'}"</p>

                  <div className="w-full text-center py-2 text-[10px] font-bold text-white/40 uppercase tracking-widest bg-white/5 rounded-xl">
                    Your Listing
                  </div>

                  {getOffersForItem(item.id).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                      <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Offers ({getOffersForItem(item.id).length})</h4>
                      {getOffersForItem(item.id).map(offer => (
                        <div key={offer.id} className="bg-white/5 rounded-xl p-2 border border-white/5">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-white">{offer.offererName}</span>
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-black text-green-400">🪙 {offer.offerAmount.toLocaleString()}</span>
                              {offer.offeredPokemonIds && offer.offeredPokemonIds.length > 0 && (
                                <span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter">
                                  + {offer.offeredPokemonIds.length} Pokémon Trade
                                </span>
                              )}
                            </div>
                          </div>
                          {offer.status === 'pending' || offer.status === 'countered' ? (
                            <div className="flex gap-1">
                              <button 
                                onClick={() => handleUpdateOfferStatus(offer.id, 'accepted')}
                                className="flex-1 bg-green-500/20 hover:bg-green-500/40 text-green-400 p-1 rounded-lg text-[8px] font-black uppercase"
                              >
                                Accept
                              </button>
                              <button 
                                onClick={() => handleUpdateOfferStatus(offer.id, 'rejected')}
                                className="flex-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 p-1 rounded-lg text-[8px] font-black uppercase"
                              >
                                Reject
                              </button>
                              <button 
                                onClick={() => setNegotiationOpen(offer.id)}
                                className="flex-1 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 p-1 rounded-lg text-[8px] font-black uppercase"
                              >
                                Chat
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <div className={`flex-1 text-[8px] font-black uppercase text-center py-1 rounded-lg ${offer.status === 'accepted' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {offer.status}
                              </div>
                              <button 
                                onClick={() => setNegotiationOpen(offer.id)}
                                className="flex-1 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 p-1 rounded-lg text-[8px] font-black uppercase"
                              >
                                Chat
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))
          ) : (
            <div className="col-span-full py-12 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
              <p className="text-white/20 italic text-sm">You don't have any active listings.</p>
            </div>
          )
        )}

        {activeTab === 'offers' && (
          <div className="col-span-full space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-500/20 p-2 rounded-xl">
                <ArrowRightLeft className="text-blue-400 w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">My Trades</h3>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Outgoing offers and trade proposals</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoadingOffers ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="glass-card rounded-2xl p-6">
                    <div className="flex justify-between mb-4">
                      <div className="flex-1">
                        <SkeletonText className="h-5 w-1/2 mb-2" />
                        <SkeletonText className="h-3 w-1/3" />
                      </div>
                      <Skeleton className="h-5 w-12" />
                    </div>
                    <Skeleton className="h-16 w-full mb-4 rounded-xl" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </div>
                ))
              ) : offers.filter(o => o.offererUid === user?.id && (o.status === 'pending' || o.status === 'countered')).length > 0 ? (
                offers
                  .filter(o => o.offererUid === user?.id && (o.status === 'pending' || o.status === 'countered'))
                  .map((offer) => {
                    const item = items.find(i => i.id === offer.itemId);
                    return (
                      <div key={offer.id} className="glass-card rounded-2xl p-6 hover:border-blue-500/50 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-white font-bold italic uppercase tracking-tight">{item?.pokemonName || 'Unknown Item'}</h4>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Seller: {item?.sellerName || 'Unknown'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-yellow-400 font-bold">🪙 {offer.offerAmount.toLocaleString()}</p>
                            {offer.offeredPokemonIds && offer.offeredPokemonIds.length > 0 && (
                              <p className="text-[8px] font-black text-blue-400 uppercase tracking-tighter">
                                + {offer.offeredPokemonIds.length} Pokémon Trade
                              </p>
                            )}
                            <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                              offer.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                              offer.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                              offer.status === 'countered' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {offer.status}
                            </span>
                          </div>
                        </div>
                        
                        {offer.message && (
                          <p className="text-white/60 text-[10px] italic mb-4 bg-white/5 p-3 rounded-xl border border-white/5">
                            "{offer.message}"
                          </p>
                        )}

                        <div className="flex gap-2">
                          <button 
                            onClick={() => setNegotiationOpen(offer.id)}
                            className="flex-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                          >
                            <MessageCircle className="w-3 h-3" /> Chat
                          </button>
                          {offer.status === 'pending' && (
                            <button 
                              onClick={() => {
                                setIsEditOfferOpen(offer.id);
                                setEditOfferData({ amount: offer.offerAmount.toString(), message: offer.message || '' });
                                setSelectedTradePokemon(offer.offeredPokemonIds || []);
                                setNegotiationOpen(null);
                              }}
                              className="flex-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-purple-500/20"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                          )}
                          {offer.status === 'countered' && (
                            <div className="flex gap-2 flex-1">
                              <button 
                                onClick={() => handleUpdateOfferStatus(offer.id, 'accepted')}
                                className="flex-1 bg-green-600/20 hover:bg-green-600/40 text-green-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 border border-green-500/20"
                              >
                                Accept
                              </button>
                              <button 
                                onClick={() => handleUpdateOfferStatus(offer.id, 'rejected')}
                                className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 border border-red-500/20"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="col-span-full py-12 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                  <p className="text-white/20 italic text-sm">You haven't made any active offers yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="col-span-full space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-emerald-500/20 p-2 rounded-xl">
                <ArrowRightLeft className="text-emerald-400 w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Trade History</h3>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Completed trades and accepted offers</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {offers.filter(o => (o.offererUid === user?.id || o.sellerUid === user?.id) && (o.status === 'accepted' || o.status === 'rejected')).length > 0 ? (
                offers
                  .filter(o => (o.offererUid === user?.id || o.sellerUid === user?.id) && (o.status === 'accepted' || o.status === 'rejected'))
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((offer) => {
                    const item = items.find(i => i.id === offer.itemId);
                    const isSeller = offer.sellerUid === user?.id;
                    return (
                      <div key={offer.id} className="glass-card rounded-2xl p-6 opacity-80 hover:opacity-100 transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-white font-bold italic uppercase tracking-tight">{item?.pokemonName || 'Archived Item'}</h4>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                              {isSeller ? `Buyer: ${offer.offererName}` : `Seller: ${item?.sellerName || 'Unknown'}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-yellow-400 font-bold">🪙 {offer.offerAmount.toLocaleString()}</p>
                            <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                              offer.status === 'accepted' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {offer.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-[8px] text-white/20 font-bold uppercase tracking-widest mt-4">
                          {new Date(offer.timestamp).toLocaleDateString()} {new Date(offer.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="col-span-full py-12 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                  <p className="text-white/20 italic text-sm">No trade history found.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Listing Modal */}
      <AnimatePresence>
        {isListingOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-modal rounded-3xl p-8 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Create Listing</h3>
                <button onClick={() => setIsListingOpen(false)} className="text-white/40 hover:text-white">✕</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest block mb-2 ml-2">Pokémon Name</label>
                  <input 
                    type="text"
                    value={newListing.pokemonName}
                    onChange={(e) => setNewListing({...newListing, pokemonName: e.target.value})}
                    placeholder="e.g. Shiny Charizard"
                    className="w-full glass-input rounded-xl px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest block mb-2 ml-2">Asking Price (🪙)</label>
                  <input 
                    type="number"
                    value={newListing.price}
                    onChange={(e) => setNewListing({...newListing, price: e.target.value})}
                    placeholder="5,000,000"
                    className="w-full glass-input rounded-xl px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest block mb-2 ml-2">Description</label>
                  <textarea 
                    value={newListing.description}
                    onChange={(e) => setNewListing({...newListing, description: e.target.value})}
                    placeholder="Mint condition, ready for battle..."
                    className="w-full glass-input rounded-xl px-4 py-3 text-white h-24"
                  />
                </div>
                <button 
                  onClick={handleCreateListing}
                  className="w-full bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 backdrop-blur-md font-black py-4 rounded-2xl transition-all shadow-xl shadow-purple-900/40 uppercase tracking-widest text-xs mt-4"
                >
                  Post Listing
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Make Offer Modal */}
      <AnimatePresence>
        {isOfferOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-modal rounded-[2.5rem] p-8 w-full max-w-lg overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />
              
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Propose Trade</h3>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Offering on {items.find(i => i.id === isOfferOpen)?.pokemonName}</p>
                </div>
                <button onClick={() => { setIsOfferOpen(null); setSelectedTradePokemon([]); }} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest block mb-2 ml-2">Currency Offer (🪙)</label>
                      <div className="relative">
                        <input 
                          type="number"
                          value={newOffer.amount}
                          onChange={(e) => setNewOffer({...newOffer, amount: e.target.value})}
                          placeholder="0"
                          className="w-full glass-input rounded-2xl px-5 py-4 text-white font-black text-lg focus:ring-2 focus:ring-purple-500/50 transition-all"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 font-black italic uppercase text-[10px]">Credits</div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest block mb-2 ml-2">Message (Optional)</label>
                      <textarea 
                        value={newOffer.message}
                        onChange={(e) => setNewOffer({...newOffer, message: e.target.value})}
                        placeholder="Say something to the seller..."
                        className="w-full glass-input rounded-2xl px-5 py-4 text-white text-xs h-32 resize-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest block mb-2 ml-2">
                      Select Pokémon to Trade ({selectedTradePokemon.length})
                    </label>
                    <div className="h-[280px] overflow-y-auto space-y-2 pr-2 custom-scrollbar bg-black/20 rounded-2xl p-2 border border-white/5">
                      {userCollection.length > 0 ? (
                        userCollection.map((item) => (
                          <div 
                            key={item.id}
                            onClick={() => {
                              setSelectedTradePokemon(prev => 
                                prev.includes(item.id) 
                                  ? prev.filter(id => id !== item.id) 
                                  : [...prev, item.id]
                              );
                            }}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${
                              selectedTradePokemon.includes(item.id) 
                                ? 'bg-purple-600/30 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                                : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                            }`}
                          >
                            <div className="w-12 h-12 bg-black/40 rounded-xl flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-white/20 transition-all">
                              {item.imageUrl ? (
                                <SafeImage src={item.imageUrl} alt={item.name} className="w-10 h-10 object-contain" />
                              ) : (
                                <Star className="w-5 h-5 text-white/10" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-black text-white truncate uppercase italic">{item.name}</p>
                              <p className="text-[8px] text-white/40 font-bold uppercase tracking-widest">Est. Value: 🪙 {item.finalPrice?.toLocaleString()}</p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              selectedTradePokemon.includes(item.id) 
                                ? 'bg-purple-500 border-purple-400' 
                                : 'border-white/10 bg-black/20'
                            }`}>
                              {selectedTradePokemon.includes(item.id) && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-white/5 rounded-xl border border-dashed border-white/10">
                          <ArrowRightLeft className="w-8 h-8 text-white/10 mb-3" />
                          <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">No Pokémon in collection</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => { setIsOfferOpen(null); setSelectedTradePokemon([]); }}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white/40 font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-[10px]"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleMakeOffer(isOfferOpen)}
                    className="flex-[2] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-purple-900/40 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                  >
                    <HandCoins className="w-4 h-4" /> Send Trade Proposal
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Offer Modal */}
      <AnimatePresence>
        {isEditOfferOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-modal rounded-[2.5rem] p-8 w-full max-w-lg overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />

              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Modify Offer</h3>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Update your trade proposal</p>
                </div>
                <button onClick={() => { setIsEditOfferOpen(null); setSelectedTradePokemon([]); }} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest block mb-2 ml-2">Offer Amount (🪙)</label>
                      <div className="relative">
                        <input 
                          type="number"
                          value={editOfferData.amount}
                          onChange={(e) => setEditOfferData({...editOfferData, amount: e.target.value})}
                          placeholder="0"
                          className="w-full glass-input rounded-2xl px-5 py-4 text-white font-black text-lg focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 font-black italic uppercase text-[10px]">Credits</div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest block mb-2 ml-2">Message</label>
                      <textarea 
                        value={editOfferData.message}
                        onChange={(e) => setEditOfferData({...editOfferData, message: e.target.value})}
                        placeholder="Update your message..."
                        className="w-full glass-input rounded-2xl px-5 py-4 text-white text-xs h-32 resize-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest block mb-2 ml-2">
                      Offered Pokémon ({selectedTradePokemon.length})
                    </label>
                    <div className="h-[280px] overflow-y-auto space-y-2 pr-2 custom-scrollbar bg-black/20 rounded-2xl p-2 border border-white/5">
                      {userCollection.length > 0 ? (
                        userCollection.map((item) => (
                          <div 
                            key={item.id}
                            onClick={() => {
                              setSelectedTradePokemon(prev => 
                                prev.includes(item.id) 
                                  ? prev.filter(id => id !== item.id) 
                                  : [...prev, item.id]
                              );
                            }}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${
                              selectedTradePokemon.includes(item.id) 
                                ? 'bg-blue-600/30 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                                : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                            }`}
                          >
                            <div className="w-12 h-12 bg-black/40 rounded-xl flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-white/20 transition-all">
                              {item.imageUrl ? (
                                <SafeImage src={item.imageUrl} alt={item.name} className="w-10 h-10 object-contain" />
                              ) : (
                                <Star className="w-5 h-5 text-white/10" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-black text-white truncate uppercase italic">{item.name}</p>
                              <p className="text-[8px] text-white/40 font-bold uppercase tracking-widest">Est. Value: 🪙 {item.finalPrice?.toLocaleString()}</p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              selectedTradePokemon.includes(item.id) 
                                ? 'bg-blue-500 border-blue-400' 
                                : 'border-white/10 bg-black/20'
                            }`}>
                              {selectedTradePokemon.includes(item.id) && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-white/5 rounded-xl border border-dashed border-white/10">
                          <ArrowRightLeft className="w-8 h-8 text-white/10 mb-3" />
                          <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">No Pokémon in collection</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => { setIsEditOfferOpen(null); setSelectedTradePokemon([]); }}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white/40 font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-[10px]"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleUpdateOffer}
                    className="flex-[2] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-900/40 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Update Proposal
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Negotiation Chat Modal */}
      <AnimatePresence>
        {negotiationOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-modal rounded-3xl p-8 w-full max-w-md flex flex-col max-h-[80vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Trade Negotiation</h3>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                    {offers.find(o => o.id === negotiationOpen)?.offererName}'s Offer
                  </p>
                </div>
                <button onClick={() => setNegotiationOpen(null)} className="text-white/40 hover:text-white">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 scrollbar-thin scrollbar-thumb-white/10">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-1">Current Offer</p>
                      <p className="text-white font-black text-lg">🪙 {offers.find(o => o.id === negotiationOpen)?.offerAmount.toLocaleString()}</p>
                    </div>
                    {offers.find(o => o.id === negotiationOpen)?.offererUid === user?.id && (
                      <button 
                        onClick={() => {
                          const offer = offers.find(o => o.id === negotiationOpen);
                          if (offer) {
                            setIsEditOfferOpen(offer.id);
                            setEditOfferData({ amount: offer.offerAmount.toString(), message: offer.message || '' });
                            setSelectedTradePokemon(offer.offeredPokemonIds || []);
                            setNegotiationOpen(null);
                          }
                        }}
                        className="text-[8px] font-black uppercase bg-purple-600/20 text-purple-400 px-3 py-1.5 rounded-lg border border-purple-500/20 hover:bg-purple-600/40 transition-all"
                      >
                        Modify Offer
                      </button>
                    )}
                  </div>
                  
                  {offeredPokemonDetails.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-2">Offered Pokémon</p>
                      <div className="grid grid-cols-2 gap-2">
                        {offeredPokemonDetails.map(poke => (
                          <div key={poke.id} className="bg-white/5 rounded-lg p-2 border border-white/5 flex items-center gap-2">
                            <div className="w-8 h-8 bg-black/20 rounded flex items-center justify-center overflow-hidden">
                              {poke.imageUrl ? (
                                <SafeImage src={poke.imageUrl} alt={poke.name} className="w-6 h-6 object-contain" />
                              ) : (
                                <Star className="w-3 h-3 text-white/10" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] font-bold text-white truncate uppercase">{poke.name}</p>
                              <p className="text-[7px] text-white/40 font-bold uppercase tracking-tighter">Value: 🪙{poke.finalPrice?.toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-white/60 text-xs italic mt-3">"{offers.find(o => o.id === negotiationOpen)?.message || 'No message provided.'}"</p>
                </div>

                {offers.find(o => o.id === negotiationOpen)?.status === 'countered' && (
                  <div className="bg-blue-500/10 rounded-2xl p-4 border border-blue-500/20">
                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-2">Counter-Offer Received</p>
                    <p className="text-white font-black text-lg">🪙 {offers.find(o => o.id === negotiationOpen)?.counterAmount?.toLocaleString()}</p>
                    {/* Display counter pokemon if any */}
                  </div>
                )}

                {isCountering && (
                  <div className="bg-purple-500/10 rounded-2xl p-4 border border-purple-500/20 space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Propose Counter-Offer</p>
                      <button onClick={() => setIsCountering(false)} className="text-white/40 hover:text-white"><X className="w-3 h-3" /></button>
                    </div>
                    <input 
                      type="number"
                      value={counterAmount}
                      onChange={(e) => setCounterAmount(e.target.value)}
                      placeholder="Counter Amount (🪙)..."
                      className="w-full glass-input rounded-xl px-4 py-2 text-xs text-white"
                    />
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {userCollection.map(item => (
                        <div 
                          key={item.id}
                          onClick={() => setSelectedCounterPokemon(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${selectedCounterPokemon.includes(item.id) ? 'bg-purple-600/20 border-purple-500' : 'bg-white/5 border-white/10'}`}
                        >
                          <div className="w-6 h-6 bg-black/20 rounded flex items-center justify-center overflow-hidden">
                            {item.imageUrl ? <SafeImage src={item.imageUrl} alt={item.name} className="w-4 h-4 object-contain" /> : <Star className="w-2 h-2 text-white/10" />}
                          </div>
                          <span className="text-[9px] font-bold text-white truncate uppercase">{item.name}</span>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => handleUpdateOfferStatus(negotiationOpen!, 'countered')}
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-xl text-[10px] uppercase transition-all"
                    >
                      Send Counter
                    </button>
                  </div>
                )}

                {offers.find(o => o.id === negotiationOpen)?.messages?.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex flex-col ${user && msg.senderUid === user.id ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-xs ${user && msg.senderUid === user.id ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/80'}`}>
                      {msg.text}
                    </div>
                    <span className="text-[8px] text-white/20 font-bold uppercase tracking-widest mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                {offers.find(o => o.id === negotiationOpen)?.sellerUid === user?.id && !isCountering && (
                  <button 
                    onClick={() => setIsCountering(true)}
                    className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-purple-500/20"
                  >
                    Counter
                  </button>
                )}
                <input 
                  type="text"
                  value={negotiationText}
                  onChange={(e) => setNegotiationText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(negotiationOpen)}
                  placeholder="Type a message..."
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-purple-500"
                />
                <button 
                  onClick={() => handleSendMessage(negotiationOpen)}
                  className="bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-xl transition-all"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
