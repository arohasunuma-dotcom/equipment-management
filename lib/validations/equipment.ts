import { z } from 'zod'

export const equipmentSchema = z.object({
  category_id: z.string().uuid('カテゴリを選択してください'),
  name: z.string().min(1, '機材名は必須です').max(100, '100文字以内で入力してください'),
  serial_number: z.string().max(100, '100文字以内で入力してください').optional().or(z.literal('')),
  notes: z.string().max(1000, '1000文字以内で入力してください').optional().or(z.literal('')),
  image_url: z.string().url('正しいURL形式で入力してください').optional().or(z.literal('')),
})

export type EquipmentInput = z.infer<typeof equipmentSchema>
