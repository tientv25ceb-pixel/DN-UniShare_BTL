-- ============================================================
-- ĐN-UniShare Web — Database Schema
-- Chạy toàn bộ script trong Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  faculty TEXT NOT NULL DEFAULT 'Khác',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  rating_avg DECIMAL(2,1) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Items (status gồm pending/rejected cho admin duyệt)
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('sach', 'do-hoc-tap', 'do-ktx', 'suatan', 'tailieu', 'khac')),
  condition TEXT NOT NULL CHECK (condition IN ('moi', 'tot', 'kha', 'cu')),
  exchange_type TEXT NOT NULL DEFAULT 'mienphi' CHECK (exchange_type IN ('mienphi', 'traodoi', 'sale', 'lost')),
  image TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL,
  posted_by TEXT NOT NULL,
  poster_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  poster_faculty TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'reserved', 'completed', 'cancelled', 'rejected')),
  rejection_reason TEXT DEFAULT '',
  requested_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  price NUMERIC,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  lost_date TEXT,
  reward TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_status ON public.items(status);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(category);
CREATE INDEX IF NOT EXISTS idx_items_poster ON public.items(poster_id);
CREATE INDEX IF NOT EXISTS idx_items_created ON public.items(created_at DESC);

-- 3. Requests
CREATE TABLE IF NOT EXISTS public.requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  item_title TEXT NOT NULL,
  requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  requester_name TEXT NOT NULL,
  poster_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'collected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, requester_id)
);

CREATE INDEX IF NOT EXISTS idx_requests_requester ON public.requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_requests_item ON public.requests(item_id);

-- 4. Favorites
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- 5. Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_ids UUID[] NOT NULL,
  participant_names TEXT[] NOT NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  item_title TEXT NOT NULL DEFAULT '',
  last_message TEXT DEFAULT '',
  last_message_time TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at ASC);

-- Suy ra khoa/trường từ email (Google OAuth)
CREATE OR REPLACE FUNCTION public.infer_faculty(email TEXT)
RETURNS TEXT AS $$
DECLARE
  domain TEXT;
BEGIN
  domain := lower(split_part(email, '@', 2));
  IF domain LIKE '%dut%' THEN RETURN 'CNTT - ĐH Bách Khoa';
  ELSIF domain LIKE '%due%' THEN RETURN 'Quản trị KD - ĐH Kinh tế';
  ELSIF domain LIKE '%ued%' THEN RETURN 'Sư phạm Toán - ĐH Sư phạm';
  ELSIF domain LIKE '%udn%' THEN RETURN 'Khác - ĐH Đà Nẵng';
  ELSE RETURN 'Khác';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger: tự tạo profile khi đăng ký (Google OAuth hoặc admin email)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar, faculty, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'Sinh viên'
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'faculty',
      public.infer_faculty(NEW.email)
    ),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "users_read_all" ON public.users;
CREATE POLICY "users_read_all" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (id = auth.uid());

-- Items policies
DROP POLICY IF EXISTS "items_read_public" ON public.items;
CREATE POLICY "items_read_public" ON public.items FOR SELECT USING (
  status IN ('available', 'reserved', 'completed')
  OR poster_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "items_insert_auth" ON public.items;
CREATE POLICY "items_insert_auth" ON public.items FOR INSERT WITH CHECK (poster_id = auth.uid());

DROP POLICY IF EXISTS "items_update_own" ON public.items;
CREATE POLICY "items_update_own" ON public.items FOR UPDATE USING (poster_id = auth.uid());

DROP POLICY IF EXISTS "items_admin_update" ON public.items;
CREATE POLICY "items_admin_update" ON public.items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "items_delete_own" ON public.items;
CREATE POLICY "items_delete_own" ON public.items FOR DELETE USING (poster_id = auth.uid());

-- Requests policies
DROP POLICY IF EXISTS "requests_select_own" ON public.requests;
CREATE POLICY "requests_select_own" ON public.requests FOR SELECT USING (
  requester_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.items WHERE items.id = requests.item_id AND items.poster_id = auth.uid())
);

DROP POLICY IF EXISTS "requests_insert_auth" ON public.requests;
CREATE POLICY "requests_insert_auth" ON public.requests FOR INSERT WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "requests_update_poster" ON public.requests;
CREATE POLICY "requests_update_poster" ON public.requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.items WHERE items.id = requests.item_id AND items.poster_id = auth.uid())
);

-- Favorites policies
DROP POLICY IF EXISTS "fav_select_own" ON public.favorites;
CREATE POLICY "fav_select_own" ON public.favorites FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "fav_insert_own" ON public.favorites;
CREATE POLICY "fav_insert_own" ON public.favorites FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "fav_delete_own" ON public.favorites;
CREATE POLICY "fav_delete_own" ON public.favorites FOR DELETE USING (user_id = auth.uid());

-- Conversations policies
DROP POLICY IF EXISTS "conv_select_participant" ON public.conversations;
CREATE POLICY "conv_select_participant" ON public.conversations FOR SELECT USING (auth.uid() = ANY(participant_ids));
DROP POLICY IF EXISTS "conv_insert_auth" ON public.conversations;
CREATE POLICY "conv_insert_auth" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = ANY(participant_ids));
DROP POLICY IF EXISTS "conv_update_participant" ON public.conversations;
CREATE POLICY "conv_update_participant" ON public.conversations FOR UPDATE USING (auth.uid() = ANY(participant_ids));

-- Messages policies
DROP POLICY IF EXISTS "msg_select_participant" ON public.messages;
CREATE POLICY "msg_select_participant" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND auth.uid() = ANY(c.participant_ids))
);
DROP POLICY IF EXISTS "msg_insert_participant" ON public.messages;
CREATE POLICY "msg_insert_participant" ON public.messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND auth.uid() = ANY(c.participant_ids))
);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('items', 'items', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow authenticated upload to items" ON storage.objects;
CREATE POLICY "Allow authenticated upload to items" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'items');

DROP POLICY IF EXISTS "Allow public read from items" ON storage.objects;
CREATE POLICY "Allow public read from items" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'items');

-- Realtime (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE public.items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Tạo admin: UPDATE public.users SET role = 'admin' WHERE email = 'your@email.com';