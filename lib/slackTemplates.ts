import type { Project, FeedbackType } from '@/types/projects'
import type { ProjectStatus } from '@/types/projects'
import { STATUS_LABELS } from '@/lib/projectConstants'

function formatJpDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${year}/${month}/${day}`
}

export function statusChangedMessage(project: Project, newStatus: ProjectStatus): string {
  const statusLabel = STATUS_LABELS[newStatus]
  return `📋 案件「${project.title}」のステータスが「${statusLabel}」に変更されました`
}

const FB_TYPE_LABELS: Record<FeedbackType, string> = {
  first: '初回',
  second: '2回目',
  third: '3回目',
}

export function fbReceivedMessage(project: Project, fbType: FeedbackType): string {
  const typeLabel = FB_TYPE_LABELS[fbType]
  const deadline = project.fb_deadline ? `期限: ${formatJpDate(project.fb_deadline)}` : ''
  const suffix = deadline ? `。${deadline}` : ''
  return `📥 案件「${project.title}」の${typeLabel}FBを受領しました${suffix}`
}

export function dailyDigestMessage(projects: Project[]): string {
  if (projects.length === 0) {
    return '📋 本日の進行中案件はありません。'
  }

  const lines = projects.map((p) => {
    const status = STATUS_LABELS[p.status]
    const deadline = p.fb_deadline ? ` | FB期限: ${formatJpDate(p.fb_deadline)}` : ''
    return `• ${p.title}（${status}）${deadline}`
  })

  return [`📋 本日の進行中案件一覧（${projects.length}件）`, ...lines].join('\n')
}

export function fbReminderMessage(project: Project): string {
  const deadline = project.fb_deadline ? formatJpDate(project.fb_deadline) : ''
  const deadlineText = deadline ? `（期限: ${deadline}）` : ''
  return `⚠️ 案件「${project.title}」のFB期限が3日以内です${deadlineText}`
}
