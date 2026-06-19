-- Migration: thêm tính năng như website gốc (chạy nếu DB đã tồn tại)

ALTER TABLE public.items ADD COLUMN IF NOT EXISTS price NUMERIC;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS lost_date TEXT;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS reward TEXT;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS contact_phone TEXT;

CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

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

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fav_select_own" ON public.favorites;
CREATE POLICY "fav_select_own" ON public.favorites FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "fav_insert_own" ON public.favorites;
CREATE POLICY "fav_insert_own" ON public.favorites FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "fav_delete_own" ON public.favorites;
CREATE POLICY "fav_delete_own" ON public.favorites FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "conv_select_participant" ON public.conversations;
CREATE POLICY "conv_select_participant" ON public.conversations FOR SELECT USING (auth.uid() = ANY(participant_ids));
DROP POLICY IF EXISTS "conv_insert_auth" ON public.conversations;
CREATE POLICY "conv_insert_auth" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = ANY(participant_ids));
DROP POLICY IF EXISTS "conv_update_participant" ON public.conversations;
CREATE POLICY "conv_update_participant" ON public.conversations FOR UPDATE USING (auth.uid() = ANY(participant_ids));

DROP POLICY IF EXISTS "msg_select_participant" ON public.messages;
CREATE POLICY "msg_select_participant" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND auth.uid() = ANY(c.participant_ids))
);
DROP POLICY IF EXISTS "msg_insert_participant" ON public.messages;
CREATE POLICY "msg_insert_participant" ON public.messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND auth.uid() = ANY(c.participant_ids))
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;