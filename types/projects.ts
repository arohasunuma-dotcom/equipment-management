// ENUM types
export type OutsourcerType = 'shooting' | 'editing'
export type WorkType = 'shooting_only' | 'editing_only' | 'shooting_and_editing'
export type ShootingType = 'smartphone' | 'dslr'

export type ProjectStatus =
  | 'inquiry'
  | 'shooting_scheduled'
  | 'shooting_done'
  | 'editing'
  | 'fb_waiting'
  | 'fb_responded'
  | 'fix_editing'
  | 're_fb_waiting'
  | 'completed'
  | 'cancelled'

export type ProjectType = 'room_tour' | 'interview' | 'texture' | 'other'

export interface Outsourcer {
  id: string
  name: string
  type: OutsourcerType
  is_active: boolean
  notes?: string | null
  created_at: string
}

export interface ProjectOutsourcer {
  id: string
  project_id: string
  outsourcer_id: string
  outsourcer?: Outsourcer | null
  amount: number
  notes?: string | null
  delivered_at?: string | null
  created_at: string
}
export type VideoFormat = 'landscape' | 'portrait' | 'square'
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'skipped'
export type FeedbackType = 'first' | 'second' | 'third'
export type YoutubePostStatus = 'scheduled' | 'posted' | 'cancelled'

// Entity interfaces
export interface Client {
  id: string
  name: string
  areas?: string[] | null
  contact_name?: string | null
  contact_email?: string | null
  contact_slack_id?: string | null
  notes?: string | null
  created_at: string
}

export interface Project {
  id: string
  title: string
  client_id?: string | null
  client?: Client | null
  type: ProjectType
  work_type: WorkType
  format: VideoFormat
  status: ProjectStatus
  shooting_type?: ShootingType | null
  shooting_date?: string | null
  editing_start_date?: string | null
  fb_deadline?: string | null
  re_fb_deadline?: string | null
  delivery_date?: string | null
  youtube_publish_date?: string | null
  assigned_editor_id?: string | null
  assigned_editor?: ProjectUser | null
  cameraman_id?: string | null
  cameraman_ids?: string[] | null
  editor_member_id?: string | null
  director_id?: string | null
  shooting_location?: string | null
  model_name?: string | null
  kickoff_done: boolean
  calendar_done: boolean
  rental_car_done: boolean
  hotel_done: boolean
  transport_reservation_done: boolean
  equipment_reservation_done: boolean
  memo?: string | null
  notes?: string | null
  deleted_at?: string | null
  created_at: string
  updated_at: string
}

export interface ProjectUser {
  id: string
  name: string
  email: string
}

export interface TaskBatch {
  id: string
  project_id: string
  name: string
  due_date?: string | null
  shooting_date?: string | null
  outsourcer_id?: string | null
  outsourcer_amount?: number | null
  delivered_at?: string | null
  outsourcer?: { id: string; name: string; type: OutsourcerType } | null
  shooting_type?: ShootingType | null
  format?: VideoFormat | null
  cameraman_ids?: string[] | null
  type?: ProjectType | null
  editor_member_id?: string | null
  editor_member?: { id: string; name: string } | null
  created_at: string
  tasks?: Task[]
}

export interface Task {
  id: string
  project_id: string
  batch_id?: string | null
  step_order: number
  title: string
  status: TaskStatus
  due_date?: string | null
  assignee_id?: string | null
  assignee?: ProjectUser | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface FeedbackRecord {
  id: string
  project_id: string
  type: FeedbackType
  received_at: string
  responded_at?: string | null
  notes?: string | null
}

export interface NotificationLog {
  id: string
  project_id?: string | null
  type: string
  sent_at: string
  recipient_slack_id?: string | null
  message?: string | null
}

export interface CalendarEvent {
  id: string
  google_event_id?: string | null
  project_id?: string | null
  title: string
  start_datetime: string
  end_datetime: string
  synced_at: string
}

export interface YoutubeAccount {
  id: string
  channel_name: string
  channel_id: string
  contact_name?: string | null
  notes?: string | null
  member_id?: string | null
  member?: { id: string; name: string } | null
  spreadsheet_url?: string | null
}

export type YoutubeVideoLength = 'short' | 'long'
export type YoutubeScheduleStatus = 'pending' | 'editing' | 'delivered' | 'reserved' | 'posted'

export interface MilestoneEntry {
  date: string | null
  done: boolean
}

export interface YoutubeMilestones {
  shooting?: MilestoneEntry
  editing?: MilestoneEntry
  thumbnail?: MilestoneEntry
  [key: string]: MilestoneEntry | undefined
}

export interface YoutubeOutsourcerEntry {
  outsourcer_id: string
  name: string
  amount: number
}

export interface YoutubeSchedule {
  id: string
  youtube_account_id: string
  youtube_account?: YoutubeAccount | null
  post_date?: string | null
  post_confirmed: boolean
  post_reserved: boolean
  property_name?: string | null
  video_length: YoutubeVideoLength
  status: string
  content_type?: string | null
  progress: number
  member_id?: string | null
  member?: { id: string; name: string } | null
  milestones: YoutubeMilestones
  youtube_outsourcers: YoutubeOutsourcerEntry[]
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface YoutubePost {
  id: string
  project_id: string
  youtube_account_id: string
  youtube_account?: YoutubeAccount | null
  scheduled_date?: string | null
  status: YoutubePostStatus
  posted_at?: string | null
  notes?: string | null
}

export interface AppSetting {
  id: string
  key: string
  value: string
  updated_at: string
}

export interface StaffMemberRef {
  id: string
  name: string
}

// Extended types with relations
export interface ProjectWithRelations extends Project {
  client?: Client | null
  assigned_editor?: ProjectUser | null
  cameraman?: StaffMemberRef | null
  editor_member?: StaffMemberRef | null
  director?: StaffMemberRef | null
  tasks?: Task[]
  task_batches?: TaskBatch[]
  project_outsourcers?: ProjectOutsourcer[]
  feedback_records?: FeedbackRecord[]
  youtube_posts?: YoutubePost[]
}

// API response type
export interface ProjectApiResponse<T> {
  data: T | null
  error: { code: string; message: string } | null
}
