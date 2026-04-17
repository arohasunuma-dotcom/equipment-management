import { createAdminClient } from '@/lib/supabase/server'
import type { WorkType } from '@/types/projects'

interface StaffMember { id: string; name: string }

interface MemberCapacity {
  id: string
  name: string
  editingCount: number
  shootingCount: number
  youtubeCount: number
  projectTitles: { id: string; title: string; workType?: WorkType }[]
}

export default async function CapacityPage() {
  const supabase = await createAdminClient()

  const [
    { data: allStaff },
    { data: projects, error },
    { data: youtubeSchedules },
  ] = await Promise.all([
    supabase.from('staff_members').select('id, name').eq('is_active', true).order('name'),
    supabase
      .from('projects')
      .select('id, title, work_type, cameraman_id, cameraman_ids, editor_member_id, director_id')
      .not('status', 'in', '("completed","cancelled")')
      .is('deleted_at', null),
    supabase
      .from('youtube_schedules')
      .select('member_id')
      .not('status', 'eq', 'posted'),
  ])

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 text-sm">
        データの取得に失敗しました: {error.message}
      </div>
    )
  }

  // 全スタッフのキャパシティマップを初期化
  const capacityMap = new Map<string, MemberCapacity>()
  for (const s of allStaff ?? []) {
    capacityMap.set(s.id, {
      id: s.id,
      name: s.name,
      editingCount: 0,
      shootingCount: 0,
      youtubeCount: 0,
      projectTitles: [],
    })
  }

  // YouTube件数をカウント
  for (const ys of youtubeSchedules ?? []) {
    if (ys.member_id && capacityMap.has(ys.member_id)) {
      capacityMap.get(ys.member_id)!.youtubeCount++
    }
  }

  // プロジェクト集計（director, editor_member, cameramanを個別にカウント）
  for (const p of projects ?? []) {
    const wt = p.work_type as WorkType | undefined
    const hasEditing = wt === 'editing_only' || wt === 'shooting_and_editing'
    const hasShooting = wt === 'shooting_only' || wt === 'shooting_and_editing'

    const addProject = (memberId: string | null) => {
      if (!memberId) return
      const entry = capacityMap.get(memberId)
      if (!entry) return
      // 同一プロジェクトが重複しないようにチェック
      if (!entry.projectTitles.find((t) => t.id === p.id)) {
        entry.projectTitles.push({ id: p.id, title: p.title, workType: wt })
      }
    }

    if (p.director_id) {
      const entry = capacityMap.get(p.director_id)
      if (entry && hasEditing) { entry.editingCount++; addProject(p.director_id) }
    }
    if (p.editor_member_id) {
      const entry = capacityMap.get(p.editor_member_id)
      if (entry && hasEditing) { entry.editingCount++; addProject(p.editor_member_id) }
    }
    const camIds: string[] = (p.cameraman_ids as string[] | null) ?? (p.cameraman_id ? [p.cameraman_id] : [])
    for (const camId of camIds) {
      const entry = capacityMap.get(camId)
      if (entry && hasShooting) {
        entry.shootingCount++
        addProject(camId)
      }
    }
  }

  const capacities = Array.from(capacityMap.values()).sort((a, b) => {
    const totalA = a.editingCount + a.shootingCount + a.youtubeCount
    const totalB = b.editingCount + b.shootingCount + b.youtubeCount
    return totalB - totalA
  })

  const totalActive = projects?.length ?? 0

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">キャパシティ管理</h1>
        <span className="text-sm text-gray-500">進行中案件: 全{totalActive}件</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {capacities.map((mc) => {
          const total = mc.editingCount + mc.shootingCount + mc.youtubeCount
          const colorClass =
            total >= 5 ? 'border-red-200 bg-red-50'
            : total >= 3 ? 'border-yellow-200 bg-yellow-50'
            : 'border-gray-100 bg-white'

          return (
            <div key={mc.id} className={`rounded-2xl shadow-sm border p-5 space-y-4 ${colorClass}`}>
              {/* ヘッダー */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-bold shrink-0">
                    {mc.name.charAt(0)}
                  </div>
                  <span className="font-semibold text-gray-900 text-sm">{mc.name}</span>
                </div>
                <span className={`text-2xl font-bold ${
                  total >= 5 ? 'text-red-600'
                  : total >= 3 ? 'text-yellow-600'
                  : total > 0 ? 'text-blue-600'
                  : 'text-gray-300'
                }`}>
                  {total}
                </span>
              </div>

              {/* 担当内訳 */}
              <div className="flex flex-wrap gap-2">
                {mc.editingCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    編集 {mc.editingCount}件
                  </span>
                )}
                {mc.shootingCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    撮影 {mc.shootingCount}件
                  </span>
                )}
                {mc.youtubeCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    YouTube {mc.youtubeCount}件
                  </span>
                )}
                {total === 0 && (
                  <span className="text-xs text-gray-400 italic">担当なし</span>
                )}
              </div>

              {/* 担当案件リスト */}
              {mc.projectTitles.length > 0 && (
                <ul className="space-y-1.5">
                  {mc.projectTitles.map((p) => (
                    <li key={p.id} className="flex items-center gap-2">
                      <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                        p.workType === 'shooting_only' ? 'bg-amber-400'
                        : p.workType === 'editing_only' ? 'bg-blue-400'
                        : 'bg-purple-400'
                      }`} />
                      <a
                        href={`/projects/${p.id}?from=capacity`}
                        className="text-xs text-gray-700 hover:text-blue-600 truncate transition-colors"
                      >
                        {p.title}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
