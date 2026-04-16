-- Supabase Schema Setup Script for DreddBotz Auctions
-- Run this script in your Supabase SQL Editor to create the necessary tables and policies.

-- 1. Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "displayName" TEXT,
  "avatarUrl" TEXT,
  "winCount" INTEGER DEFAULT 0,
  "lossCount" INTEGER DEFAULT 0,
  "whatsappName" TEXT,
  notifications JSONB DEFAULT '{"endingSoon": true, "outbid": true, "auctionWon": true}'::jsonb,
  sounds JSONB DEFAULT '{"bids": true, "outbids": true, "sales": true, "countdown": true}'::jsonb,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  "totalSpent" INTEGER DEFAULT 0,
  "tradesCompleted" INTEGER DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  watchlist TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY,
  current_auction JSONB,
  status TEXT
);

-- Insert default rooms
INSERT INTO public.rooms (id, status) VALUES 
('room1', NULL),
('room2', NULL),
('room3', NULL)
ON CONFLICT (id) DO NOTHING;

-- 3. Create user_bids table
CREATE TABLE IF NOT EXISTS public.user_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES public.users(id) ON DELETE CASCADE,
  "bidderName" TEXT,
  amount INTEGER,
  timestamp BIGINT,
  "pokemonName" TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create bid_history table
CREATE TABLE IF NOT EXISTS public.bid_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT REFERENCES public.rooms(id) ON DELETE CASCADE,
  bidder TEXT,
  amount INTEGER,
  uid UUID,
  avatar TEXT,
  timestamp BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room TEXT REFERENCES public.rooms(id) ON DELETE CASCADE,
  "userId" UUID,
  "userName" TEXT,
  "userAvatar" TEXT,
  text TEXT,
  timestamp BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create auction_archives table
CREATE TABLE IF NOT EXISTS public.auction_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  level TEXT,
  hp TEXT,
  atk TEXT,
  def TEXT,
  spd TEXT,
  moves TEXT,
  "gmaxFactor" TEXT,
  "currentPrice" INTEGER,
  "binPrice" INTEGER,
  "endTime" BIGINT,
  winner TEXT,
  "winnerUid" UUID,
  "isSold" BOOLEAN,
  "imageUrl" TEXT,
  duration TEXT,
  timestamp BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create trading_floor table
CREATE TABLE IF NOT EXISTS public.trading_floor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "pokemonName" TEXT,
  "sellerName" TEXT,
  "sellerUid" UUID,
  price INTEGER,
  description TEXT,
  timestamp BIGINT,
  "imageUrl" TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create trade_offers table
CREATE TABLE IF NOT EXISTS public.trade_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "itemId" UUID REFERENCES public.trading_floor(id) ON DELETE CASCADE,
  "offererUid" UUID,
  "offererName" TEXT,
  "sellerUid" UUID,
  "offerAmount" INTEGER,
  message TEXT,
  timestamp BIGINT,
  status TEXT,
  messages JSONB DEFAULT '[]'::jsonb,
  "offeredPokemonIds" TEXT[] DEFAULT '{}',
  "counterAmount" INTEGER,
  "counterPokemonIds" TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_floor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_offers ENABLE ROW LEVEL SECURITY;

-- 10. Create basic policies (Note: These are permissive for development. Restrict in production.)
CREATE POLICY "Allow public read access" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow users to update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow users to insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow public read access" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Allow public update access" ON public.rooms FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON public.user_bids FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.user_bids FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow public update access" ON public.user_bids FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON public.bid_history FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.bid_history FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow public delete access" ON public.bid_history FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.chat_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow public delete access" ON public.chat_messages FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.auction_archives FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.auction_archives FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.auction_archives FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON public.trading_floor FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.trading_floor FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow public delete access" ON public.trading_floor FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.trade_offers FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.trade_offers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow public update access" ON public.trade_offers FOR UPDATE USING (true);

-- 11. Enable Realtime for tables
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bid_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_floor;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_offers;

-- 12. Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- 13. Storage policies
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Anyone can upload an avatar." ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Anyone can update their avatar." ON storage.objects FOR UPDATE USING (bucket_id = 'avatars');
