import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserCircle, Camera, Award, XCircle, History, Bell, Volume2, Shield, Star, Zap, BarChart3, Settings, Activity } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { SafeImage } from './SafeImage';

type TabType = 'stats' | 'settings' | 'activity';

interface NotificationSettings {
  endingSoon: boolean;
  outbid: boolean;
  auctionWon: boolean;
}

interface SoundSettings {
  bids: boolean;
  outbids: boolean;
  sales: boolean;
  countdown: boolean;
}

interface UserProfile {
  uid: string;
  displayName: string;
  avatarUrl: string;
  winCount: number;
  lossCount: number;
  whatsappName: string;
  notifications?: NotificationSettings;
  sounds?: SoundSettings;
  level?: number;
  xp?: number;
  badges?: string[];
  watchlist?: string[];
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  profile: UserProfile | null;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onUploadAvatar: (file: File) => Promise<void>;
  userBids: any[];
  isUploading: boolean;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  profile,
  setProfile,
  onUpdateProfile,
  onUploadAvatar,
  userBids,
  isUploading
}) => {
  const [activeTab, setActiveTab] = React.useState<TabType>('stats');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await onUploadAvatar(file);
      } catch (error) {
        console.error('Avatar upload failed:', error);
      }
    }
  };

  const level = profile?.level || 1;
  const xp = profile?.xp || 0;
  const nextLevelXp = level * 1000;
  const xpProgress = (xp / nextLevelXp) * 100;

  // Calculate stats for radar chart
  const totalBids = userBids.length;
  const winRate = profile?.winCount ? Math.min(100, (profile.winCount / (profile.winCount + (profile.lossCount || 0))) * 100) : 0;
  const activity = Math.min(100, (totalBids / 50) * 100); // Normalize to 100
  const wealth = Math.min(100, ((profile?.winCount || 0) * 10)); // Just a proxy for wealth

  const radarData = [
    { subject: 'Aggression', A: Math.min(100, totalBids * 2), fullMark: 100 },
    { subject: 'Success', A: winRate, fullMark: 100 },
    { subject: 'Activity', A: activity, fullMark: 100 },
    { subject: 'Wealth', A: wealth, fullMark: 100 },
    { subject: 'Experience', A: Math.min(100, level * 10), fullMark: 100 },
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
            className="glass-modal rounded-3xl p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <div className="flex items-center gap-2 sm:gap-3">
                <UserCircle className="text-purple-400 w-5 h-5 sm:w-6 sm:h-6" />
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tighter">Trainer Profile</h2>
              </div>
              <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-2">✕</button>
            </div>

            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 p-6 glass-card rounded-3xl">
              <div className="relative group">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-purple-500/30 shadow-2xl relative">
                  {profile?.avatarUrl ? (
                    <SafeImage src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-3xl sm:text-4xl font-bold text-white">
                      {(user?.user_metadata?.full_name || 'Anonymous').substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 bg-purple-600 p-1.5 sm:p-2 rounded-full shadow-lg hover:bg-purple-500 transition-colors disabled:opacity-50"
                >
                  <Camera className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </button>
              </div>
              <div className="text-center sm:text-left flex-1">
                <h3 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tighter mb-1">
                  {profile?.displayName}
                </h3>
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">{user?.email}</p>
                
                {/* Level & XP */}
                <div className="max-w-xs">
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="text-purple-400 w-4 h-4" />
                      <span className="text-white text-xs font-black uppercase tracking-widest">Level {level}</span>
                    </div>
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{xp} / {nextLevelXp} XP</span>
                  </div>
                  <div className="h-1.5 glass-input rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${xpProgress}%` }}
                      className="h-full bg-gradient-to-r from-purple-600 to-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center gap-2 mb-8 p-1 glass-input rounded-2xl">
              {[
                { id: 'stats', label: 'Stats', icon: BarChart3 },
                { id: 'settings', label: 'Settings', icon: Settings },
                { id: 'activity', label: 'Activity', icon: Activity },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    activeTab === tab.id 
                      ? 'bg-purple-600 text-white shadow-lg' 
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              <AnimatePresence mode="wait">
                {activeTab === 'stats' && (
                  <motion.div
                    key="stats-tab"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="glass-card p-6 rounded-3xl flex flex-col items-center text-center">
                        <Award className="text-yellow-500 w-8 h-8 mb-3" />
                        <span className="text-3xl font-black text-white italic">{profile?.winCount || 0}</span>
                        <span className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em]">Wins</span>
                      </div>
                      <div className="glass-card p-6 rounded-3xl flex flex-col items-center text-center">
                        <XCircle className="text-red-500 w-8 h-8 mb-3" />
                        <span className="text-3xl font-black text-white italic">{profile?.lossCount || 0}</span>
                        <span className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em]">Losses</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="glass-card p-6 rounded-3xl">
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-4 block">Performance Radar</span>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                              <PolarGrid stroke="rgba(255,255,255,0.1)" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: 'bold' }} />
                              <Radar name="Trainer" dataKey="A" stroke="#a855f7" fill="#a855f7" fillOpacity={0.4} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="glass-card p-6 rounded-3xl flex flex-col justify-center">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3">
                          <span>Win Rate</span>
                          <span className="text-white">
                            {profile && (profile.winCount + profile.lossCount) > 0 
                              ? Math.round((profile.winCount / (profile.winCount + profile.lossCount)) * 100) 
                              : 0}%
                          </span>
                        </div>
                        <div className="h-3 w-full glass-input rounded-full overflow-hidden flex">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ 
                              width: `${profile && (profile.winCount + profile.lossCount) > 0 
                                ? (profile.winCount / (profile.winCount + profile.lossCount)) * 100 
                                : 0}%` 
                            }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                          />
                        </div>
                        <p className="mt-4 text-[10px] text-white/30 font-medium leading-relaxed">
                          Your win rate is calculated based on your total successful claims versus failed bids in the DreddBotz arena.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'settings' && (
                  <motion.div
                    key="settings-tab"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-[10px] text-white/30 font-bold uppercase tracking-widest flex items-center gap-2">
                          <UserCircle className="w-3 h-3 text-purple-400" /> Identity
                        </h4>
                        <div className="space-y-4">
                          <div>
                            <label className="text-[10px] text-white/30 font-bold uppercase tracking-widest block mb-2">Display Name</label>
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                value={profile?.displayName || ''}
                                onChange={(e) => setProfile(prev => prev ? { ...prev, displayName: e.target.value } : null)}
                                className="flex-1 glass-input rounded-xl px-4 py-2 text-sm text-white font-bold"
                              />
                              <button 
                                onClick={() => onUpdateProfile({ displayName: profile?.displayName })}
                                className="bg-purple-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tighter hover:bg-purple-500 transition-colors text-white"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-white/30 font-bold uppercase tracking-widest block mb-2">WhatsApp Name</label>
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                value={profile?.whatsappName || ''}
                                onChange={(e) => setProfile(prev => prev ? { ...prev, whatsappName: e.target.value } : null)}
                                className="flex-1 glass-input rounded-xl px-4 py-2 text-sm text-white font-bold"
                              />
                              <button 
                                onClick={() => onUpdateProfile({ whatsappName: profile?.whatsappName })}
                                className="bg-purple-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tighter hover:bg-purple-500 transition-colors text-white"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[10px] text-white/30 font-bold uppercase tracking-widest flex items-center gap-2">
                          <Volume2 className="w-3 h-3 text-purple-400" /> Audio
                        </h4>
                        <div className="bg-black/20 rounded-2xl p-4 border border-white/5 space-y-3">
                          {[
                            { key: 'bids', label: 'Bid Sounds', sample: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3' },
                            { key: 'outbids', label: 'Outbid Sounds', sample: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3' },
                            { key: 'sales', label: 'Auction Sold Sounds', sample: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3' },
                            { key: 'countdown', label: 'Final Countdown Ticking', sample: 'https://www.myinstants.com/media/sounds/clock-ticking-2.mp3' }
                          ].map((pref) => (
                            <div key={pref.key} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-white/80 font-bold">{pref.label}</span>
                                <button 
                                  onClick={() => {
                                    const audio = new Audio(pref.sample);
                                    audio.volume = 0.5;
                                    audio.play().catch(() => {});
                                  }}
                                  className="p-1 hover:text-purple-400 text-white/20 transition-colors"
                                >
                                  <Volume2 className="w-3 h-3" />
                                </button>
                              </div>
                              <button
                                onClick={() => {
                                  const current = profile?.sounds || { bids: true, outbids: true, sales: true, countdown: true };
                                  const updated = { ...current, [pref.key]: !current[pref.key as keyof SoundSettings] };
                                  onUpdateProfile({ sounds: updated });
                                }}
                                className={`w-8 h-4 rounded-full relative transition-colors ${
                                  profile?.sounds?.[pref.key as keyof SoundSettings] !== false ? 'bg-purple-600' : 'bg-white/10'
                                }`}
                              >
                                <motion.div
                                  animate={{ x: profile?.sounds?.[pref.key as keyof SoundSettings] !== false ? 16 : 2 }}
                                  className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/30 font-bold uppercase tracking-widest flex items-center gap-2">
                        <Bell className="w-3 h-3 text-purple-400" /> Notifications
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { key: 'endingSoon', label: 'Ending Soon' },
                          { key: 'outbid', label: 'Outbid Alert' },
                          { key: 'auctionWon', label: 'Victory Alert' }
                        ].map((pref) => (
                          <div key={pref.key} className="bg-black/20 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                            <span className="text-xs text-white/80 font-bold">{pref.label}</span>
                            <button
                              onClick={() => {
                                const current = profile?.notifications || { endingSoon: true, outbid: true, auctionWon: true };
                                const updated = { ...current, [pref.key]: !current[pref.key as keyof NotificationSettings] };
                                onUpdateProfile({ notifications: updated });
                              }}
                              className={`w-8 h-4 rounded-full relative transition-colors ${
                                profile?.notifications?.[pref.key as keyof NotificationSettings] !== false ? 'bg-purple-600' : 'bg-white/10'
                              }`}
                            >
                              <motion.div
                                animate={{ x: profile?.notifications?.[pref.key as keyof NotificationSettings] !== false ? 16 : 2 }}
                                className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'activity' && (
                  <motion.div
                    key="activity-tab"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[10px] text-white/30 font-bold uppercase tracking-widest flex items-center gap-2">
                        <History className="w-3 h-3 text-purple-400" /> Recent Bids
                      </h4>
                      <span className="text-[10px] text-white/20 font-bold uppercase">{userBids.length} Total</span>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {userBids.length > 0 ? (
                        userBids.map((bid, index) => (
                          <motion.div 
                            key={bid.id} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-purple-500/30 transition-colors"
                          >
                            <div className="flex flex-col">
                              <span className="text-white font-black text-sm uppercase italic tracking-tight group-hover:text-purple-400 transition-colors">{bid.pokemonName}</span>
                              <span className="text-white/20 text-[10px] font-bold uppercase tracking-tighter">{new Date(bid.timestamp).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                                bid.status === 'won' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                                bid.status === 'lost' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              }`}>
                                {bid.status}
                              </span>
                              <span className="text-yellow-500 font-black text-sm flex items-center gap-1">
                                <span className="text-xs">🪙</span>{bid.amount.toLocaleString()}
                              </span>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center bg-white/5 rounded-3xl border border-white/5 border-dashed">
                          <Activity className="w-12 h-12 text-white/10 mb-4" />
                          <p className="text-white/20 text-sm font-bold uppercase tracking-widest italic">No arena activity recorded yet.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
