import { describe, it, expect } from 'vitest'
import { calculateSchedule } from '@/lib/scheduleCalculator'

describe('calculateSchedule', () => {
  describe('空のinputの場合: 全てundefined', () => {
    it('何も渡さない場合は全フィールドが未定義', () => {
      const result = calculateSchedule({})
      expect(result.editing_start_date).toBeUndefined()
      expect(result.fb_deadline).toBeUndefined()
      expect(result.re_fb_deadline).toBeUndefined()
      expect(result.delivery_date).toBeUndefined()
    })

    it('空オブジェクトでも空の結果を返す', () => {
      const result = calculateSchedule({})
      expect(Object.keys(result)).toHaveLength(0)
    })
  })

  describe('shooting_dateのみ指定した場合: fb_deadlineが計算される', () => {
    it('shooting_date のみ渡すと editing_start_date と fb_deadline が計算される', () => {
      // 2025-06-02（月）
      // editing_start_date = 1営業日後 = 2025-06-03（火）
      // fb_deadline = 3営業日後 = 2025-06-05（木）
      const result = calculateSchedule({ shooting_date: '2025-06-02' })
      expect(result.editing_start_date).toBe('2025-06-03')
      expect(result.fb_deadline).toBe('2025-06-05')
    })

    it('shooting_date のみ渡すと re_fb_deadline と delivery_date は未定義', () => {
      const result = calculateSchedule({ shooting_date: '2025-06-02' })
      expect(result.re_fb_deadline).toBeUndefined()
      expect(result.delivery_date).toBeUndefined()
    })

    it('週末をまたぐ shooting_date', () => {
      // 2025-06-05（木）
      // editing_start_date = 1営業日後 = 2025-06-06（金）
      // fb_deadline = 3営業日後 = 2025-06-10（火）
      const result = calculateSchedule({ shooting_date: '2025-06-05' })
      expect(result.editing_start_date).toBe('2025-06-06')
      expect(result.fb_deadline).toBe('2025-06-10')
    })

    it('祝日をまたぐ shooting_date（GW前）', () => {
      // 2025-04-25（金）
      // editing_start_date = 1営業日後 = 2025-04-28（月）
      // fb_deadline = 3営業日後 = 2025-05-01（木）  ← GW祝日をスキップ
      const result = calculateSchedule({ shooting_date: '2025-04-25' })
      expect(result.editing_start_date).toBe('2025-04-28')
      expect(result.fb_deadline).toBe('2025-05-01')
    })
  })

  describe('fb_responded_atを指定した場合: re_fb_deadlineが計算される', () => {
    it('fb_responded_at のみ渡すと re_fb_deadline が計算される', () => {
      // 2025-06-10（火）
      // re_fb_deadline = 3営業日後 = 2025-06-13（金）
      const result = calculateSchedule({ fb_responded_at: '2025-06-10' })
      expect(result.re_fb_deadline).toBe('2025-06-13')
    })

    it('fb_responded_at のみ渡すと editing_start_date, fb_deadline, delivery_date は未定義', () => {
      const result = calculateSchedule({ fb_responded_at: '2025-06-10' })
      expect(result.editing_start_date).toBeUndefined()
      expect(result.fb_deadline).toBeUndefined()
      expect(result.delivery_date).toBeUndefined()
    })

    it('fb_responded_at に ISO datetime 文字列を渡せる', () => {
      // 2025-06-10T09:00:00 → 2025-06-10 として扱われ、3営業日後 = 2025-06-13
      const result = calculateSchedule({ fb_responded_at: '2025-06-10T09:00:00' })
      expect(result.re_fb_deadline).toBe('2025-06-13')
    })

    it('週末をまたぐ fb_responded_at', () => {
      // 2025-06-12（木）の3営業日後 = 2025-06-17（火）
      const result = calculateSchedule({ fb_responded_at: '2025-06-12' })
      expect(result.re_fb_deadline).toBe('2025-06-17')
    })
  })

  describe('re_fb_responded_atを指定した場合: delivery_dateが計算される', () => {
    it('re_fb_responded_at のみ渡すと delivery_date が計算される', () => {
      // 2025-06-16（月）
      // delivery_date = 2営業日後 = 2025-06-18（水）
      const result = calculateSchedule({ re_fb_responded_at: '2025-06-16' })
      expect(result.delivery_date).toBe('2025-06-18')
    })

    it('re_fb_responded_at のみ渡すと editing_start_date, fb_deadline, re_fb_deadline は未定義', () => {
      const result = calculateSchedule({ re_fb_responded_at: '2025-06-16' })
      expect(result.editing_start_date).toBeUndefined()
      expect(result.fb_deadline).toBeUndefined()
      expect(result.re_fb_deadline).toBeUndefined()
    })

    it('週末をまたぐ re_fb_responded_at', () => {
      // 2025-06-13（金）の2営業日後 = 2025-06-17（火）
      const result = calculateSchedule({ re_fb_responded_at: '2025-06-13' })
      expect(result.delivery_date).toBe('2025-06-17')
    })

    it('祝日をまたぐ re_fb_responded_at', () => {
      // 2025-11-20（木）の2営業日後: 11-24（月）は振替休日
      // 1後=11-21(金), 2後=11-25(火)
      const result = calculateSchedule({ re_fb_responded_at: '2025-11-20' })
      expect(result.delivery_date).toBe('2025-11-25')
    })
  })

  describe('全て指定した場合: 全フィールドが計算される', () => {
    it('全インプットを渡すと全フィールドが計算される', () => {
      const result = calculateSchedule({
        shooting_date: '2025-06-02',
        fb_responded_at: '2025-06-10',
        re_fb_responded_at: '2025-06-16',
      })
      // editing_start_date: 2025-06-02 の1営業日後 = 2025-06-03
      expect(result.editing_start_date).toBe('2025-06-03')
      // fb_deadline: 2025-06-02 の3営業日後 = 2025-06-05
      expect(result.fb_deadline).toBe('2025-06-05')
      // re_fb_deadline: 2025-06-10 の3営業日後 = 2025-06-13
      expect(result.re_fb_deadline).toBe('2025-06-13')
      // delivery_date: 2025-06-16 の2営業日後 = 2025-06-18
      expect(result.delivery_date).toBe('2025-06-18')
    })

    it('イミュータブルを確認: 入力オブジェクトが変更されない', () => {
      const input = {
        shooting_date: '2025-06-02',
        fb_responded_at: '2025-06-10',
        re_fb_responded_at: '2025-06-16',
      }
      const inputCopy = { ...input }
      calculateSchedule(input)
      expect(input).toEqual(inputCopy)
    })

    it('2026年のデータでも正しく計算される', () => {
      const result = calculateSchedule({
        shooting_date: '2026-03-16',
        fb_responded_at: '2026-03-24',
        re_fb_responded_at: '2026-03-30',
      })
      // editing_start_date: 2026-03-16 の1営業日後 = 2026-03-17（火）
      expect(result.editing_start_date).toBe('2026-03-17')
      // fb_deadline: 2026-03-16 の3営業日後 = 2026-03-19（木）
      expect(result.fb_deadline).toBe('2026-03-19')
      // re_fb_deadline: 2026-03-24 の3営業日後 = 2026-03-27（金）
      expect(result.re_fb_deadline).toBe('2026-03-27')
      // delivery_date: 2026-03-30 の2営業日後 = 2026-04-01（水）
      expect(result.delivery_date).toBe('2026-04-01')
    })
  })

  describe('部分的なinputの組み合わせ', () => {
    it('shooting_date と fb_responded_at を渡した場合', () => {
      const result = calculateSchedule({
        shooting_date: '2025-06-02',
        fb_responded_at: '2025-06-10',
      })
      expect(result.editing_start_date).toBe('2025-06-03')
      expect(result.fb_deadline).toBe('2025-06-05')
      expect(result.re_fb_deadline).toBe('2025-06-13')
      expect(result.delivery_date).toBeUndefined()
    })

    it('fb_responded_at と re_fb_responded_at を渡した場合', () => {
      const result = calculateSchedule({
        fb_responded_at: '2025-06-10',
        re_fb_responded_at: '2025-06-16',
      })
      expect(result.editing_start_date).toBeUndefined()
      expect(result.fb_deadline).toBeUndefined()
      expect(result.re_fb_deadline).toBe('2025-06-13')
      expect(result.delivery_date).toBe('2025-06-18')
    })
  })
})
