// 日本の祝日リスト（2025〜2026年）
export const JAPANESE_HOLIDAYS_2025_2026: readonly string[] = [
  // 2025年
  '2025-01-01', // 元日
  '2025-01-13', // 成人の日
  '2025-02-11', // 建国記念の日
  '2025-02-23', // 天皇誕生日
  '2025-02-24', // 天皇誕生日 振替休日
  '2025-03-20', // 春分の日
  '2025-04-29', // 昭和の日
  '2025-05-03', // 憲法記念日
  '2025-05-04', // みどりの日
  '2025-05-05', // こどもの日
  '2025-05-06', // こどもの日 振替休日
  '2025-07-21', // 海の日
  '2025-08-11', // 山の日
  '2025-09-15', // 敬老の日
  '2025-09-23', // 秋分の日
  '2025-10-13', // スポーツの日
  '2025-11-03', // 文化の日
  '2025-11-23', // 勤労感謝の日
  '2025-11-24', // 勤労感謝の日 振替休日
  // 2026年
  '2026-01-01', // 元日
  '2026-01-12', // 成人の日
  '2026-02-11', // 建国記念の日
  '2026-02-23', // 天皇誕生日
  '2026-03-20', // 春分の日
  '2026-04-29', // 昭和の日
  '2026-05-03', // 憲法記念日
  '2026-05-04', // みどりの日
  '2026-05-05', // こどもの日
  '2026-05-06', // 振替休日
  '2026-07-20', // 海の日
  '2026-08-11', // 山の日
  '2026-09-21', // 敬老の日
  '2026-09-22', // 国民の休日
  '2026-09-23', // 秋分の日
  '2026-10-12', // スポーツの日
  '2026-11-03', // 文化の日
  '2026-11-23', // 勤労感謝の日
] as const

/**
 * 指定した日付が祝日かどうかを返す
 */
export function isHoliday(date: Date): boolean {
  const iso = toIsoDateString(date)
  return JAPANESE_HOLIDAYS_2025_2026.includes(iso)
}

/**
 * 指定した日付が営業日（平日かつ祝日でない）かどうかを返す
 */
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay()
  if (day === 0 || day === 6) return false // 日曜・土曜
  return !isHoliday(date)
}

/**
 * 指定した日付から n 営業日後の日付を返す（イミュータブル）
 */
export function addBusinessDays(date: Date, n: number): Date {
  let result = new Date(date.getTime())
  let remaining = n
  while (remaining > 0) {
    result = new Date(result.getTime() + 86400000) // +1日
    if (isBusinessDay(result)) {
      remaining--
    }
  }
  return result
}

/**
 * 指定した日付から n 営業日前の日付を返す（イミュータブル）
 */
export function subtractBusinessDays(date: Date, n: number): Date {
  let result = new Date(date.getTime())
  let remaining = n
  while (remaining > 0) {
    result = new Date(result.getTime() - 86400000) // -1日
    if (isBusinessDay(result)) {
      remaining--
    }
  }
  return result
}

/**
 * 撮影日から3営業日後の初回FBデッドラインを返す
 */
export function calcFbDeadline(shootingDate: Date): Date {
  return addBusinessDays(shootingDate, 3)
}

/**
 * FB返答日から3営業日後の再FBデッドラインを返す
 */
export function calcReFbDeadline(fbRespondedAt: Date): Date {
  return addBusinessDays(fbRespondedAt, 3)
}

/**
 * 再FB返答日から2営業日後の納品日を返す
 */
export function calcDeliveryDate(reFbRespondedAt: Date): Date {
  return addBusinessDays(reFbRespondedAt, 2)
}

// ── 内部ユーティリティ ──────────────────────────────────────────────

function toIsoDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
