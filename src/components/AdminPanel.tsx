import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Lock, Zap, History, Heart, Trophy, FileText, Activity, Gavel, Trash2, Archive, Send } from 'lucide-react';

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
  duration: number | string;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthorized: boolean;
  adminPassword: string;
  setAdminPassword: (val: string) => void;
  onAuthorize: () => void;
  form: AuctionData;
  setForm: (val: AuctionData) => void;
  parserText: string;
  setParserText: (val: string) => void;
  onAutoFill: () => void;
  onUpdateAuction: () => void;
  onResetBids: () => void;
  onClearChat: () => void;
  onArchiveAuction: () => void;
  highlightedFields: Set<string>;
  pokemonNameRef: React.RefObject<HTMLInputElement | null>;
  parseBotMessage: (text: string) => any;
  activeRoomId: string;
  setActiveRoomId: (val: string) => void;
}

type AdminTab = 'import' | 'pokemon' | 'auction' | 'actions';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  isAuthorized,
  adminPassword,
  setAdminPassword,
  onAuthorize,
  form,
  setForm,
  parserText,
  setParserText,
  onAutoFill,
  onUpdateAuction,
  onResetBids,
  onClearChat,
  onArchiveAuction,
  highlightedFields,
  pokemonNameRef,
  parseBotMessage,
  activeRoomId,
  setActiveRoomId
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('import');
  const rooms = ['Room 1', 'Room 2', 'Room 3'];

  const tabs = [
    { id: 'import', label: 'Import', icon: FileText, color: 'text-blue-400' },
    { id: 'pokemon', label: 'Pokémon', icon: Activity, color: 'text-purple-400' },
    { id: 'auction', label: 'Auction', icon: Gavel, color: 'text-yellow-400' },
    { id: 'actions', label: 'Actions', icon: Settings, color: 'text-rose-400' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a0a2e]/60 backdrop-blur-2xl"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="glass-modal rounded-3xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <Settings className="text-purple-400" />
                <h2 className="text-2xl font-bold text-white">Admin Control</h2>
              </div>
              <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">✕</button>
            </div>

            {!isAuthorized ? (
              <div className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 w-5 h-5" />
                  <input 
                    type="password" 
                    placeholder="Enter Password" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full glass-input rounded-2xl py-4 pl-12 pr-4 text-white"
                  />
                </div>
                <button 
                  onClick={onAuthorize}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-purple-900/20"
                >
                  Authorize Access
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Sticky Tabs Navigation */}
                <div className="sticky top-0 z-20 bg-[#0a0a2e] -mx-8 px-8 py-4 mb-2 border-b border-white/5">
                  <div className="flex glass-modal p-1 rounded-2xl border border-white/10">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as AdminTab)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          activeTab === tab.id 
                            ? 'bg-white/10 text-white shadow-lg' 
                            : 'text-white/40 hover:text-white/60'
                        }`}
                      >
                        <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? tab.color : 'text-current'}`} />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="min-h-[400px]">
                  <AnimatePresence mode="wait">
                    {activeTab === 'import' && (
                      <motion.div
                        key="import"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                      >
                        <div className="glass-card p-6 rounded-2xl border border-white/10">
                          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-blue-400 mb-4 flex items-center gap-2">
                            <Zap className="w-4 h-4" /> Data Import
                          </h3>
                          <textarea 
                            placeholder="Paste bot message here..."
                            value={parserText}
                            onChange={(e) => setParserText(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 h-48 focus:outline-none focus:border-purple-500 transition-colors mb-4 font-mono text-sm text-white resize-none"
                          />
                          <button 
                            onClick={onAutoFill}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 mb-4 shadow-lg shadow-blue-900/20"
                          >
                            <span>🪄 Auto-Fill & Scroll</span>
                          </button>

                          {/* Live Parser Preview */}
                          {parserText && (
                            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                              <div className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-3">Detected Details</div>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(parseBotMessage(parserText) || {}).map(([key, value]) => value && (
                                  <div key={key} className="flex items-center gap-2 bg-white/5 px-2 py-1.5 rounded-lg border border-white/5">
                                    <span className="text-[8px] font-bold text-blue-400 uppercase">{key}:</span>
                                    <span className="text-[10px] font-bold text-white truncate">{value as string}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'pokemon' && (
                      <motion.div
                        key="pokemon"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                      >
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-purple-400 mb-4 flex items-center gap-2">
                            <History className="w-4 h-4" /> Pokémon Identity
                          </h3>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-white/40 ml-2">Pokémon Name</label>
                                <input 
                                  ref={pokemonNameRef as any}
                                  type="text" 
                                  value={form.name}
                                  onChange={(e) => setForm({...form, name: e.target.value})}
                                  className={`w-full glass-input rounded-xl p-3 text-white ${highlightedFields.has('name') ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : ''}`}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-white/40 ml-2">Level</label>
                                <input 
                                  type="text" 
                                  value={form.level}
                                  onChange={(e) => setForm({...form, level: e.target.value})}
                                  className={`w-full glass-input rounded-xl p-3 text-white ${highlightedFields.has('level') ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : ''}`}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-white/40 ml-2">G-Max Factor</label>
                                <input 
                                  type="text" 
                                  value={form.gmaxFactor}
                                  onChange={(e) => setForm({...form, gmaxFactor: e.target.value})}
                                  className={`w-full glass-input rounded-xl p-3 text-white ${highlightedFields.has('gmaxFactor') ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : ''}`}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-white/40 ml-2">Image URL (Optional Override)</label>
                                <input 
                                  type="text" 
                                  value={form.imageUrl || ''}
                                  onChange={(e) => setForm({...form, imageUrl: e.target.value})}
                                  placeholder="Leave blank for auto-fetch"
                                  className={`w-full glass-input rounded-xl p-3 text-white ${highlightedFields.has('imageUrl') ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : ''}`}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] uppercase font-bold text-white/40 ml-2">Moves</label>
                              <textarea 
                                value={form.moves}
                                onChange={(e) => setForm({...form, moves: e.target.value})}
                                className={`w-full glass-input rounded-xl p-3 h-20 text-white resize-none ${highlightedFields.has('moves') ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : ''}`}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-rose-400 mb-4 flex items-center gap-2">
                            <Heart className="w-4 h-4" /> Battle Statistics
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] uppercase font-bold text-white/40 ml-2">HP</label>
                              <input 
                                type="text" 
                                value={form.hp}
                                onChange={(e) => setForm({...form, hp: e.target.value})}
                                className={`w-full bg-black/40 border rounded-xl p-3 focus:outline-none transition-all text-white ${highlightedFields.has('hp') ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-white/10 focus:border-purple-500'}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] uppercase font-bold text-white/40 ml-2">Atk</label>
                              <input 
                                type="text" 
                                value={form.atk}
                                onChange={(e) => setForm({...form, atk: e.target.value})}
                                className={`w-full bg-black/40 border rounded-xl p-3 focus:outline-none transition-all text-white ${highlightedFields.has('atk') ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-white/10 focus:border-purple-500'}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] uppercase font-bold text-white/40 ml-2">Def</label>
                              <input 
                                type="text" 
                                value={form.def}
                                onChange={(e) => setForm({...form, def: e.target.value})}
                                className={`w-full bg-black/40 border rounded-xl p-3 focus:outline-none transition-all text-white ${highlightedFields.has('def') ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-white/10 focus:border-purple-500'}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] uppercase font-bold text-white/40 ml-2">Spd</label>
                              <input 
                                type="text" 
                                value={form.spd}
                                onChange={(e) => setForm({...form, spd: e.target.value})}
                                className={`w-full bg-black/40 border rounded-xl p-3 focus:outline-none transition-all text-white ${highlightedFields.has('spd') ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-white/10 focus:border-purple-500'}`}
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'auction' && (
                      <motion.div
                        key="auction"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                      >
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-purple-400 mb-4 flex items-center gap-2">
                            <Zap className="w-4 h-4" /> Room Selection
                          </h3>
                          <div className="flex gap-2">
                            {rooms.map((room) => (
                              <button
                                key={room}
                                onClick={() => setActiveRoomId(room)}
                                className={`flex-1 py-4 rounded-xl font-bold text-xs transition-all border ${
                                  activeRoomId === room 
                                    ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/20' 
                                    : 'bg-black/40 border-white/10 text-white/40 hover:border-white/20'
                                }`}
                              >
                                {room}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-yellow-400 mb-4 flex items-center gap-2">
                            <Trophy className="w-4 h-4" /> Auction Settings
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] uppercase font-bold text-white/40 ml-2">Starting Price</label>
                              <input 
                                type="number" 
                                value={form.currentPrice}
                                onChange={(e) => setForm({...form, currentPrice: parseInt(e.target.value) || ''})}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-purple-500 text-white"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] uppercase font-bold text-white/40 ml-2">BIN Price</label>
                              <input 
                                type="number" 
                                value={form.binPrice}
                                onChange={(e) => setForm({...form, binPrice: parseInt(e.target.value) || ''})}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-purple-500 text-white"
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <label className="text-[10px] uppercase font-bold text-white/40 ml-2">Auction Duration (Min)</label>
                              <input 
                                type="number" 
                                value={form.duration}
                                onChange={(e) => setForm({...form, duration: e.target.value === '' ? '' : parseInt(e.target.value) || 0})}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-purple-500 text-white"
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'actions' && (
                      <motion.div
                        key="actions"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <button 
                            onClick={onUpdateAuction}
                            className="bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-widest py-6 rounded-2xl transition-all shadow-lg shadow-green-900/20 flex flex-col items-center gap-2"
                          >
                            <Send className="w-6 h-6" />
                            <span>Update Auction</span>
                          </button>
                          <button 
                            onClick={onArchiveAuction}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest py-6 rounded-2xl transition-all shadow-lg shadow-purple-900/20 flex flex-col items-center gap-2"
                          >
                            <Archive className="w-6 h-6" />
                            <span>Archive Auction</span>
                          </button>
                          <button 
                            onClick={onResetBids}
                            className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest py-6 rounded-2xl transition-all shadow-lg shadow-red-900/20 flex flex-col items-center gap-2"
                          >
                            <Trash2 className="w-6 h-6" />
                            <span>Reset Bids</span>
                          </button>
                          <button 
                            onClick={onClearChat}
                            className="bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest py-6 rounded-2xl transition-all shadow-lg shadow-orange-900/20 flex flex-col items-center gap-2"
                          >
                            <Trash2 className="w-6 h-6" />
                            <span>Clear Chat</span>
                          </button>
                        </div>

                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 mt-4">
                          <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] text-center">
                            Warning: Actions in this section are permanent and affect the live database.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
