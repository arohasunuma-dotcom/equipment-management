-- 名前ベースの予約に対応するためrenter_nameカラムを追加、user_idをNULL許可に変更
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS renter_name text;
ALTER TABLE public.rentals ALTER COLUMN user_id DROP NOT NULL;
