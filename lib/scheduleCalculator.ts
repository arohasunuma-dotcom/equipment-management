import { addBusinessDays, calcFbDeadline, calcReFbDeadline, calcDeliveryDate } from './businessDay'

export interface ScheduleInput {
  shooting_date?: string // ISO date (YYYY-MM-DD)
  fb_responded_at?: string // ISO datetime
  re_fb_responded_at?: string // ISO datetime
}

export interface ScheduleResult {
  editing_start_date?: string
  fb_deadline?: string
  re_fb_deadline?: string
  delivery_date?: string
}

/**
 * 各日程インプットからスケジュール関連の日付を自動計算して返す。
 * 渡されていないフィールドは結果にも含まれない（イミュータブル）。
 */
export function calculateSchedule(input: ScheduleInput): ScheduleResult {
  const result: ScheduleResult = {}

  if (input.shooting_date) {
    const shootingDate = parseDate(input.shooting_date)
    // 編集開始日: 撮影日の翌営業日
    result.editing_start_date = toIsoDateString(addBusinessDays(shootingDate, 1))
    // 初回FBデッドライン: 撮影日から3営業日後
    result.fb_deadline = toIsoDateString(calcFbDeadline(shootingDate))
  }

  if (input.fb_responded_at) {
    const fbRespondedDate = parseDate(input.fb_responded_at)
    // 再FBデッドライン: 初回FB返答から3営業日後
    result.re_fb_deadline = toIsoDateString(calcReFbDeadline(fbRespondedDate))
  }

  if (input.re_fb_responded_at) {
    const reFbRespondedDate = parseDate(input.re_fb_responded_at)
    // 納品日: 再FB返答から2営業日後
    result.delivery_date = toIsoDateString(calcDeliveryDate(reFbRespondedDate))
  }

  return result
}

// ── 内部ユーティリティ ──────────────────────────────────────────────

/**
 * ISO 日付文字列または日時文字列を Date に変換する
 * ローカルタイムゾーンで解釈する（YYYY-MM-DD の場合はそのままローカル日付として扱う）
 */
function parseDate(iso: string): Date {
  // YYYY-MM-DD 形式の場合はタイムゾーンのズレを防ぐためにローカル日付として生成
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(iso)
}

function toIsoDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
