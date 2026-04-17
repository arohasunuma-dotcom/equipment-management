import { describe, it, expect } from 'vitest'
import { getNextStatuses, isValidTransition } from '@/lib/statusTransition'
import type { ProjectStatus } from '@/types/projects'

describe('getNextStatuses', () => {
  describe('admin ロール', () => {
    it('inquiry からは shooting_scheduled と cancelled へ遷移できる', () => {
      const result = getNextStatuses('inquiry', 'admin')
      expect(result).toEqual(['shooting_scheduled', 'cancelled'])
    })

    it('shooting_scheduled からは shooting_done と cancelled へ遷移できる', () => {
      const result = getNextStatuses('shooting_scheduled', 'admin')
      expect(result).toEqual(['shooting_done', 'cancelled'])
    })

    it('shooting_done からは editing と cancelled へ遷移できる', () => {
      const result = getNextStatuses('shooting_done', 'admin')
      expect(result).toEqual(['editing', 'cancelled'])
    })

    it('editing からは fb_waiting と cancelled へ遷移できる', () => {
      const result = getNextStatuses('editing', 'admin')
      expect(result).toEqual(['fb_waiting', 'cancelled'])
    })

    it('fb_waiting からは fb_responded と cancelled へ遷移できる', () => {
      const result = getNextStatuses('fb_waiting', 'admin')
      expect(result).toEqual(['fb_responded', 'cancelled'])
    })

    it('fb_responded からは fix_editing と cancelled へ遷移できる', () => {
      const result = getNextStatuses('fb_responded', 'admin')
      expect(result).toEqual(['fix_editing', 'cancelled'])
    })

    it('fix_editing からは re_fb_waiting と cancelled へ遷移できる', () => {
      const result = getNextStatuses('fix_editing', 'admin')
      expect(result).toEqual(['re_fb_waiting', 'cancelled'])
    })

    it('re_fb_waiting からは completed と cancelled へ遷移できる', () => {
      const result = getNextStatuses('re_fb_waiting', 'admin')
      expect(result).toEqual(['completed', 'cancelled'])
    })

    it('completed からは遷移先がない（空配列）', () => {
      expect(getNextStatuses('completed', 'admin')).toEqual([])
    })

    it('cancelled からは遷移先がない（空配列）', () => {
      expect(getNextStatuses('cancelled', 'admin')).toEqual([])
    })
  })

  describe('user ロール', () => {
    it('inquiry からは遷移先がない（空配列）', () => {
      expect(getNextStatuses('inquiry', 'user')).toEqual([])
    })

    it('shooting_scheduled からは shooting_done へ遷移できる', () => {
      const result = getNextStatuses('shooting_scheduled', 'user')
      expect(result).toEqual(['shooting_done'])
    })

    it('shooting_done からは遷移先がない（空配列）', () => {
      expect(getNextStatuses('shooting_done', 'user')).toEqual([])
    })

    it('editing からは fb_waiting へ遷移できる', () => {
      const result = getNextStatuses('editing', 'user')
      expect(result).toEqual(['fb_waiting'])
    })

    it('fb_waiting からは fb_responded へ遷移できる', () => {
      const result = getNextStatuses('fb_waiting', 'user')
      expect(result).toEqual(['fb_responded'])
    })

    it('fb_responded からは遷移先がない（空配列）', () => {
      expect(getNextStatuses('fb_responded', 'user')).toEqual([])
    })

    it('fix_editing からは re_fb_waiting へ遷移できる', () => {
      const result = getNextStatuses('fix_editing', 'user')
      expect(result).toEqual(['re_fb_waiting'])
    })

    it('re_fb_waiting からは遷移先がない（空配列）', () => {
      expect(getNextStatuses('re_fb_waiting', 'user')).toEqual([])
    })

    it('completed からは遷移先がない（空配列）', () => {
      expect(getNextStatuses('completed', 'user')).toEqual([])
    })

    it('cancelled からは遷移先がない（空配列）', () => {
      expect(getNextStatuses('cancelled', 'user')).toEqual([])
    })
  })

  it('イミュータブルを確認: 返された配列を変更しても元のデータに影響しない', () => {
    const statuses = getNextStatuses('inquiry', 'admin')
    statuses.push('completed' as ProjectStatus)
    // 再取得しても変化していないこと
    expect(getNextStatuses('inquiry', 'admin')).toEqual(['shooting_scheduled', 'cancelled'])
  })
})

describe('isValidTransition', () => {
  describe('有効な遷移はtrue', () => {
    it('admin: inquiry → shooting_scheduled', () => {
      expect(isValidTransition('inquiry', 'shooting_scheduled', 'admin')).toBe(true)
    })

    it('admin: inquiry → cancelled', () => {
      expect(isValidTransition('inquiry', 'cancelled', 'admin')).toBe(true)
    })

    it('admin: shooting_scheduled → shooting_done', () => {
      expect(isValidTransition('shooting_scheduled', 'shooting_done', 'admin')).toBe(true)
    })

    it('admin: editing → cancelled', () => {
      expect(isValidTransition('editing', 'cancelled', 'admin')).toBe(true)
    })

    it('admin: re_fb_waiting → completed', () => {
      expect(isValidTransition('re_fb_waiting', 'completed', 'admin')).toBe(true)
    })

    it('user: shooting_scheduled → shooting_done', () => {
      expect(isValidTransition('shooting_scheduled', 'shooting_done', 'user')).toBe(true)
    })

    it('user: editing → fb_waiting', () => {
      expect(isValidTransition('editing', 'fb_waiting', 'user')).toBe(true)
    })

    it('user: fb_waiting → fb_responded', () => {
      expect(isValidTransition('fb_waiting', 'fb_responded', 'user')).toBe(true)
    })

    it('user: fix_editing → re_fb_waiting', () => {
      expect(isValidTransition('fix_editing', 're_fb_waiting', 'user')).toBe(true)
    })
  })

  describe('無効な遷移はfalse', () => {
    it('user: inquiry → shooting_scheduled（ユーザーは inquiry から進められない）', () => {
      expect(isValidTransition('inquiry', 'shooting_scheduled', 'user')).toBe(false)
    })

    it('user: shooting_done → editing（ユーザーは shooting_done から進められない）', () => {
      expect(isValidTransition('shooting_done', 'editing', 'user')).toBe(false)
    })

    it('user: fb_responded → fix_editing（ユーザーは fb_responded から進められない）', () => {
      expect(isValidTransition('fb_responded', 'fix_editing', 'user')).toBe(false)
    })

    it('user: re_fb_waiting → completed（ユーザーは re_fb_waiting から進められない）', () => {
      expect(isValidTransition('re_fb_waiting', 'completed', 'user')).toBe(false)
    })

    it('admin: completed → inquiry（完了済みからは遷移不可）', () => {
      expect(isValidTransition('completed', 'inquiry', 'admin')).toBe(false)
    })

    it('admin: completed → cancelled（完了済みからは遷移不可）', () => {
      expect(isValidTransition('completed', 'cancelled', 'admin')).toBe(false)
    })

    it('admin: cancelled → inquiry（キャンセル済みからは遷移不可）', () => {
      expect(isValidTransition('cancelled', 'inquiry', 'admin')).toBe(false)
    })

    it('admin: cancelled → shooting_scheduled（キャンセル済みからは遷移不可）', () => {
      expect(isValidTransition('cancelled', 'shooting_scheduled', 'admin')).toBe(false)
    })

    it('user: editing → cancelled（ユーザーは cancelled へ遷移不可）', () => {
      expect(isValidTransition('editing', 'cancelled', 'user')).toBe(false)
    })

    it('admin: inquiry → completed（中間ステータスをスキップ不可）', () => {
      expect(isValidTransition('inquiry', 'completed', 'admin')).toBe(false)
    })

    it('admin: shooting_scheduled → editing（中間ステータスをスキップ不可）', () => {
      expect(isValidTransition('shooting_scheduled', 'editing', 'admin')).toBe(false)
    })
  })

  describe('adminはcancelledへの遷移が可能', () => {
    const cancelableStatuses: ProjectStatus[] = [
      'inquiry',
      'shooting_scheduled',
      'shooting_done',
      'editing',
      'fb_waiting',
      'fb_responded',
      'fix_editing',
      're_fb_waiting',
    ]

    cancelableStatuses.forEach((status) => {
      it(`admin: ${status} → cancelled は有効`, () => {
        expect(isValidTransition(status, 'cancelled', 'admin')).toBe(true)
      })
    })
  })

  describe('userはcancelledへの遷移が不可', () => {
    const allStatuses: ProjectStatus[] = [
      'inquiry',
      'shooting_scheduled',
      'shooting_done',
      'editing',
      'fb_waiting',
      'fb_responded',
      'fix_editing',
      're_fb_waiting',
    ]

    allStatuses.forEach((status) => {
      it(`user: ${status} → cancelled は無効`, () => {
        expect(isValidTransition(status, 'cancelled', 'user')).toBe(false)
      })
    })
  })
})
