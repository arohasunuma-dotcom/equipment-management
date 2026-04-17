import { z } from 'zod'

const PROJECT_TYPE_VALUES = ['room_tour', 'interview', 'texture', 'other'] as const
const VIDEO_FORMAT_VALUES = ['landscape', 'portrait', 'square'] as const
const WORK_TYPE_VALUES = ['shooting_only', 'editing_only', 'shooting_and_editing'] as const
const SHOOTING_TYPE_VALUES = ['smartphone', 'dslr'] as const
const TASK_STATUS_VALUES = ['pending', 'in_progress', 'done', 'skipped'] as const
const FEEDBACK_TYPE_VALUES = ['first', 'second', 'third'] as const

export const projectOutsourcerSchema = z.object({
  outsourcer_id: z.string().uuid('外注者IDが不正です'),
  amount: z.number().int().min(0, '金額は0以上で入力してください'),
  notes: z.string().max(500).optional().nullable(),
})

export const batchInputSchema = z.object({
  name: z.string().min(1, '動画名は必須です').max(100),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が不正です (YYYY-MM-DD)')
    .optional()
    .nullable(),
  outsourcer_id: z.string().uuid().optional().nullable(),
  outsourcer_amount: z.number().int().min(0).optional().nullable(),
  shooting_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が不正です (YYYY-MM-DD)')
    .optional()
    .nullable(),
  shooting_type: z.enum(SHOOTING_TYPE_VALUES).optional().nullable(),
  format: z.enum(VIDEO_FORMAT_VALUES).optional().nullable(),
  cameraman_ids: z.array(z.string().uuid()).optional().nullable(),
  type: z.enum(PROJECT_TYPE_VALUES).optional().nullable(),
  editor_member_id: z.string().uuid().optional().nullable(),
})

export const createProjectSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(200, '200文字以内で入力してください'),
  client_id: z.string().uuid('クライアントIDが不正です').optional().nullable(),
  type: z.enum(PROJECT_TYPE_VALUES, { error: () => '種別を選択してください' }),
  work_type: z.enum(WORK_TYPE_VALUES, { error: () => 'ワークタイプを選択してください' }).default('shooting_and_editing'),
  format: z.enum(VIDEO_FORMAT_VALUES, { error: () => 'フォーマットを選択してください' }),
  shooting_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が不正です (YYYY-MM-DD)')
    .optional()
    .nullable(),
  shooting_type: z.enum(SHOOTING_TYPE_VALUES).optional().nullable(),
  delivery_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が不正です (YYYY-MM-DD)')
    .optional()
    .nullable(),
  cameraman_id: z.string().uuid().optional().nullable(),
  cameraman_ids: z.array(z.string().uuid()).optional().nullable(),
  editor_member_id: z.string().uuid().optional().nullable(),
  director_id: z.string().uuid().optional().nullable(),
  shooting_location: z.string().max(500).optional().nullable(),
  model_name: z.string().max(200).optional().nullable(),
  memo: z.string().max(2000).optional().nullable(),
  kickoff_done: z.boolean().optional(),
  calendar_done: z.boolean().optional(),
  rental_car_done: z.boolean().optional(),
  hotel_done: z.boolean().optional(),
  transport_reservation_done: z.boolean().optional(),
  equipment_reservation_done: z.boolean().optional(),
  notes: z.string().max(1000, '1000文字以内で入力してください').optional().nullable(),
  outsourcers: z.array(projectOutsourcerSchema).default([]),
  batches: z.array(batchInputSchema).optional(),
})

export const updateProjectSchema = createProjectSchema.partial().extend({
  deleted_at: z.string().datetime().optional().nullable(),
})

export const updateTaskSchema = z.object({
  status: z.enum(TASK_STATUS_VALUES, { error: () => 'ステータスが不正です' }).optional(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が不正です (YYYY-MM-DD)')
    .optional()
    .nullable(),
  assignee_id: z.string().uuid('担当者IDが不正です').optional().nullable(),
  notes: z.string().max(1000, '1000文字以内で入力してください').optional().nullable(),
})

export const createFeedbackSchema = z.object({
  project_id: z.string().uuid('プロジェクトIDが不正です'),
  type: z.enum(FEEDBACK_TYPE_VALUES, { error: () => 'FBの種別を選択してください' }),
  notes: z.string().max(1000, '1000文字以内で入力してください').optional().nullable(),
})

export const respondFeedbackSchema = z.object({
  notes: z.string().max(1000, '1000文字以内で入力してください').optional().nullable(),
})

export const createClientSchema = z.object({
  name: z.string().min(1, 'クライアント名は必須です').max(100, '100文字以内で入力してください'),
  contact_name: z.string().max(100, '100文字以内で入力してください').optional().nullable(),
  contact_email: z
    .string()
    .email('メールアドレスの形式が不正です')
    .optional()
    .nullable()
    .or(z.literal('')),
  contact_slack_id: z.string().max(100, '100文字以内で入力してください').optional().nullable(),
  notes: z.string().max(1000, '1000文字以内で入力してください').optional().nullable(),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>
export type RespondFeedbackInput = z.infer<typeof respondFeedbackSchema>
export type CreateClientInput = z.infer<typeof createClientSchema>
