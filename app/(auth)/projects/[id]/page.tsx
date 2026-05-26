import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/components/projects/StatusBadge'
import { ProjectDetailClient } from '@/components/projects/ProjectDetailClient'

export const dynamic = 'force-dynamic'
import type { ProjectWithRelations, Outsourcer } from '@/types/projects'

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }

export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { from } = await searchParams
  const supabase = await createAdminClient()

  const [{ data, error }, { data: batchesData }, { data: tasksData }, { data: outsourcersData }, { data: projectOutsourcersData }, { data: staffMembersData }] = await Promise.all([
    supabase
      .from('projects')
      .select(
        `*,
        client:clients(id, name),
        assigned_editor:users(id, name),
        cameraman:staff_members!cameraman_id(id, name),
        editor_member:staff_members!editor_member_id(id, name),
        director:staff_members!director_id(id, name)`
      )
      .eq('id', id)
      .single(),
    supabase
      .from('task_batches')
      .select('id, name, due_date, shooting_date, shooting_type, format, cameraman_ids, type, editor_member_id, outsourcer_id, outsourcer_amount, delivered_at, created_at, outsourcer:outsourcers(id, name, type)')
      .eq('project_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('tasks')
      .select('*')
      .eq('project_id', id)
      .order('step_order', { ascending: true }),
    supabase
      .from('outsourcers')
      .select('id, name, type, is_active, created_at')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('project_outsourcers')
      .select('id, outsourcer_id, amount, notes, delivered_at, outsourcer:outsourcers(id, name, type)')
      .eq('project_id', id),
    supabase
      .from('staff_members')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
  ])

  if (error || !data) {
    notFound()
  }

  // task_batches に tasks をマージ
  const mergedBatches = (batchesData ?? []).map((b) => ({
    ...b,
    tasks: (tasksData ?? []).filter((t) => t.batch_id === b.id),
  }))

  const project = {
    ...data,
    task_batches: mergedBatches,
    project_outsourcers: projectOutsourcersData ?? [],
  } as ProjectWithRelations
  const outsourcers = (outsourcersData ?? []) as Outsourcer[]

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 戻るボタン */}
      <Link
        href={from === 'capacity' ? '/capacity' : '/projects'}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {from === 'capacity' ? 'キャパシティ管理' : '案件一覧'}
      </Link>

      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
            <StatusBadge status={project.status} />
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
            {project.client && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {project.client.name}
              </span>
            )}
            {project.assigned_editor && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {project.assigned_editor.name}
              </span>
            )}
          </div>
        </div>
        <Link
          href={`/projects/${id}/edit`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          編集
        </Link>
      </div>

      {/* クライアントコンポーネント（タスク・FB・YouTube・ステータス遷移） */}
      <ProjectDetailClient project={project} outsourcers={outsourcers} staffMembers={staffMembersData ?? []} />
    </div>
  )
}
