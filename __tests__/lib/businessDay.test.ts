import { describe, it, expect } from 'vitest'
import {
  isBusinessDay,
  addBusinessDays,
  subtractBusinessDays,
  calcFbDeadline,
  calcReFbDeadline,
  calcDeliveryDate,
} from '@/lib/businessDay'

// ヘルパー: YYYY-MM-DD 文字列から Date を生成（ローカルタイムゾーン）
function d(iso: string): Date {
  const [y, m, day] = iso.split('-').map(Number)
  return new Date(y, m - 1, day)
}

// ヘルパー: Date を YYYY-MM-DD 文字列に変換
function toIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

describe('isBusinessDay', () => {
  it('月曜日はtrue', () => {
    // 2025-06-02 は月曜日
    expect(isBusinessDay(d('2025-06-02'))).toBe(true)
  })

  it('火曜日はtrue', () => {
    // 2025-06-03 は火曜日
    expect(isBusinessDay(d('2025-06-03'))).toBe(true)
  })

  it('水曜日はtrue', () => {
    // 2025-06-04 は水曜日
    expect(isBusinessDay(d('2025-06-04'))).toBe(true)
  })

  it('木曜日はtrue', () => {
    // 2025-06-05 は木曜日
    expect(isBusinessDay(d('2025-06-05'))).toBe(true)
  })

  it('金曜日はtrue', () => {
    // 2025-06-06 は金曜日
    expect(isBusinessDay(d('2025-06-06'))).toBe(true)
  })

  it('土曜日はfalse', () => {
    // 2025-06-07 は土曜日
    expect(isBusinessDay(d('2025-06-07'))).toBe(false)
  })

  it('日曜日はfalse', () => {
    // 2025-06-08 は日曜日
    expect(isBusinessDay(d('2025-06-08'))).toBe(false)
  })

  it('2025年 元日（祝日）はfalse', () => {
    expect(isBusinessDay(d('2025-01-01'))).toBe(false)
  })

  it('2025年 成人の日（祝日）はfalse', () => {
    expect(isBusinessDay(d('2025-01-13'))).toBe(false)
  })

  it('2025年 天皇誕生日（祝日）はfalse', () => {
    expect(isBusinessDay(d('2025-02-23'))).toBe(false)
  })

  it('2025年 天皇誕生日 振替休日はfalse', () => {
    expect(isBusinessDay(d('2025-02-24'))).toBe(false)
  })

  it('2025年 春分の日（祝日）はfalse', () => {
    expect(isBusinessDay(d('2025-03-20'))).toBe(false)
  })

  it('2025年 こどもの日 振替休日はfalse', () => {
    expect(isBusinessDay(d('2025-05-06'))).toBe(false)
  })

  it('2025年 山の日（祝日）はfalse', () => {
    expect(isBusinessDay(d('2025-08-11'))).toBe(false)
  })

  it('2025年 勤労感謝の日 振替休日はfalse', () => {
    expect(isBusinessDay(d('2025-11-24'))).toBe(false)
  })

  it('2026年 元日（祝日）はfalse', () => {
    expect(isBusinessDay(d('2026-01-01'))).toBe(false)
  })

  it('2026年 成人の日（祝日）はfalse', () => {
    expect(isBusinessDay(d('2026-01-12'))).toBe(false)
  })
})

describe('addBusinessDays', () => {
  it('1営業日後: 月曜→火曜（週内）', () => {
    // 2025-06-02（月）→ 2025-06-03（火）
    expect(toIso(addBusinessDays(d('2025-06-02'), 1))).toBe('2025-06-03')
  })

  it('1営業日後: 金曜→月曜（週末をまたぐ）', () => {
    // 2025-06-06（金）→ 2025-06-09（月）
    expect(toIso(addBusinessDays(d('2025-06-06'), 1))).toBe('2025-06-09')
  })

  it('5営業日後: 月曜→翌週月曜（週末をまたぐ）', () => {
    // 2025-06-02（月）→ 2025-06-09（月）
    expect(toIso(addBusinessDays(d('2025-06-02'), 5))).toBe('2025-06-09')
  })

  it('3営業日後: 水曜→翌週月曜（週末をまたぐ）', () => {
    // 2025-06-04（水）→ 2025-06-09（月）
    expect(toIso(addBusinessDays(d('2025-06-04'), 3))).toBe('2025-06-09')
  })

  it('祝日をまたぐケース: 2025-04-28（月）から1営業日後は30日（水、29日は昭和の日でスキップ）', () => {
    // 2025-04-29 は昭和の日（祝日）
    // 2025-04-28（月）の1営業日後 → 2025-04-30（水）
    expect(toIso(addBusinessDays(d('2025-04-28'), 1))).toBe('2025-04-30')
  })

  it('祝日をまたぐケース: 2025-04-25（金）から3営業日後（GW連休を超える）', () => {
    // 2025-04-29: 昭和の日、05-03: 憲法記念日、05-04: みどりの日、05-05: こどもの日、05-06: 振替休日
    // 2025-04-25（金）の1営業日後=4/28（月）、2=4/30（水）、3=5/1（木）
    expect(toIso(addBusinessDays(d('2025-04-25'), 3))).toBe('2025-05-01')
  })

  it('2026年 祝日連休をまたぐケース: 2026-05-01（金）から1営業日後', () => {
    // 2026-05-03: 憲法記念日、05-04: みどりの日、05-05: こどもの日、05-06: 振替休日
    // 2026-05-01（金）→ 2026-05-07（木）... 実際は05-02（土）、05-03〜06祝日
    // 1営業日後 = 2026-05-07（木）
    expect(toIso(addBusinessDays(d('2026-05-01'), 1))).toBe('2026-05-07')
  })
})

describe('subtractBusinessDays', () => {
  it('1営業日前: 火曜→月曜', () => {
    // 2025-06-03（火）→ 2025-06-02（月）
    expect(toIso(subtractBusinessDays(d('2025-06-03'), 1))).toBe('2025-06-02')
  })

  it('1営業日前: 月曜→金曜（週末をまたぐ）', () => {
    // 2025-06-09（月）→ 2025-06-06（金）
    expect(toIso(subtractBusinessDays(d('2025-06-09'), 1))).toBe('2025-06-06')
  })

  it('3営業日前: 水曜→前週火曜（週末をまたぐ）', () => {
    // 2025-06-11（水）→ 2025-06-06（金）→ ... 3営業日前
    // 1前=06-10(火), 2前=06-09(月), 3前=06-06(金)
    expect(toIso(subtractBusinessDays(d('2025-06-11'), 3))).toBe('2025-06-06')
  })

  it('5営業日前: 月曜→前週月曜', () => {
    // 2025-06-16（月）の5営業日前 = 2025-06-09（月）
    expect(toIso(subtractBusinessDays(d('2025-06-16'), 5))).toBe('2025-06-09')
  })

  it('祝日をまたぐケース: 2025-04-30（水）から1営業日前は28日（月、29日は昭和の日でスキップ）', () => {
    // 2025-04-29は昭和の日
    // 2025-04-30（水）の1営業日前 → 2025-04-28（月）
    expect(toIso(subtractBusinessDays(d('2025-04-30'), 1))).toBe('2025-04-28')
  })
})

describe('calcFbDeadline', () => {
  it('撮影日から3営業日後を返す（平日のみ）', () => {
    // 2025-06-02（月）の3営業日後 = 2025-06-05（木）
    expect(toIso(calcFbDeadline(d('2025-06-02')))).toBe('2025-06-05')
  })

  it('撮影日から3営業日後（週末をまたぐ）', () => {
    // 2025-06-04（水）の3営業日後 = 2025-06-09（月）
    expect(toIso(calcFbDeadline(d('2025-06-04')))).toBe('2025-06-09')
  })

  it('撮影日から3営業日後（祝日をまたぐ）', () => {
    // 2025-04-25（金）の3営業日後 = 2025-05-01（木）
    expect(toIso(calcFbDeadline(d('2025-04-25')))).toBe('2025-05-01')
  })

  it('2026年の撮影日から3営業日後', () => {
    // 2026-03-16（月）の3営業日後 = 2026-03-19（木）
    expect(toIso(calcFbDeadline(d('2026-03-16')))).toBe('2026-03-19')
  })
})

describe('calcReFbDeadline', () => {
  it('FB返答日から3営業日後を返す（平日のみ）', () => {
    // 2025-06-10（火）の3営業日後 = 2025-06-13（金）
    expect(toIso(calcReFbDeadline(d('2025-06-10')))).toBe('2025-06-13')
  })

  it('FB返答日から3営業日後（週末をまたぐ）', () => {
    // 2025-06-12（木）の3営業日後 = 2025-06-17（火）
    expect(toIso(calcReFbDeadline(d('2025-06-12')))).toBe('2025-06-17')
  })

  it('FB返答日から3営業日後（祝日をまたぐ）', () => {
    // 2025-09-18（木）の3営業日後: 09-23（水）は秋分の日のみ（09-22月は祝日ではない）
    // 1後=09-19(金), 2後=09-22(月), 3後=09-23(秋分の日=skip) → 09-24(水)
    expect(toIso(calcReFbDeadline(d('2025-09-18')))).toBe('2025-09-24')
  })
})

describe('calcDeliveryDate', () => {
  it('再FB返答日から2営業日後を返す（平日のみ）', () => {
    // 2025-06-16（月）の2営業日後 = 2025-06-18（水）
    expect(toIso(calcDeliveryDate(d('2025-06-16')))).toBe('2025-06-18')
  })

  it('再FB返答日から2営業日後（週末をまたぐ）', () => {
    // 2025-06-13（金）の2営業日後 = 2025-06-17（火）
    expect(toIso(calcDeliveryDate(d('2025-06-13')))).toBe('2025-06-17')
  })

  it('再FB返答日から2営業日後（祝日をまたぐ）', () => {
    // 2025-11-20（木）の2営業日後: 11-24（月）は勤労感謝の日振替
    // 1後=11-21(金), 2後=11-25(火)
    expect(toIso(calcDeliveryDate(d('2025-11-20')))).toBe('2025-11-25')
  })

  it('2026年の再FB返答日から2営業日後', () => {
    // 2026-01-08（木）の2営業日後 = 2026-01-13（火）: 01-12は成人の日
    // 1後=01-09(金), 2後=01-13(火)
    expect(toIso(calcDeliveryDate(d('2026-01-08')))).toBe('2026-01-13')
  })
})
