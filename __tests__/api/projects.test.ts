import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Supabase サーバークライアントをモック
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}))

// next/headers をモック（Next.js サーバーコンポーネント依存を回避）
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}))

import { createAdminClient } from '@/lib/supabase/server'
import { GET, POST } from '@/app/api/projects/route'

// ── モックデータ ──────────────────────────────────────────────────────

const mockProjects = [
  {
    id: 'proj-001',
    title: 'テストプロジェクト 1',
    type: 'room_tour',
    format: 'landscape',
    status: 'inquiry',
    client: { id: 'client-001', name: 'テストクライアント' },
    assigned_editor: null,
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z',
  },
  {
    id: 'proj-002',
    title: 'テストプロジェクト 2',
    type: 'other',
    format: 'portrait',
    status: 'editing',
    client: null,
    assigned_editor: { id: 'user-001', name: '編集者A' },
    created_at: '2025-06-02T00:00:00Z',
    updated_at: '2025-06-02T00:00:00Z',
  },
]

// ── ヘルパー ──────────────────────────────────────────────────────────

function makeSupabaseMock(overrides: Record<string, unknown> = {}) {
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  }

  return {
    from: vi.fn().mockReturnValue(queryBuilder),
    _queryBuilder: queryBuilder,
  }
}

// ── テスト ────────────────────────────────────────────────────────────

describe('GET /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('正常系: プロジェクト一覧を返す', async () => {
    const supabaseMock = makeSupabaseMock()
    supabaseMock._queryBuilder.range = vi.fn().mockResolvedValue({
      data: mockProjects,
      error: null,
      count: 2,
    })
    vi.mocked(createAdminClient).mockResolvedValue(supabaseMock as never)

    const req = new NextRequest('http://localhost:3000/api/projects')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.error).toBeNull()
    expect(body.data).toHaveLength(2)
  })

  it('正常系: レスポンスに meta フィールドが含まれる', async () => {
    const supabaseMock = makeSupabaseMock()
    supabaseMock._queryBuilder.range = vi.fn().mockResolvedValue({
      data: mockProjects,
      error: null,
      count: 2,
    })
    vi.mocked(createAdminClient).mockResolvedValue(supabaseMock as never)

    const req = new NextRequest('http://localhost:3000/api/projects?page=1&limit=20')
    const res = await GET(req)
    const body = await res.json()

    expect(body.meta).toBeDefined()
    expect(body.meta.total).toBe(2)
    expect(body.meta.page).toBe(1)
    expect(body.meta.limit).toBe(20)
  })

  it('正常系: page と limit のクエリパラメータが反映される', async () => {
    const supabaseMock = makeSupabaseMock()
    supabaseMock._queryBuilder.range = vi.fn().mockResolvedValue({
      data: [mockProjects[0]],
      error: null,
      count: 5,
    })
    vi.mocked(createAdminClient).mockResolvedValue(supabaseMock as never)

    const req = new NextRequest('http://localhost:3000/api/projects?page=2&limit=1')
    const res = await GET(req)
    const body = await res.json()

    expect(body.meta.page).toBe(2)
    expect(body.meta.limit).toBe(1)
    expect(body.meta.total).toBe(5)
  })

  it('正常系: status フィルタが適用されると eq が呼ばれる', async () => {
    const supabaseMock = makeSupabaseMock()
    supabaseMock._queryBuilder.range = vi.fn().mockResolvedValue({
      data: [mockProjects[1]],
      error: null,
      count: 1,
    })
    vi.mocked(createAdminClient).mockResolvedValue(supabaseMock as never)

    const req = new NextRequest('http://localhost:3000/api/projects?status=editing')
    await GET(req)

    expect(supabaseMock._queryBuilder.eq).toHaveBeenCalledWith('status', 'editing')
  })

  it('エラー系: DB エラー時は 500 と error フィールドを返す', async () => {
    const supabaseMock = makeSupabaseMock()
    supabaseMock._queryBuilder.range = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'データベース接続に失敗しました' },
      count: null,
    })
    vi.mocked(createAdminClient).mockResolvedValue(supabaseMock as never)

    const req = new NextRequest('http://localhost:3000/api/projects')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.data).toBeNull()
    expect(body.error).not.toBeNull()
    expect(body.error.code).toBe('INTERNAL_ERROR')
  })

  it('正常系: データが空でも正常なレスポンス形式を返す', async () => {
    const supabaseMock = makeSupabaseMock()
    supabaseMock._queryBuilder.range = vi.fn().mockResolvedValue({
      data: [],
      error: null,
      count: 0,
    })
    vi.mocked(createAdminClient).mockResolvedValue(supabaseMock as never)

    const req = new NextRequest('http://localhost:3000/api/projects')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual([])
    expect(body.meta.total).toBe(0)
  })
})

describe('POST /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('バリデーションエラー: title がない場合は 422 を返す', async () => {
    const supabaseMock = makeSupabaseMock()
    vi.mocked(createAdminClient).mockResolvedValue(supabaseMock as never)

    const req = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'room_tour',
        format: 'landscape',
      }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.data).toBeNull()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('バリデーションエラー: title が空文字の場合は 422 を返す', async () => {
    const supabaseMock = makeSupabaseMock()
    vi.mocked(createAdminClient).mockResolvedValue(supabaseMock as never)

    const req = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '',
        type: 'room_tour',
        format: 'landscape',
      }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('バリデーションエラー: type が不正な値の場合は 422 を返す', async () => {
    const supabaseMock = makeSupabaseMock()
    vi.mocked(createAdminClient).mockResolvedValue(supabaseMock as never)

    const req = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'テストプロジェクト',
        type: 'invalid_type',
        format: 'landscape',
      }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('バリデーションエラー: format が不正な値の場合は 422 を返す', async () => {
    const supabaseMock = makeSupabaseMock()
    vi.mocked(createAdminClient).mockResolvedValue(supabaseMock as never)

    const req = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'テストプロジェクト',
        type: 'room_tour',
        format: 'invalid_format',
      }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('バリデーションエラー: shooting_date のフォーマットが不正な場合は 422 を返す', async () => {
    const supabaseMock = makeSupabaseMock()
    vi.mocked(createAdminClient).mockResolvedValue(supabaseMock as never)

    const req = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'テストプロジェクト',
        type: 'room_tour',
        format: 'landscape',
        shooting_date: '2025/06/01', // 不正フォーマット（スラッシュ区切り）
      }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('バリデーションエラー: リクエストボディが JSON でない場合は 422 を返す', async () => {
    const supabaseMock = makeSupabaseMock()
    vi.mocked(createAdminClient).mockResolvedValue(supabaseMock as never)

    const req = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json string',
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.data).toBeNull()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('正常系: 有効なデータで 201 を返す', async () => {
    const createdProject = {
      id: 'proj-new-001',
      title: '新規プロジェクト',
      type: 'room_tour',
      format: 'landscape',
      status: 'inquiry',
      created_at: '2025-06-01T00:00:00Z',
      updated_at: '2025-06-01T00:00:00Z',
    }

    const supabaseMock = makeSupabaseMock()

    // tasks.insert のチェーンをモック
    const tasksQueryBuilder = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    }
    supabaseMock.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'tasks') return tasksQueryBuilder
      return {
        ...supabaseMock._queryBuilder,
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: createdProject, error: null }),
          }),
        }),
      }
    })

    vi.mocked(createAdminClient).mockResolvedValue(supabaseMock as never)

    const req = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '新規プロジェクト',
        type: 'room_tour',
        format: 'landscape',
      }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.error).toBeNull()
    expect(body.data).not.toBeNull()
    expect(body.data.title).toBe('新規プロジェクト')
    expect(body.data.status).toBe('inquiry')
  })

  it('エラー系: DB insert エラー時は 500 を返す', async () => {
    const supabaseMock = makeSupabaseMock()
    supabaseMock.from = vi.fn().mockReturnValue({
      ...supabaseMock._queryBuilder,
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'insert failed' },
          }),
        }),
      }),
    })
    vi.mocked(createAdminClient).mockResolvedValue(supabaseMock as never)

    const req = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '新規プロジェクト',
        type: 'room_tour',
        format: 'landscape',
      }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.data).toBeNull()
    expect(body.error.code).toBe('INTERNAL_ERROR')
  })
})
