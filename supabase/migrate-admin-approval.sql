-- Migration: thêm admin duyệt bài (chạy nếu đã có DB từ dự án Next.js cũ)

ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_status_check;
ALTER TABLE public.items ADD CONSTRAINT items_status_check
  CHECK (status IN ('pending', 'available', 'reserved', 'completed', 'cancelled', 'rejected'));

ALTER TABLE public.items ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT '';

-- Bật RLS (nếu đang tắt)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Cập nhật policy items
DROP POLICY IF EXISTS "items_read_all" ON public.items;
DROP POLICY IF EXISTS "items_read_public" ON public.items;
CREATE POLICY "items_read_public" ON public.items FOR SELECT USING (
  status IN ('available', 'reserved', 'completed')
  OR poster_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "items_admin_update" ON public.items;
CREATE POLICY "items_admin_update" ON public.items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);