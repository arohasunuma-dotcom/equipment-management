/** 今日の日付を YYYY-MM-DD 形式で返す */
export function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

/** 指定日から N 営業日後の日付を YYYY-MM-DD で返す */
export function addBusinessDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T12:00:00')
  let added = 0
  while (added < days) {
    date.setDate(date.getDate() + 1)
    const day = date.getDay()
    if (day !== 0 && day !== 6) added++
  }
  return date.toISOString().split('T')[0]
}

/** deadline が today 以降かつ 2 営業日以内なら true */
export function isWithin2BusinessDays(
  deadlineStr: string | null | undefined,
  today: string
): boolean {
  if (!deadlineStr || deadlineStr < today) return false
  const cutoff = addBusinessDays(today, 2)
  return deadlineStr <= cutoff
}
