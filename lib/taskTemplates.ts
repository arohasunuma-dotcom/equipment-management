import type { ProjectType } from '../types/projects'
import { addBusinessDays as addBD, subtractBusinessDays as subBD } from './businessDay'

/** YYYY-MM-DD 文字列から UTC 基準の Date を生成 */
function parseUTCDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00Z')
}

/** Date を YYYY-MM-DD 文字列に変換（UTC基準） */
function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * 撮影日から全16工程の due_date を自動計算する
 * @param shootingDate YYYY-MM-DD 形式の撮影日
 * @param dueDate YYYY-MM-DD 形式の納品締め切り（省略時は撮影日+17営業日）
 * @returns step_order -> due_date のマップ
 */
export function calculateTaskSchedule(
  shootingDate: string,
  dueDate?: string | null
): Record<number, string> {
  const sd = parseUTCDate(shootingDate)
  const add = (n: number) => toDateStr(addBD(sd, n))
  const sub = (n: number) => toDateStr(subBD(sd, n))
  const delivery = dueDate ?? add(17)

  return {
    1:  sub(10),   // 撮影台本初稿
    2:  sub(7),    // 台本FB
    3:  sub(5),    // 台本先方提出
    4:  shootingDate, // 撮影日
    5:  add(1),    // 撮影素材共有
    6:  add(1),    // 編集依頼
    7:  add(5),    // 社内初稿
    8:  add(6),    // 社内FB
    9:  add(7),    // 先方初稿提出
    10: add(10),   // 先方FB
    11: add(12),   // 社内第２稿
    12: add(13),   // 修正稿提出
    13: add(14),   // 先方最終確認
    14: add(15),   // お施主様チェック
    15: delivery,  // 納品日
    16: delivery,  // サムネ作成日
  }
}

/**
 * 社内初稿日（step 7）から全16工程の due_date を自動計算する
 * @param draftDate YYYY-MM-DD 形式の社内初稿日
 * @param dueDate YYYY-MM-DD 形式の納品締め切り（省略時は社内初稿日+12営業日）
 * @returns step_order -> due_date のマップ
 */
export function calculateTaskScheduleFromDraft(
  draftDate: string,
  dueDate?: string | null
): Record<number, string> {
  const id = parseUTCDate(draftDate)
  const add = (n: number) => toDateStr(addBD(id, n))
  const sub = (n: number) => toDateStr(subBD(id, n))
  const delivery = dueDate ?? add(12)

  return {
    1:  sub(15),   // 撮影台本初稿
    2:  sub(12),   // 台本FB
    3:  sub(10),   // 台本先方提出
    4:  sub(5),    // 撮影日
    5:  sub(4),    // 撮影素材共有
    6:  sub(4),    // 編集依頼
    7:  draftDate, // 社内初稿
    8:  add(1),    // 社内FB
    9:  add(2),    // 先方初稿提出
    10: add(5),    // 先方FB
    11: add(7),    // 社内第２稿
    12: add(8),    // 修正稿提出
    13: add(9),    // 先方最終確認
    14: add(10),   // お施主様チェック
    15: delivery,  // 納品日
    16: delivery,  // サムネ作成日
  }
}

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
 * type が null/undefined の場合はデフォルトテンプレートを返す
 */
export function getTemplateForType(type: ProjectType | null | undefined): TaskTemplate[] {
  const resolved = type ?? 'other'
  switch (resolved) {
    case 'room_tour':
    case 'other':
    case 'interview':
    case 'texture':
      return EDITING_TEMPLATE.map((t) => ({ ...t }))
    default: {
      const _exhaustive: never = resolved
      return _exhaustive
    }
  }
}
