/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrainerCollection } from './components/TrainerCollection';
import { Toaster, toast } from 'sonner';
import { DreddBotzLogo } from './components/Logo';
import { Skeleton } from './components/Skeleton';
import { AuctionHeader } from './components/AuctionHeader';
import { PokemonCard } from './components/PokemonCard';
import { BiddingSection } from './components/BiddingSection';
import { BidHistory } from './components/BidHistory';
import { Leaderboard } from './components/Leaderboard';
import { AdminPanel } from './components/AdminPanel';
import { ProfileModal } from './components/ProfileModal';
import { BINConfirmModal } from './components/BINConfirmModal';
import { LiveChat } from './components/LiveChat';
import { TradingFloor } from './components/TradingFloor';
import { AuctionArchives } from './components/AuctionArchives';
import { SideMenu } from './components/SideMenu';
import SupabaseTodos from './components/SupabaseTodos';
import { LayoutGrid, Volume2, VolumeX } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { User } from '@supabase/supabase-js';

// Import initialized Supabase service
import { supabase, handleSupabaseError, OperationType, isSupabaseConfigured } from './supabase';

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
  totalSpent?: number;
  tradesCompleted?: number;
  badges?: string[];
  watchlist?: string[];
}

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

interface BidEntry {
  id: string;
  bidder: string;
  amount: number;
  timestamp: number;
  uid: string;
  avatar?: string;
}

export default function App() {
  const [auction, setAuction] = useState<AuctionData>({
    name: 'Awaiting Signal...',
    level: '',
    hp: '',
    atk: '',
    def: '',
    spd: '',
    moves: 'None',
    gmaxFactor: 'No',
    currentPrice: '',
    binPrice: '',
    endTime: 0,
    winner: 'None',
    isSold: false
  });
  const isAuctionActive = auction.name !== 'Awaiting Signal...' && auction.name !== 'Loading...';
  
  const [timeLeft, setTimeLeft] = useState('00:00:00');
  
  let auctionStatus = 'Waiting';
  if (isAuctionActive) {
    if (auction.isSold) {
      auctionStatus = 'Sold';
    } else if (timeLeft === '00:00:00') {
      auctionStatus = 'Ended';
    } else {
      auctionStatus = 'Live';
    }
  }

  const [bidHistory, setBidHistory] = useState<BidEntry[]>([]);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<'auction' | 'trading' | 'collection' | 'archives' | 'leaderboard'>('auction');
  const [roomsStatus, setRoomsStatus] = useState<Record<string, string | null>>({});
  const [parserText, setParserText] = useState('');
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());
  const [isBINConfirmOpen, setIsBINConfirmOpen] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [isBidding, setIsBidding] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [activeRoomId, setActiveRoomId] = useState('Room 1');
  const [onlineCount, setOnlineCount] = useState(0);
  
  useEffect(() => {
    // Handle OAuth popup callback
    if (window.opener && (window.location.hash || window.location.search)) {
      console.log('Popup detected OAuth callback, waiting for session...');
      
      // Check immediately
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          console.log('Session found immediately in popup, notifying opener');
          window.opener.postMessage({ 
            type: 'OAUTH_AUTH_SUCCESS',
            session: {
              access_token: session.access_token,
              refresh_token: session.refresh_token
            }
          }, '*');
          setTimeout(() => window.close(), 100);
        }
      });

      // Also listen for changes in case it takes a moment to process the URL
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          console.log('Session found via auth change in popup, notifying opener');
          window.opener.postMessage({ 
            type: 'OAUTH_AUTH_SUCCESS',
            session: {
              access_token: session.access_token,
              refresh_token: session.refresh_token
            }
          }, '*');
          setTimeout(() => window.close(), 100);
        }
      });

      // Fallback: if nothing happens after 3 seconds, just close it and let the main window try
      const timeout = setTimeout(() => {
        console.log('Timeout waiting for session in popup, notifying opener anyway');
        window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
        window.close();
      }, 3000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timeout);
      };
    }
  }, []);

  useEffect(() => {
    console.log('Online count state updated:', onlineCount);
  }, [onlineCount]);
  const rooms = ['Room 1', 'Room 2', 'Room 3'];
  const socketRef = useRef<Socket | null>(null);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isEndingSoon, setIsEndingSoon] = useState(false);
  const [isFinalCountdown, setIsFinalCountdown] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [userBids, setUserBids] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const processedAuctionRef = useRef<string | null>(null);
  const hasPlayedSound = useRef(false);
  const hasNotifiedEndingSoon = useRef(false);
  const hasNotifiedGlobalEnd = useRef<string | null>(null);

  // Audio Refs
  const bidSound = useRef<HTMLAudioElement | null>(null);
  const outbidSound = useRef<HTMLAudioElement | null>(null);
  const soldSound = useRef<HTMLAudioElement | null>(null);
  const warningSound = useRef<HTMLAudioElement | null>(null);
  const tickingSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    bidSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
    outbidSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3');
    soldSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3');
    warningSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3');
    tickingSound.current = new Audio('https://www.myinstants.com/media/sounds/clock-ticking-2.mp3');
    if (tickingSound.current) tickingSound.current.loop = true;
  }, []);

  const playSound = (sound: React.RefObject<HTMLAudioElement | null>, type?: keyof SoundSettings) => {
    if (!isSoundEnabled || !sound.current) return;
    
    // Check individual sound preferences if user is logged in
    if (profile?.sounds && type) {
      if (profile.sounds[type] === false) return;
    }

    sound.current.currentTime = 0;
    sound.current.play().catch(() => {});
  };

  // Supabase Realtime Listeners (Vercel Compatible)
  useEffect(() => {
    const roomPath = activeRoomId.toLowerCase().replace(' ', '');
    
    const fetchInitialData = async () => {
      const roomPath = activeRoomId.toLowerCase().replace(' ', '');
      
      // Fetch current auction from rooms table
      const { data: roomData } = await supabase
        .from('rooms')
        .select('current_auction')
        .eq('id', roomPath)
        .single();
      
      if (roomData?.current_auction) {
        setAuction(roomData.current_auction);
      } else {
        setAuction({
          name: 'Awaiting Signal...',
          level: '',
          hp: '',
          atk: '',
          def: '',
          spd: '',
          moves: 'None',
          gmaxFactor: 'No',
          currentPrice: '',
          binPrice: '',
          endTime: 0,
          winner: 'None',
          isSold: false
        });
      }

      // Fetch bid history from bid_history table
      const { data: bidsData } = await supabase
        .from('bid_history')
        .select('*')
        .eq('room_id', roomPath)
        .order('timestamp', { ascending: false })
        .limit(50);
      
      setBidHistory(bidsData || []);

      // Fetch rooms status
      const { data: statusData } = await supabase
        .from('rooms')
        .select('id, status');
      
      if (statusData) {
        const statusMap: Record<string, string | null> = {};
        statusData.forEach(s => statusMap[s.id] = s.status);
        setRoomsStatus(statusMap);
      }
    };

    fetchInitialData();

    const channel = supabase
      .channel(`room_${roomPath}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomPath}` }, () => {
        fetchInitialData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bid_history', filter: `room_id=eq.${roomPath}` }, () => {
        fetchInitialData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        fetchInitialData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoomId]);

  // Socket.io is kept for local dev/preview, but core features are now handled by Supabase Realtime for Vercel compatibility
  useEffect(() => {
    const socket = io(window.location.origin, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket.io] Connected to server:', socket.id);
      socket.emit('join_room', activeRoomId);
      if (userRef.current) {
        socket.emit('user_connected', userRef.current.id);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Timer & Sound Logic
  useEffect(() => {
    // Global Error Listeners
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('Global Error:', event.error);
      // Let ErrorBoundary handle fatal errors, but toast non-fatal ones
      if (event.error?.message?.includes('network') || event.error?.message?.includes('Supabase')) {
        toast.error('Connection Issue', { description: 'A network or database error occurred. Retrying...' });
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault(); // Prevent default browser logging
      const reason = event.reason;
      let message = 'An unexpected error occurred.';
      
      if (reason instanceof Error) {
        message = reason.message;
        try {
          // Check if it's a JSON string from handleSupabaseError
          const errInfo = JSON.parse(reason.message);
          if (errInfo.error) {
            message = errInfo.error;
          }
        } catch (e) {
          // Not JSON, use message as is
        }
      } else if (typeof reason === 'string' && reason.trim() !== '') {
        message = reason;
      } else if (reason && typeof reason === 'object' && reason.message) {
        message = reason.message;
      }

      if (message.toLowerCase().includes('permission')) {
        toast.error('Access Denied', { description: 'You do not have permission to perform this action.' });
      } else {
        // Only toast if it's not a common/expected error
        if (!message.includes('popup-closed-by-user') && !message.includes('cancelled-popup-request') && message !== 'An unexpected error occurred.') {
          toast.error('Application Error', { description: message });
        }
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Auth State Listener
  useEffect(() => {
    if (socketRef.current && socketRef.current.connected) {
      if (user) {
        console.log('[Socket.io] User logged in, emitting user_connected:', user.id);
        socketRef.current.emit('user_connected', user.id);
        socketRef.current.emit('request_online_count');
      } else {
        console.log('[Socket.io] User logged out, emitting user_disconnected');
        socketRef.current.emit('user_disconnected');
        socketRef.current.emit('request_online_count');
      }
    }
  }, [user]);

  // Supabase Auth State Listener
  useEffect(() => {
    // Explicitly check session on mount to handle OAuth redirects reliably
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session on mount:', error);
        // If refresh token is invalid, sign out to clear local state
        if (error.message.includes('Refresh Token Not Found') || error.message.includes('Invalid Refresh Token')) {
          supabase.auth.signOut().catch(console.error);
        }
      }
      const currentUser = session?.user || null;
      setUser(currentUser as any);
      setIsAuthLoading(false);
      
      if (currentUser) {
        fetchProfile(currentUser.id).catch(err => {
          console.error('Initial profile fetch failed:', err);
        });
        fetchUserBids(currentUser.id).catch(err => {
          console.error('Initial user bids fetch failed:', err);
        });
      }
    }).catch(err => {
      console.error('Unexpected error during getSession:', err);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setUserBids([]);
        return;
      }
      
      const currentUser = session?.user || null;
      setUser(currentUser as any);
      setIsAuthLoading(false);
      
      if (currentUser) {
        fetchProfile(currentUser.id).catch(err => {
          console.error('Profile fetch failed on auth change:', err);
        });
        fetchUserBids(currentUser.id).catch(err => {
          console.error('User bids fetch failed on auth change:', err);
        });
      } else {
        setProfile(null);
        setUserBids([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Leaderboard Listener
  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('winCount', { ascending: false })
        .limit(10);
      
      if (error) {
        // Only log error if it's not a permission error for guests
        if (error.code !== '42501') {
          console.error('Error fetching leaderboard:', error);
        }
        return;
      }
      
      if (data) {
        setLeaderboard(data.map(d => ({ uid: d.id, ...d })) as UserProfile[]);
      }
    };

    fetchLeaderboard();
    
    const channel = supabase
      .channel('leaderboard_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchLeaderboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProfile = async (uid: string) => {
    const path = `users/${uid}`;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .single();

      if (data) {
        setProfile({ uid, ...data } as UserProfile);
      } else if (error && error.code === 'PGRST116') {
        // Create initial profile
        const newProfile = {
          id: uid,
          displayName: user?.user_metadata?.full_name || 'DreddBotz Trainer',
          avatarUrl: user?.user_metadata?.avatar_url || '',
          winCount: 0,
          lossCount: 0,
          whatsappName: '',
          notifications: {
            endingSoon: true,
            outbid: true,
            auctionWon: true
          }
        };
        const { error: insertError } = await supabase.from('users').insert([newProfile]);
        if (insertError) throw insertError;
        setProfile({ uid, ...newProfile } as any);
      } else if (error) {
        throw error;
      }
    } catch (error) {
      handleSupabaseError(error, OperationType.GET, path);
    }
  };

  // User Bids Listener
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel(`user_bids_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_bids', filter: `userId=eq.${user.id}` }, () => {
        fetchUserBids(user.id).catch(console.error);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const fetchUserBids = async (uid: string) => {
    const path = `user_bids`;
    try {
      const { data, error } = await supabase
        .from('user_bids')
        .select('*')
        .eq('userId', uid)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setUserBids(data);
    } catch (error) {
      handleSupabaseError(error, OperationType.LIST, path);
    }
  };

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        console.log('OAuth login successful from popup');
        
        // If the popup sent us the session data directly, use it
        if (event.data.session) {
          console.log('Received session directly from popup message:', event.data.session);
          try {
            const { data, error } = await supabase.auth.setSession(event.data.session);
            if (error) {
              console.error('Error setting session from popup message:', error);
            } else if (data.session) {
              console.log('Session successfully set from popup message');
              const currentUser = data.session.user;
              setUser(currentUser as any);
              setIsAuthLoading(false);
              fetchProfile(currentUser.id).catch(console.error);
              fetchUserBids(currentUser.id).catch(console.error);
              toast.success('Logged in successfully');
              return;
            }
          } catch (err) {
            console.error('Unexpected error during setSession:', err);
          }
        }

        // Force a session refresh to pick up the new session from localStorage
        // Add more retries and longer delays to ensure localStorage is synced across windows
        let retries = 10;
        const checkSession = async () => {
          try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
              console.error('Error getting session after popup:', error);
              if (error.message.includes('Refresh Token Not Found') || error.message.includes('Invalid Refresh Token')) {
                supabase.auth.signOut().catch(console.error);
              }
            }
            if (session) {
              const currentUser = session.user;
              setUser(currentUser as any);
              setIsAuthLoading(false);
              fetchProfile(currentUser.id).catch(console.error);
              fetchUserBids(currentUser.id).catch(console.error);
              toast.success('Logged in successfully');
            } else if (retries > 0) {
              retries--;
              console.log(`Session not found yet, retrying... (${retries} left)`);
              // Exponential backoff or just consistent polling
              setTimeout(checkSession, 500);
            } else {
              console.error('Failed to get session after multiple retries.');
              toast.error('Login failed to sync. Please refresh the page.');
            }
          } catch (err) {
            console.error('Unexpected error in handleMessage getSession:', err);
          }
        };
        
        // Start checking after a short delay
        setTimeout(checkSession, 300);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleLogin = async () => {
    if (!isSupabaseConfigured) {
      toast.error('Supabase Not Configured', {
        description: 'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.'
      });
      return;
    }

    if (!navigator.onLine) {
      toast.error('Network Error', {
        description: 'Please check your internet connection and try again.'
      });
      return;
    }

    try {
      const isIframe = window.self !== window.top;
      // Use origin with trailing slash to match Supabase wildcard config (e.g. https://domain.com/*)
      const redirectUrl = `${window.location.origin}/`;
      console.log('Initiating login with redirectUrl:', redirectUrl);

      if (!isIframe) {
        // Standard redirect flow for Vercel/standalone
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            queryParams: {
              prompt: 'select_account',
            },
          }
        });
        if (error) throw error;
        return;
      }

      // Popup flow for iframe (AI Studio)
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      // Open popup BEFORE await to prevent popup blockers on Safari/Mobile
      let authWindow = window.open(
        '',
        'supabase_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            prompt: 'select_account',
          },
        }
      });
      
      if (error) {
        if (authWindow) authWindow.close();
        throw error;
      }
      
      if (data?.url) {
        if (authWindow) {
          authWindow.location.href = data.url;
        } else {
          // Fallback for mobile/Safari where the initial popup was blocked
          // We create a temporary link and simulate a click, or show a toast with an action
          toast('Popup Blocked', {
            description: 'Please click here to open the login window.',
            action: {
              label: 'Login',
              onClick: () => {
                authWindow = window.open(data.url, 'supabase_oauth_popup', `width=${width},height=${height},left=${left},top=${top}`);
                startPolling(authWindow);
              }
            },
            duration: 10000,
          });
          return; // Exit early, polling will be started by the toast action
        }
        
        startPolling(authWindow);
      } else if (authWindow) {
        authWindow.close();
      }
      
      function startPolling(win: Window | null) {
        if (!win) return;
        // Fallback: poll to see if the popup was closed manually or finished
        const pollTimer = setInterval(async () => {
          if (win.closed) {
            clearInterval(pollTimer);
            console.log('Popup closed, checking session as fallback...');
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              const currentUser = session.user;
              setUser(currentUser as any);
              setIsAuthLoading(false);
              fetchProfile(currentUser.id).catch(console.error);
              fetchUserBids(currentUser.id).catch(console.error);
            }
          }
        }, 500);
      }
    } catch (error: any) {
      console.error('Login Error:', error);
      toast.error('Login failed', {
        description: error.message || 'Please try again.'
      });
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logged out successfully!');
    } catch (error) {
      toast.error('Logout failed.');
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    if (!navigator.onLine) {
      toast.error('Network Error', { description: 'Cannot update profile while offline.' });
      return;
    }
    const path = `users/${user.id}`;
    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);
      
      if (error) throw error;
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Profile updated!');
    } catch (error: any) {
      handleSupabaseError(error, OperationType.UPDATE, path);
    }
  };

  const handleUploadAvatar = async (file: File) => {
    if (!user) return;
    
    // Basic validation
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', { description: 'Please upload an image file.' });
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast.error('File too large', { description: 'Please upload an image smaller than 2MB.' });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await updateProfile({ avatarUrl: publicUrl });
      toast.success('Avatar Uploaded', { description: 'Your new profile picture is live!' });
    } catch (error: any) {
      console.error('Upload Error:', error);
      toast.error('Upload Failed', { description: error.message || 'Could not upload your avatar.' });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Admin Form State
  const [form, setForm] = useState<AuctionData>({
    name: '',
    level: '',
    hp: '',
    atk: '',
    def: '',
    spd: '',
    moves: '',
    gmaxFactor: 'No',
    currentPrice: '',
    binPrice: '',
    endTime: 0,
    winner: 'None',
    isSold: false,
    duration: ''
  });

  const pokemonNameRef = useRef<HTMLInputElement>(null);

  // Process Win/Loss Stats when auction ends
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success('Connection Restored', { description: 'You are back online.' });
    };
    const handleOffline = () => {
      setIsOffline(true);
      toast.error('Connection Lost', { description: 'You are offline. Some features may be unavailable.', duration: Infinity });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!user || !auction.isSold || !auction.name || auction.name === 'Loading...' || auction.name === 'Awaiting Signal...') return;
    
    // Use a combination of name and endTime as a unique key for the auction
    const auctionKey = `${auction.name}-${auction.endTime}`;
    if (processedAuctionRef.current === auctionKey) return;

    const processStats = async () => {
      try {
        const { data: bids, error: bidsError } = await supabase
          .from('user_bids')
          .select('*')
          .eq('userId', user.id)
          .eq('pokemonName', auction.name)
          .eq('status', 'active');
        
        if (bidsError || !bids || bids.length === 0) {
          processedAuctionRef.current = auctionKey;
          return;
        }

        const isWinner = user.id === auction.winnerUid;
        
        // Update bids status
        const { error: updateBidsError } = await supabase
          .from('user_bids')
          .update({ status: isWinner ? 'won' : 'lost' })
          .eq('userId', user.id)
          .eq('pokemonName', auction.name)
          .eq('status', 'active');

        if (updateBidsError) throw updateBidsError;

        // Update user stats
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('winCount, lossCount')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        const { error: updateProfileError } = await supabase
          .from('users')
          .update({
            winCount: (profileData.winCount || 0) + (isWinner ? 1 : 0),
            lossCount: (profileData.lossCount || 0) + (isWinner ? 0 : 1)
          })
          .eq('id', user.id);

        if (updateProfileError) throw updateProfileError;

        processedAuctionRef.current = auctionKey;
      } catch (error) {
        console.error('Error processing auction stats:', error);
      }
    };

    processStats().catch(err => {
      console.error('processStats failed:', err);
    });
  }, [auction.isSold, auction.name, auction.endTime, user?.id]);

  // Supabase Presence for Online Counter
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('online_users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
            displayName: user?.user_metadata?.full_name || 'Anonymous',
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Timer & Sound Logic
  useEffect(() => {
    const updateTimer = () => {
      if (auction.isSold || !auction.endTime || auction.endTime <= 0) {
        setTimeLeft('00:00:00');
        setIsEndingSoon(false);
        return;
      }

      const now = Date.now();
      const diff = auction.endTime - now;

      if (diff <= 0) {
        setTimeLeft('00:00:00');
        setIsEndingSoon(false);
        setIsFinalCountdown(false);
        if (tickingSound.current) tickingSound.current.pause();
        
        // Auto-sell when timer hits 0
        if (!auction.isSold && isAuctionActive) {
          const autoSell = async () => {
            const roomPath = activeRoomId.toLowerCase().replace(' ', '');
            
            // Fetch latest auction state first
            const { data: roomData } = await supabase
              .from('rooms')
              .select('current_auction')
              .eq('id', roomPath)
              .single();
            
            if (roomData?.current_auction && !roomData.current_auction.isSold) {
              const updatedAuction = {
                ...roomData.current_auction,
                isSold: true
              };
              
              const { error } = await supabase
                .from('rooms')
                .update({ current_auction: updatedAuction })
                .eq('id', roomPath);
              
              if (error) console.error('Auto-sell failed:', error);
            }
          };
          autoSell();
        }
      } else {
        setIsEndingSoon(diff <= 300000); // 5 minutes
        setIsFinalCountdown(diff <= 10000); // 10 seconds
        
        if (diff <= 10000 && !auction.isSold && isAuctionActive) {
          const isCountdownEnabled = profile?.sounds?.countdown !== false;
          if (tickingSound.current && tickingSound.current.paused && isSoundEnabled && isCountdownEnabled) {
            tickingSound.current.play().catch(() => {});
          } else if (tickingSound.current && !tickingSound.current.paused && (!isSoundEnabled || !isCountdownEnabled)) {
            tickingSound.current.pause();
          }
        } else {
          if (tickingSound.current) tickingSound.current.pause();
        }

        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        setTimeLeft(`${h}:${m}:${s}`);
      }
    };

    // Update immediately
    updateTimer();

    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [auction.endTime, auction.isSold, auction.name, isAuctionActive]);

  // Browser Notifications Helper
  const sendBrowserNotification = (title: string, options?: NotificationOptions) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        ...options
      });
    }
  };

  // Handle Ending Soon Notification
  useEffect(() => {
    if (isEndingSoon && !hasNotifiedEndingSoon.current && !auction.isSold && auction.name !== 'Loading...') {
      if (profile?.notifications?.endingSoon !== false) {
        toast.warning('Auction Ending Soon!', {
          description: 'Less than 5 minutes remaining. Place your final bids now!',
          duration: 10000,
        });
        playSound(warningSound);
        sendBrowserNotification('Auction Ending Soon!', {
          body: `Less than 5 minutes remaining for ${auction.name}. Place your final bids now!`,
          tag: 'ending-soon'
        });
      }
      hasNotifiedEndingSoon.current = true;
    }
    if (!isEndingSoon) {
      hasNotifiedEndingSoon.current = false;
    }
  }, [isEndingSoon, auction.isSold, auction.name, profile?.notifications?.endingSoon]);

  // Global Auction End Notification
  useEffect(() => {
    if (auction.isSold && auction.name && auction.name !== 'Loading...' && auction.name !== 'Awaiting Signal...') {
      const auctionKey = `${auction.name}-${auction.endTime}`;
      if (hasNotifiedGlobalEnd.current !== auctionKey) {
        hasNotifiedGlobalEnd.current = auctionKey;

        const isWinner = user && auction.winnerUid === user.id;
        const priceStr = typeof auction.currentPrice === 'number' ? auction.currentPrice.toLocaleString() : auction.currentPrice;
        
        playSound(soldSound, 'sales');

        if (isWinner) {
          if (profile?.notifications?.auctionWon !== false) {
            toast.success('🎉 Auction Won!', {
              description: `You won the ${auction.name} auction for 🪙${priceStr}!`,
              duration: 30000,
              action: { label: 'Dismiss', onClick: () => {} }
            });
            sendBrowserNotification('🎉 Auction Won!', {
              body: `You won the ${auction.name} auction for 🪙${priceStr}!`,
              tag: 'auction-won'
            });
          }
        } else {
          const winnerName = auction.winner || 'Someone';
          toast.info('🛑 Auction Ended', {
            description: `${winnerName} won ${auction.name} for 🪙${priceStr}!`,
            duration: 30000,
            action: { label: 'Dismiss', onClick: () => {} }
          });
        }
      }
    }
  }, [auction.isSold, auction.name, auction.endTime, auction.winner, auction.currentPrice, auction.winnerUid, user, profile?.notifications?.auctionWon]);

  // Handle Outbid Notification
  const lastHighBidderUidRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user || !bidHistory.length) return;
    
    const latestBid = bidHistory[0];
    const latestBidderUid = latestBid.uid;
    
    if (lastHighBidderUidRef.current === user.id && latestBidderUid !== user.id) {
      if (profile?.notifications?.outbid !== false) {
        toast.error('You were Outbid!', {
          description: `${latestBid.bidder} placed a higher bid of 🪙${latestBid.amount.toLocaleString()}!`,
          duration: 10000,
        });
        playSound(outbidSound, 'outbids');
        sendBrowserNotification('You were Outbid!', {
          body: `${latestBid.bidder} placed a higher bid of 🪙${latestBid.amount.toLocaleString()}!`,
          tag: 'outbid'
        });
      }
    }
    lastHighBidderUidRef.current = latestBidderUid;
  }, [bidHistory, user, profile?.notifications?.outbid]);

  // Handle Sounds
  useEffect(() => {
    if (auction.isSold && !hasPlayedSound.current) {
      const isWinner = user && auction.winnerUid === user.id;
      const soundUrl = isWinner 
        ? 'https://www.myinstants.com/media/sounds/victory-mario-series-hq.mp3'
        : 'https://www.myinstants.com/media/sounds/gavel-knock.mp3';
      
      const audio = new Audio(soundUrl);
      audio.play().catch(e => console.error('Audio play failed:', e));
      hasPlayedSound.current = true;
    }
    if (!auction.isSold) {
      hasPlayedSound.current = false;
    }
  }, [auction.isSold, auction.winner, user, auction.winnerUid]);

  // Listen to currentAuction (Moved to WebSockets)
  // Listen to bidHistory (Moved to WebSockets)

  const [pokemonImageUrl, setPokemonImageUrl] = useState<string>('');
  const [isImageLoading, setIsImageLoading] = useState(false);

  // Fetch Pokémon Image from PokéAPI or use custom imageUrl
  useEffect(() => {
    if (auction.imageUrl) {
      setPokemonImageUrl(auction.imageUrl);
      setIsImageLoading(false);
      return;
    }

    if (auction.name && auction.name !== 'Loading...' && auction.name !== 'Awaiting Signal...') {
      setIsImageLoading(true);
      const fetchPokemon = async () => {
        try {
          const name = auction.name.toLowerCase()
            .replace('♀', '-f')
            .replace('♂', '-m')
            .replace(/\./g, '')
            .replace(/'/g, '')
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .trim();
          
          const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
          if (response.ok) {
            const data = await response.json();
            setPokemonImageUrl(data.sprites.other['official-artwork'].front_default || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png');
          } else {
            // Try a secondary source if PokéAPI fails (e.g. for newer Pokemon or different naming)
            setPokemonImageUrl(`https://img.pokemondb.net/artwork/large/${name}.jpg`);
          }
        } catch (error) {
          setPokemonImageUrl('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'); 
        } finally {
          setIsImageLoading(false);
        }
      };
      fetchPokemon();
    } else {
      setPokemonImageUrl('');
      setIsImageLoading(false);
    }
  }, [auction.name, auction.imageUrl]);

  const handlePlaceBid = async () => {
    setBidError(null);

    if (!user) {
      setBidError('Please log in to place a bid');
      toast.error('Authentication Required', {
        description: 'Please log in to place a bid.'
      });
      return;
    }

    if (!navigator.onLine) {
      setBidError('No internet connection');
      toast.error('Network Error', {
        description: 'Please check your internet connection and try again.'
      });
      return;
    }

    if (auction.isSold) {
      setBidError('Auction has already ended');
      toast.error('Auction Ended', {
        description: 'This Pokémon has already been sold.'
      });
      return;
    }

    if (!bidAmount) {
      setBidError('Please enter a bid amount');
      return;
    }

    const amount = parseInt(bidAmount);
    const currentPrice = typeof auction.currentPrice === 'number' ? auction.currentPrice : 0;
    const binPrice = typeof auction.binPrice === 'number' ? auction.binPrice : 0;
    const minIncrement = 1000000;

    if (isNaN(amount) || amount <= 0) {
      setBidError('Please enter a valid positive number');
      setBidAmount('');
      return;
    }

    if (amount < currentPrice + minIncrement) {
      setBidError(`Bid must be at least 🪙${(currentPrice + minIncrement).toLocaleString()} (Min. increment 1M)`);
      setBidAmount('');
      toast.error('Invalid Bid', {
        description: `Bids must be at least 1,000,000 higher than the current price.`
      });
      return;
    }

    if (binPrice > 0 && amount >= binPrice) {
      setBidError(`Bid is equal to or higher than BIN price. Use the Buy It Now button instead.`);
      setBidAmount('');
      toast.error('Use Buy It Now', {
        description: `Your bid is equal to or higher than the BIN price of 🪙${binPrice.toLocaleString()}. Please use the Buy It Now button.`
      });
      return;
    }

    setIsBidding(true);
    try {
      const bidderName = profile?.whatsappName || profile?.displayName || user.user_metadata?.full_name || 'Anonymous Trainer';
      
      const newBid = {
        bidder: bidderName,
        amount: amount,
        uid: user.id,
        avatar: profile?.avatarUrl || user.user_metadata?.avatar_url || '',
        timestamp: Date.now()
      };

      const roomPath = activeRoomId.toLowerCase().replace(' ', '');
      
      // Update current auction in Supabase
      const { data: auctionData, error: auctionError } = await supabase
        .from('rooms')
        .select('current_auction')
        .eq('id', roomPath)
        .single();
      
      if (auctionError) throw auctionError;
      
      const currentAuction = auctionData.current_auction;
      if (currentAuction.isSold) throw new Error('Auction already sold');
      if (amount < (currentAuction.currentPrice || 0) + 1000000) throw new Error('Bid too low');

      const updatedAuction = {
        ...currentAuction,
        currentPrice: amount,
        winner: bidderName,
        winnerUid: user.id
      };

      const { error: updateError } = await supabase
        .from('rooms')
        .update({ current_auction: updatedAuction })
        .eq('id', roomPath);
      
      if (updateError) throw updateError;

      // Add to bid history in Supabase
      const { error: bidHistoryError } = await supabase
        .from('bid_history')
        .insert([{
          room_id: roomPath,
          bidder: bidderName,
          amount: amount,
          uid: user.id,
          avatar: profile?.avatarUrl || user.user_metadata?.avatar_url || '',
          timestamp: Date.now()
        }]);
      
      if (bidHistoryError) throw bidHistoryError;

      // Update User Bid History (for persistence)
      const { error: userBidError } = await supabase
        .from('user_bids')
        .insert([{
          userId: user.id,
          bidderName: bidderName,
          amount: amount,
          timestamp: Date.now(),
          pokemonName: auction.name,
          status: 'active'
        }]);
      
      if (userBidError) throw userBidError;

      // Award XP for placing a bid (10 XP)
      if (profile) {
        const currentXp = profile.xp || 0;
        const currentLevel = profile.level || 1;
        const newXp = currentXp + 10;
        const nextLevelXp = currentLevel * 1000;
        
        const updates: any = { xp: newXp };
        if (newXp >= nextLevelXp) {
          updates.level = currentLevel + 1;
          updates.xp = newXp - nextLevelXp;
          toast.success('Level Up!', { description: `You reached Trainer Level ${updates.level}!` });
        }
        
        const { error: profileError } = await supabase
          .from('users')
          .update(updates)
          .eq('id', user.id);
        
        if (profileError) throw profileError;
        setProfile({ ...profile, ...updates });
      }

      // Notify via socket for real-time updates
      socketRef.current?.emit('place_bid', { roomId: activeRoomId, bid: newBid });

      setBidAmount('');
      toast.success('Bid Placed!', {
        description: `Successfully placed a bid of 🪙${amount.toLocaleString()} for ${auction.name}.`
      });
    } catch (error: any) {
      console.error('Error placing bid:', error);
      setBidAmount('');
      
      if (error.code === 'PERMISSION_DENIED' || error.status === 403) {
        setBidError('Your account does not have permission to place this bid.');
        handleSupabaseError(error, OperationType.WRITE, `user_bids`);
      } else {
        setBidError(error.message || 'An unexpected error occurred. Please try placing your bid again.');
        toast.error('Submission Failed', { description: error.message || 'An unexpected error occurred while placing your bid. Please try again.' });
      }
    } finally {
      setIsBidding(false);
    }
  };

  const handleBuyItNow = async () => {
    if (!user) {
      toast.error('Authentication Required', {
        description: 'Please log in to buy this Pokémon.'
      });
      return;
    }

    if (!navigator.onLine) {
      toast.error('Network Error', {
        description: 'Please check your internet connection.'
      });
      return;
    }

    if (auction.isSold) {
      toast.error('Auction Ended', {
        description: 'This item is already sold.'
      });
      return;
    }

    const binPrice = typeof auction.binPrice === 'number' ? auction.binPrice : 0;
    if (!binPrice || binPrice <= 0) return;

    setIsBINConfirmOpen(true);
  };

  const confirmBuyItNow = async () => {
    if (!user) return;
    const binPrice = typeof auction.binPrice === 'number' ? auction.binPrice : 0;
    
    setIsBidding(true);
    setIsBINConfirmOpen(false);
    try {
      const bidderName = profile?.whatsappName || profile?.displayName || user.user_metadata?.full_name || 'Anonymous Trainer';
      const roomPath = activeRoomId.toLowerCase().replace(' ', '');
      
      // Update current auction in Supabase
      const { data: auctionData, error: auctionError } = await supabase
        .from('rooms')
        .select('current_auction')
        .eq('id', roomPath)
        .single();
      
      if (auctionError) throw auctionError;
      
      const currentAuction = auctionData.current_auction;
      if (currentAuction.isSold) {
        toast.error('Purchase Failed', { description: 'The item was already sold.' });
        setIsBidding(false);
        return;
      }

      const updatedAuction = {
        ...currentAuction,
        currentPrice: binPrice,
        winner: bidderName,
        winnerUid: user.id,
        isSold: true
      };

      const { error: updateError } = await supabase
        .from('rooms')
        .update({ current_auction: updatedAuction })
        .eq('id', roomPath);
      
      if (updateError) throw updateError;

      // Add confetti for BIN purchase
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#EAB308', '#FDE047', '#FFFFFF']
      });

      const newBid = {
        bidder: bidderName,
        amount: binPrice,
        timestamp: Date.now(),
        uid: user.id,
        isBIN: true,
        avatar: profile?.avatarUrl || user.user_metadata?.avatar_url || ''
      };

      // Add to bid history in Supabase
      const { error: bidHistoryError } = await supabase
        .from('bid_history')
        .insert([{
          room_id: roomPath,
          bidder: bidderName,
          amount: binPrice,
          uid: user.id,
          avatar: profile?.avatarUrl || user.user_metadata?.avatar_url || '',
          timestamp: Date.now(),
          is_bin: true
        }]);
      
      if (bidHistoryError) throw bidHistoryError;

      // Update User Bid History & Stats
      const { error: userBidError } = await supabase
        .from('user_bids')
        .insert([{
          userId: user.id,
          bidderName: bidderName,
          amount: binPrice,
          timestamp: Date.now(),
          pokemonName: auction.name,
          status: 'won'
        }]);
      
      if (userBidError) throw userBidError;

      // Award XP for winning an auction via BIN (100 XP)
      if (profile) {
        const currentXp = profile.xp || 0;
        const currentLevel = profile.level || 1;
        const newXp = currentXp + 100;
        const nextLevelXp = currentLevel * 1000;
        
        const updates: any = { xp: newXp, winCount: (profile.winCount || 0) + 1 };
        if (newXp >= nextLevelXp) {
          updates.level = currentLevel + 1;
          updates.xp = newXp - nextLevelXp;
          setTimeout(() => {
            toast.success('Level Up!', { description: `You reached Trainer Level ${updates.level}!` });
          }, 1000);
        }
        
        const { error: profileError } = await supabase
          .from('users')
          .update(updates)
          .eq('id', user.id);
        
        if (profileError) throw profileError;
        setProfile({ ...profile, ...updates });
      }

      // Mark all active bids for this pokemon as won for this user
      const { error: batchError } = await supabase
        .from('user_bids')
        .update({ status: 'won' })
        .eq('userId', user.id)
        .eq('pokemonName', auction.name)
        .eq('status', 'active');
      
      if (batchError) throw batchError;
      
      processedAuctionRef.current = `${auction.name}-${auction.endTime}`;

      // Notify via socket
      socketRef.current?.emit('place_bid', { roomId: activeRoomId, bid: newBid });

      toast.success('Purchase Successful!', {
        description: `Congratulations! You've bought ${auction.name} for 🪙${binPrice.toLocaleString()}.`
      });
    } catch (error: any) {
      console.error('BIN Error:', error);
      toast.error('Purchase Failed', { description: error.message || 'An unexpected error occurred during the transaction. Please try again.' });
    } finally {
      setIsBidding(false);
    }
  };

  const handleAdminLogin = () => {
    if (adminPassword === 'dredd123') {
      setIsAuthorized(true);
      toast.success('Admin access granted');
    } else {
      toast.error('Incorrect Password');
    }
  };

  const handleUpdateAuction = async () => {
    if (!form.duration || isNaN(Number(form.duration))) {
      toast.error('Invalid Duration', { description: 'Please set a valid auction duration in minutes.' });
      return;
    }

    try {
      const now = Date.now();
      const durationMs = Number(form.duration) * 60 * 1000;
      const updatedForm = {
        ...form,
        endTime: now + durationMs,
        isSold: false,
        winner: 'None',
        winnerUid: ''
      };
      
      const roomPath = activeRoomId.toLowerCase().replace(' ', '');
      
      // Update current auction in Supabase
      const { error: auctionError } = await supabase
        .from('rooms')
        .update({ current_auction: updatedForm })
        .eq('id', roomPath);
      
      if (auctionError) throw auctionError;

      // Clear bid history for this room in Supabase
      const { error: bidHistoryError } = await supabase
        .from('bid_history')
        .delete()
        .eq('room_id', roomPath);
      
      if (bidHistoryError) throw bidHistoryError;

      // Clear chat messages for this room in Supabase
      const { error: chatError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('room', roomPath);
      
      if (chatError) throw chatError;

      // Update room status
      const { error: statusError } = await supabase
        .from('rooms')
        .update({ status: updatedForm.name })
        .eq('id', roomPath);
      
      if (statusError) throw statusError;

      // Notify via socket
      socketRef.current?.emit('update_auction', { roomId: activeRoomId, auction: updatedForm });

      toast.success('Auction Updated', { description: `The auction for ${form.name} has started in ${activeRoomId} with a ${form.duration} minute timer.` });
    } catch (error: any) {
      console.error('Update Auction Error:', error);
      toast.error('Update Failed', { description: error.message || 'Could not update the auction. Please check your connection.' });
    }
  };

  const parseBotMessage = (text: string) => {
    if (!text.trim()) return null;

    const nameMatch = text.match(/\*Name:\*\s*(.*)/i) || text.match(/Level\s+\d+\s+(.*)/i) || text.match(/^(.*)\s+Level\s+\d+/i) || text.match(/A wild (.*) appeared!/i) || text.match(/Name:\s*(.*)/i);
    const levelMatch = text.match(/\*Level:\*\s*(\d+)/i) || text.match(/Level\s+(\d+)/i) || text.match(/Lvl\s*(\d+)/i);
    const hpMatch = text.match(/\*HP:\*\s*(\d+)/i) || text.match(/HP:\s*(\d+)/i) || text.match(/HP\s*(\d+)/i);
    const atkMatch = text.match(/\*Attack:\*\s*(\d+)/i) || text.match(/Atk:\s*(\d+)/i) || text.match(/Attack\s*(\d+)/i);
    const defMatch = text.match(/\*Defense:\*\s*(\d+)/i) || text.match(/Def:\s*(\d+)/i) || text.match(/Defense\s*(\d+)/i);
    const spdMatch = text.match(/\*Speed:\*\s*(\d+)/i) || text.match(/Spd:\s*(\d+)/i) || text.match(/Speed\s*(\d+)/i);
    const movesMatch = text.match(/\*Moves:\*\s*([\s\S]*?)(?=\n\n|\n\*|$)/i) || text.match(/Moves:\s*(.*)/i);
    const gmaxMatch = text.match(/\*Gigantamax Factor:\*\s*(.*)/i) || text.match(/Gigantamax Factor:\s*(.*)/i) || text.match(/G-Max:\s*(.*)/i);
    const priceMatch = text.match(/Price:\s*\$?(\d+,?\d*)/i) || text.match(/Starting at\s*\$?(\d+,?\d*)/i) || text.match(/Start:\s*\$?(\d+,?\d*)/i);
    const binPriceMatch = text.match(/Buy It Now:\s*\$?(\d+,?\d*)/i) || text.match(/BIN:\s*\$?(\d+,?\d*)/i);
    const imageMatch = text.match(/Image:\s*(https?:\/\/\S+)/i) || text.match(/Pic:\s*(https?:\/\/\S+)/i) || text.match(/URL:\s*(https?:\/\/\S+)/i);

    return {
      name: nameMatch ? nameMatch[1].trim() : null,
      level: levelMatch ? levelMatch[1] : null,
      hp: hpMatch ? hpMatch[1] : null,
      atk: atkMatch ? atkMatch[1] : null,
      def: defMatch ? defMatch[1] : null,
      spd: spdMatch ? spdMatch[1] : null,
      moves: movesMatch ? movesMatch[1].trim() : null,
      gmaxFactor: gmaxMatch ? gmaxMatch[1].trim() : null,
      currentPrice: priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : null,
      binPrice: binPriceMatch ? parseInt(binPriceMatch[1].replace(/,/g, '')) : null,
      imageUrl: imageMatch ? imageMatch[1].trim() : null,
    };
  };

  const handleAutoFill = () => {
    const parsed = parseBotMessage(parserText);
    if (!parsed) return;

    const newFields = new Set<string>();
    const updatedForm = { ...form };

    Object.entries(parsed).forEach(([key, value]) => {
      if (value !== null) {
        (updatedForm as any)[key] = value;
        newFields.add(key);
      }
    });

    setForm(updatedForm);
    setHighlightedFields(newFields);
    setParserText('');

    // Clear highlights after 3 seconds
    setTimeout(() => setHighlightedFields(new Set()), 3000);

    // Only scroll when this button is clicked
    pokemonNameRef.current?.scrollIntoView({ behavior: 'smooth' });
    toast.success('Bot message parsed successfully!');
  };

  const handleResetBids = async () => {
    try {
      const roomPath = activeRoomId.toLowerCase().replace(' ', '');
      
      // Clear bid history in Supabase
      const { error: bidHistoryError } = await supabase
        .from('bid_history')
        .delete()
        .eq('room_id', roomPath);
      
      if (bidHistoryError) throw bidHistoryError;

      // Reset current auction in Supabase
      const newEndTime = 0;
      const updatedAuction: AuctionData = {
        ...auction,
        currentPrice: '',
        winner: 'None',
        isSold: false,
        endTime: newEndTime
      };
      
      const { error: auctionError } = await supabase
        .from('rooms')
        .update({ current_auction: updatedAuction })
        .eq('id', roomPath);
      
      if (auctionError) throw auctionError;

      setForm(updatedAuction);
      
      // Notify via socket
      socketRef.current?.emit('reset_bids', activeRoomId);
      
      toast.success('Reset Successful', { description: 'Bid history and timer have been cleared.' });
    } catch (error: any) {
      console.error('Reset Bids Error:', error);
      toast.error('Reset Failed', { description: error.message || 'Could not reset the auction. Please check your connection.' });
    }
  };

  const handleArchiveAuction = async () => {
    if (!auction.winnerUid || auction.winner === 'None') {
      toast.error('No Winner', { description: 'Cannot archive an auction without a winner.' });
      return;
    }

    try {
      const archiveData = {
        name: auction.name,
        level: auction.level,
        hp: auction.hp,
        atk: auction.atk,
        def: auction.def,
        spd: auction.spd,
        moves: auction.moves,
        gmaxFactor: auction.gmaxFactor,
        finalPrice: Number(auction.currentPrice),
        winner: auction.winner,
        winnerUid: auction.winnerUid,
        timestamp: Date.now(),
        imageUrl: pokemonImageUrl || '',
        roomId: activeRoomId
      };

      const { error: archiveError } = await supabase
        .from('auction_archives')
        .insert([archiveData]);
      
      if (archiveError) throw archiveError;
      
      const roomPath = activeRoomId.toLowerCase().replace(' ', '');
      
      // Clear current auction in Supabase
      const { error: auctionError } = await supabase
        .from('rooms')
        .update({ current_auction: null, status: null })
        .eq('id', roomPath);
      
      if (auctionError) throw auctionError;

      // Clear bid history in Supabase
      const { error: bidHistoryError } = await supabase
        .from('bid_history')
        .delete()
        .eq('room_id', roomPath);
      
      if (bidHistoryError) throw bidHistoryError;

      // Notify via socket
      socketRef.current?.emit('archive_auction', { roomId: activeRoomId, archive: archiveData });

      toast.success('Auction Archived', { description: `${auction.name} has been moved to archives.` });
    } catch (error: any) {
      console.error('Archive Error:', error);
      handleSupabaseError(error, OperationType.CREATE, 'auction_archives');
    }
  };

  const handleClearChat = async () => {
    try {
      const roomPath = activeRoomId.toLowerCase().replace(' ', '');
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('room', roomPath);
      
      if (error) throw error;
      
      // Notify via socket
      socketRef.current?.emit('clear_chat', activeRoomId);
      
      toast.success('Chat Cleared');
    } catch (error: any) {
      console.error('Clear Chat Error:', error);
      toast.error('Failed to clear chat');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a2e] text-white font-sans selection:bg-purple-500 selection:text-white overflow-x-hidden">
      <AnimatePresence mode="wait">
        {isAuthLoading ? (
          <motion.div
            key="loading-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#0a0a2e] flex flex-col items-center justify-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
              <DreddBotzLogo isActive={true} isSold={false} />
            </div>
            <div className="mt-12 flex flex-col items-center gap-4">
              <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="w-full h-full bg-gradient-to-r from-transparent via-purple-500 to-transparent"
                />
              </div>
              <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
                Initializing DreddBotz System...
              </span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AuctionHeader 
        user={user}
        profile={profile}
        isAuthLoading={isAuthLoading}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenMenu={() => setIsMenuOpen(true)}
        activeRoomId={activeRoomId}
        setActiveRoomId={setActiveRoomId}
        isSoundEnabled={isSoundEnabled}
        setIsSoundEnabled={setIsSoundEnabled}
        auctionStatus={auctionStatus}
      />

      <SideMenu 
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        roomsStatus={roomsStatus}
        activeRoomId={activeRoomId}
        setActiveRoomId={(id) => {
          setActiveRoomId(id);
          setActiveView('auction');
        }}
        activeView={activeView}
        setActiveView={setActiveView}
        onlineCount={onlineCount}
      />

      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-500/80 text-white text-center py-2 px-4 font-bold text-sm shadow-xl backdrop-blur-2xl flex items-center justify-center gap-2 z-50 relative border-b border-red-400/50"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            You are currently offline. Live updates and bidding are paused.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <AnimatePresence>
          {isFinalCountdown && !auction.isSold && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-red-900/20 z-0 animate-pulse"
            />
          )}
        </AnimatePresence>
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {activeView === 'auction' && (
            <motion.div
              key="auction-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* 1. Top Container: Pulsing Logo */}
              <div className="flex justify-center mb-8 h-28 sm:h-32">
                <AnimatePresence>
                  {(isAuctionActive && pokemonImageUrl) && (
                    <motion.div
                      layoutId="main-logo"
                      transition={{ type: "spring", stiffness: 100, damping: 15 }}
                      className="relative"
                    >
                      <DreddBotzLogo isActive={isAuctionActive} isSold={auction.isSold} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <PokemonCard 
                auction={auction}
                isAuctionActive={isAuctionActive}
                pokemonImageUrl={pokemonImageUrl}
                isImageLoading={isImageLoading}
                timeLeft={timeLeft}
                isEndingSoon={isEndingSoon}
                user={user}
                onBuyItNow={handleBuyItNow}
                isWatchlisted={profile?.watchlist?.includes(auction.name)}
                onToggleWatchlist={() => {
                  if (!profile) return;
                  const currentWatchlist = profile.watchlist || [];
                  const isWatchlisted = currentWatchlist.includes(auction.name);
                  const updatedWatchlist = isWatchlisted 
                    ? currentWatchlist.filter(name => name !== auction.name)
                    : [...currentWatchlist, auction.name];
                  updateProfile({ watchlist: updatedWatchlist });
                  toast.success(isWatchlisted ? 'Removed from Watchlist' : 'Added to Watchlist');
                }}
              />

              {isAuctionActive && (
                <BiddingSection 
                  currentPrice={auction.currentPrice}
                  winner={auction.winner}
                  winnerUid={auction.winnerUid}
                  userId={user?.id}
                  bidAmount={bidAmount}
                  setBidAmount={(val) => {
                    setBidAmount(val);
                    if (bidError) setBidError(null);
                  }}
                  onPlaceBid={handlePlaceBid}
                  isBidding={isBidding}
                  error={bidError}
                  isFinalCountdown={isFinalCountdown}
                />
              )}

              <LiveChat isAuctionActive={isAuctionActive} user={user} activeRoomId={activeRoomId} socket={socketRef.current} />
              
              <BidHistory bidHistory={bidHistory} />
            </motion.div>
          )}

          {activeView === 'leaderboard' && (
            <motion.div
              key="leaderboard-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Leaderboard leaderboard={leaderboard} />
            </motion.div>
          )}

          {activeView === 'trading' && (
            <motion.div
              key="trading-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <TradingFloor user={user} profile={profile} />
            </motion.div>
          )}

          {activeView === 'collection' && (
            <motion.div
              key="collection-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <TrainerCollection user={user} />
            </motion.div>
          )}

          {activeView === 'archives' && (
            <motion.div
              key="archives-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <AuctionArchives user={user} />
            </motion.div>
          )}
        </AnimatePresence>

        <Toaster position="bottom-center" richColors expand={false} />

        {/* 6. Hidden Admin Panel Trigger & Community Link */}
        <div className="mt-24 flex flex-col items-center gap-4 opacity-20 hover:opacity-100 transition-opacity">
          <a 
            href="https://chat.whatsapp.com/BAfBWraYjOHCYTD1Mlpoab?mode=gi_t"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] hover:text-green-400 transition-colors flex items-center gap-2"
          >
            Join the DreddBotz Community
          </a>
          <button 
            onClick={() => setIsAdminOpen(true)}
            className="text-white/20 font-black tracking-[0.5em] text-xs hover:text-purple-400 transition-colors cursor-pointer"
          >
            𝐃𝐑𝐄𝐃𝐃ＢＯＴＺ
          </button>
        </div>
      </main>

      <ProfileModal 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        profile={profile}
        setProfile={setProfile}
        onUpdateProfile={updateProfile}
        onUploadAvatar={handleUploadAvatar}
        userBids={userBids}
        isUploading={isUploading}
      />

      <BINConfirmModal 
        isOpen={isBINConfirmOpen}
        onClose={() => setIsBINConfirmOpen(false)}
        onConfirm={confirmBuyItNow}
        auction={auction}
      />

      <AdminPanel 
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        isAuthorized={isAuthorized}
        adminPassword={adminPassword}
        setAdminPassword={setAdminPassword}
        onAuthorize={handleAdminLogin}
        form={form}
        setForm={setForm}
        parserText={parserText}
        setParserText={setParserText}
        onAutoFill={handleAutoFill}
        onUpdateAuction={handleUpdateAuction}
        onArchiveAuction={handleArchiveAuction}
        onResetBids={async () => {
          const roomPath = activeRoomId.toLowerCase().replace(' ', '');
          const { error } = await supabase
            .from('bid_history')
            .delete()
            .eq('room_id', roomPath);
          
          if (error) {
            toast.error('Reset Failed', { description: error.message });
            return;
          }
          
          socketRef.current?.emit('reset_bids', activeRoomId);
          toast.success('Bids Reset', { description: `Bid history for ${activeRoomId} has been cleared.` });
        }}
        onClearChat={async () => {
          const roomPath = activeRoomId.toLowerCase().replace(' ', '');
          const { error } = await supabase
            .from('chat_messages')
            .delete()
            .eq('room', roomPath);
          
          if (error) {
            toast.error('Clear Failed', { description: error.message });
            return;
          }
          
          socketRef.current?.emit('clear_chat', activeRoomId);
          toast.success('Chat Cleared', { description: `Live chat for ${activeRoomId} has been cleared.` });
        }}
        highlightedFields={highlightedFields}
        pokemonNameRef={pokemonNameRef}
        parseBotMessage={parseBotMessage}
        activeRoomId={activeRoomId}
        setActiveRoomId={setActiveRoomId}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.5);
        }
      `}</style>
    </div>
  );
}
