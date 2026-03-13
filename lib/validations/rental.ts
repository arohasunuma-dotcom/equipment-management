import { z } from 'zod'

export const rentalSchema = z.object({
  equipment_id: z.string().uuid('機材を選択してください'),
  start_date: z.string().min(1, '貸出日は必須です'),
  end_date: z.string().min(1, '返却日は必須です'),
  purpose: z.string().min(1, '使用目的は必須です').max(200, '200文字以内で入力してください'),
  notes: z.string().max(500, '500文字以内で入力してください').optional().or(z.literal('')),
}).refine(
  (data) => new Date(data.end_date) >= new Date(data.start_date),
  { message: '返却日は貸出日以降の日付を選択してください', path: ['end_date'] }
).refine(
  (data) => new Date(data.start_date) >= new Date(new Date().toISOString().split('T')[0]),
  { message: '貸出日は今日以降の日付を選択してください', path: ['start_date'] }
)

export const returnSchema = z.object({
  notes: z.string().max(500, '500文字以内で入力してください').optional().or(z.literal('')),
})

export type RentalInput = z.infer<typeof rentalSchema>
export type ReturnInput = z.infer<typeof returnSchema>
