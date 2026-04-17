import type { ProjectStatus, ProjectType, VideoFormat, TaskStatus, WorkType, OutsourcerType, ShootingType } from '../types/projects'

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  inquiry: '撮影予定',  // 旧ステータス（新規作成では使用しない）
  shooting_scheduled: '撮影予定',
  shooting_done: '撮影完了',
  editing: '編集中',
  fb_waiting: 'FB待ち',
  fb_responded: 'FB返答済み',
  fix_editing: '修正編集中',
  re_fb_waiting: '再FB待ち',
  completed: '完了',
  cancelled: 'キャンセル',
}

// Tailwind CSS クラス（bg-xxx-100 text-xxx-800 形式）
export const STATUS_COLORS: Record<ProjectStatus, string> = {
  inquiry: 'bg-blue-100 text-blue-800',  // 旧ステータス、撮影予定と同じ色
  shooting_scheduled: 'bg-blue-100 text-blue-800',
  shooting_done: 'bg-indigo-100 text-indigo-800',
  editing: 'bg-purple-100 text-purple-800',
  fb_waiting: 'bg-yellow-100 text-yellow-800',
  fb_responded: 'bg-orange-100 text-orange-800',
  fix_editing: 'bg-pink-100 text-pink-800',
  re_fb_waiting: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  room_tour: 'ルームツアー',
  interview: 'インタビュー',
  texture: '質感',
  other: 'その他',
}

// 編集案件で選択できる動画種別（撮影のみでは使わない）
export const EDITING_PROJECT_TYPE_LABELS: Pick<Record<ProjectType, string>, 'room_tour' | 'interview' | 'texture' | 'other'> = {
  room_tour: 'ルームツアー',
  interview: 'インタビュー',
  texture: '質感',
  other: 'その他',
}

export const VIDEO_FORMAT_LABELS: Record<VideoFormat, string> = {
  landscape: '横型',
  portrait: '縦型',
  square: '正方形',
}

// フォームで使う横/縦のみ
export const VIDEO_FORMAT_FORM_LABELS: Partial<Record<VideoFormat, string>> = {
  landscape: '横型',
  portrait: '縦型',
}

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  shooting_only: '撮影のみ',
  editing_only: '編集のみ',
  shooting_and_editing: '撮影＋編集',
}

export const WORK_TYPE_COLORS: Record<WorkType, string> = {
  shooting_only: 'bg-orange-100 text-orange-800',
  editing_only: 'bg-violet-100 text-violet-800',
  shooting_and_editing: 'bg-teal-100 text-teal-800',
}

export const SHOOTING_TYPE_LABELS: Record<ShootingType, string> = {
  smartphone: 'スマホ撮影',
  dslr: '一眼撮影',
}

export const OUTSOURCER_TYPE_LABELS: Record<OutsourcerType, string> = {
  shooting: '撮影外注',
  editing: '編集外注',
}

export const OUTSOURCER_TYPE_COLORS: Record<OutsourcerType, string> = {
  shooting: 'bg-orange-100 text-orange-700',
  editing: 'bg-violet-100 text-violet-700',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: '未着手',
  in_progress: '進行中',
  done: '完了',
  skipped: 'スキップ',
}
