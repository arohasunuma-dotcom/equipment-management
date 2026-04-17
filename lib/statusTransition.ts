import type { ProjectStatus, WorkType } from '../types/projects'

type Role = 'user' | 'admin'

// 編集案件用：各ステータスから遷移できる先をロール別に定義
const TRANSITIONS: Record<ProjectStatus, { admin: ProjectStatus[]; user: ProjectStatus[] }> = {
  inquiry: {
    admin: ['shooting_scheduled', 'cancelled'],  // 旧ステータス用（後方互換）
    user: ['shooting_scheduled'],
  },
  shooting_scheduled: {
    admin: ['shooting_done', 'cancelled'],
    user: ['shooting_done'],
  },
  shooting_done: {
    admin: ['editing', 'cancelled'],
    user: [],
  },
  editing: {
    admin: ['fb_waiting', 'cancelled'],
    user: ['fb_waiting'],
  },
  fb_waiting: {
    admin: ['fb_responded', 'cancelled'],
    user: ['fb_responded'],
  },
  fb_responded: {
    admin: ['fix_editing', 'cancelled'],
    user: [],
  },
  fix_editing: {
    admin: ['re_fb_waiting', 'cancelled'],
    user: ['re_fb_waiting'],
  },
  re_fb_waiting: {
    admin: ['completed', 'cancelled'],
    user: [],
  },
  completed: {
    admin: [],
    user: [],
  },
  cancelled: {
    admin: [],
    user: [],
  },
}

// 撮影のみ案件：撮影前 → 完了 の2択のみ
const SHOOTING_ONLY_TRANSITIONS: Partial<Record<ProjectStatus, { admin: ProjectStatus[]; user: ProjectStatus[] }>> = {
  shooting_scheduled: {
    admin: ['completed', 'cancelled'],
    user: ['completed'],
  },
}

/**
 * 現在のステータスとロールから、遷移可能な次のステータス一覧を返す
 */
export function getNextStatuses(
  currentStatus: ProjectStatus,
  role: Role,
  workType?: WorkType,
): ProjectStatus[] {
  if (workType === 'shooting_only') {
    const transitions = SHOOTING_ONLY_TRANSITIONS[currentStatus]
    if (!transitions) return []
    return role === 'admin' ? [...transitions.admin] : [...transitions.user]
  }
  const transitions = TRANSITIONS[currentStatus]
  return role === 'admin' ? [...transitions.admin] : [...transitions.user]
}

/**
 * 指定したステータス遷移がロールに対して有効かどうかを返す
 */
export function isValidTransition(
  from: ProjectStatus,
  to: ProjectStatus,
  role: Role,
  workType?: WorkType,
): boolean {
  return getNextStatuses(from, role, workType).includes(to)
}
