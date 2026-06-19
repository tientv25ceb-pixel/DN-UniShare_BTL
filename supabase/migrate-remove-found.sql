-- Migration: bỏ loại tin "nhặt được" (found)
-- Chạy trong Supabase SQL Editor nếu DB đã có cột exchange_type cho phép 'found'

-- Chuyển tin cũ sang trạng thái hủy (hoặc đổi thành 'lost' nếu muốn giữ hiển thị)
UPDATE public.items
SET status = 'cancelled', updated_at = NOW()
WHERE exchange_type = 'found';

-- Cập nhật ràng buộc CHECK
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_exchange_type_check;
ALTER TABLE public.items ADD CONSTRAINT items_exchange_type_check
  CHECK (exchange_type IN ('mienphi', 'traodoi', 'sale', 'lost'));