import type { ProjectType } from '../types/projects'

export interface TaskTemplate {
  step_order: number
  title: string
}

// 15工程テンプレート（撮影準備チェックと並行して使用）
export const EDITING_TEMPLATE: readonly TaskTemplate[] = [
  { step_order: 1,  title: '撮影台本初稿' },
  { step_order: 2,  title: '台本FB' },
  { step_order: 3,  title: '台本先方提出' },
  { step_order: 4,  title: '撮影日' },
  { step_order: 5,  title: '撮影素材共有' },
  { step_order: 6,  title: '編集依頼' },
  { step_order: 7,  title: '社内初稿' },
  { step_order: 8,  title: '社内FB' },
  { step_order: 9,  title: '先方初稿提出' },
  { step_order: 10, title: '先方FB' },
  { step_order: 11, title: '社内第２稿' },
  { step_order: 12, title: '修正稿提出' },
  { step_order: 13, title: '先方最終確認' },
  { step_order: 14, title: 'お施主様チェック' },
  { step_order: 15, title: '納品日' },
  { step_order: 16, title: 'サムネ作成日' },
] as const

/**
 * ステップ番号からプロジェクトステータスを推定する
 * タスクが「done」になった際の自動ステータス遷移に使用
 */
export function inferStatusFromStep(step: number): string | null {
  if (step >= 15) return 'completed'
  if (step >= 12) return 're_fb_waiting'
  if (step >= 11) return 'fix_editing'
  if (step >= 10) return 'fb_responded'
  if (step >= 9)  return 'fb_waiting'
  if (step >= 6)  return 'editing'
  if (step >= 4)  return 'shooting_done'
  return null
}

/**
 * プロジェクト種別に対応するタスクテンプレートを返す（イミュータブルなコピー）
 */
export function getTemplateForType(type: ProjectType): TaskTemplate[] {
  switch (type) {
    case 'room_tour':
    case 'other':
    case 'interview':
    case 'texture':
      return EDITING_TEMPLATE.map((t) => ({ ...t }))
    default: {
      const _exhaustive: never = type
      return _exhaustive
    }
  }
}
