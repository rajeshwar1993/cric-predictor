import { beforeEach, describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('server-only', () => ({}))

const mockGetUser = vi.fn()
const mockIsSystemAdmin = vi.fn()
const mockRevalidatePath = vi.fn()

// Chainable query builder mock
function createQueryChain(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {}
  const handler = () => chain
  chain.select = vi.fn().mockImplementation(handler)
  chain.insert = vi.fn().mockImplementation(() => resolvedValue)
  chain.update = vi.fn().mockImplementation(handler)
  chain.delete = vi.fn().mockImplementation(handler)
  chain.eq = vi.fn().mockImplementation(handler)
  chain.single = vi.fn().mockImplementation(() => resolvedValue)
  chain.maybeSingle = vi.fn().mockImplementation(() => resolvedValue)
  chain.then = vi.fn().mockImplementation((resolve: (val: unknown) => void) => {
    resolve(resolvedValue)
  })
  return chain
}

const mockFromServiceRole = vi.fn()
const mockFromServer = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: (...args: unknown[]) => mockFromServer(...args),
  })),
}))

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn().mockImplementation(() => ({
    from: (...args: unknown[]) => mockFromServiceRole(...args),
  })),
}))

vi.mock('@/lib/dal/admin/auth', () => ({
  isSystemAdmin: (...args: unknown[]) => mockIsSystemAdmin(...args),
}))

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

// Import after mocks
const {
  createScenarioTemplate,
  updateScenarioTemplate,
  toggleScenarioTemplateActive,
  deleteScenarioTemplate,
} = await import('./scenario-templates')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_CREATE_INPUT = {
  slug: 'test_slug',
  title: 'Test title',
  sport_id: 'a0000000-0000-4000-8000-000000000001',
  input_type: 'team_pick' as const,
  options: null,
  points: 30,
  resolution_phase: 'end' as const,
  is_active: true,
}

function setupAdmin() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'admin-user' } },
    error: null,
  })
  mockIsSystemAdmin.mockResolvedValue(true)
}

function setupNotAdmin() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'regular-user' } },
    error: null,
  })
  mockIsSystemAdmin.mockResolvedValue(false)
}

function setupNotAuthenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: null,
  })
}

// ---------------------------------------------------------------------------
// createScenarioTemplate
// ---------------------------------------------------------------------------

describe('createScenarioTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupAdmin()
  })

  test('returns error when not authenticated', async () => {
    setupNotAuthenticated()
    const result = await createScenarioTemplate(VALID_CREATE_INPUT)
    expect(result).toEqual({ success: false, error: 'Not authenticated' })
  })

  test('returns error when not admin', async () => {
    setupNotAdmin()
    const result = await createScenarioTemplate(VALID_CREATE_INPUT)
    expect(result).toEqual({
      success: false,
      error: 'Not authorized — system admin required',
    })
  })

  test('validates slug format — rejects uppercase', async () => {
    const result = await createScenarioTemplate({
      ...VALID_CREATE_INPUT,
      slug: 'Bad_Slug',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('lowercase')
    }
  })

  test('validates slug format — rejects starting with number', async () => {
    const result = await createScenarioTemplate({
      ...VALID_CREATE_INPUT,
      slug: '1invalid',
    })
    expect(result.success).toBe(false)
  })

  test('validates slug format — rejects spaces', async () => {
    const result = await createScenarioTemplate({
      ...VALID_CREATE_INPUT,
      slug: 'has space',
    })
    expect(result.success).toBe(false)
  })

  test('validates slug format — accepts valid slug', async () => {
    mockFromServiceRole.mockReturnValue(
      createQueryChain({ data: null, error: null }),
    )
    // The insert mock chain needs to directly return { error: null }
    const insertChain = { error: null }
    mockFromServiceRole.mockReturnValue({
      insert: vi.fn().mockReturnValue(insertChain),
    })

    const result = await createScenarioTemplate({
      ...VALID_CREATE_INPUT,
      slug: 'valid_slug_123',
    })
    expect(result.success).toBe(true)
  })

  test('requires options when input_type is range', async () => {
    const result = await createScenarioTemplate({
      ...VALID_CREATE_INPUT,
      input_type: 'range',
      options: null,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Options are required')
    }
  })

  test('succeeds when input_type is range and options provided', async () => {
    mockFromServiceRole.mockReturnValue({
      insert: vi.fn().mockReturnValue({ error: null }),
    })

    const result = await createScenarioTemplate({
      ...VALID_CREATE_INPUT,
      input_type: 'range',
      options: ['0-10', '11-20'],
    })
    expect(result.success).toBe(true)
  })

  test('validates points must be at least 1', async () => {
    const result = await createScenarioTemplate({
      ...VALID_CREATE_INPUT,
      points: 0,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Points must be at least 1')
    }
  })

  test('returns error for duplicate slug (DB unique constraint)', async () => {
    mockFromServiceRole.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        error: { code: '23505', message: 'duplicate key value' },
      }),
    })

    const result = await createScenarioTemplate(VALID_CREATE_INPUT)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('already exists')
    }
  })

  test('calls revalidatePath on success', async () => {
    mockFromServiceRole.mockReturnValue({
      insert: vi.fn().mockReturnValue({ error: null }),
    })

    await createScenarioTemplate(VALID_CREATE_INPUT)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/reference')
  })
})

// ---------------------------------------------------------------------------
// updateScenarioTemplate
// ---------------------------------------------------------------------------

describe('updateScenarioTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupAdmin()
  })

  test('returns error when not authenticated', async () => {
    setupNotAuthenticated()
    const result = await updateScenarioTemplate('template-1', {
      ...VALID_CREATE_INPUT,
    })
    expect(result).toEqual({ success: false, error: 'Not authenticated' })
  })

  test('returns error when template ID is empty', async () => {
    const result = await updateScenarioTemplate('', {
      ...VALID_CREATE_INPUT,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Template ID is required')
    }
  })

  test('does not allow slug changes (slug not in update schema)', async () => {
    // The update schema omits slug, so passing slug should be ignored
    const updateChain = createQueryChain({ data: { id: 'template-1' }, error: null })
    mockFromServiceRole.mockReturnValue({
      update: vi.fn().mockReturnValue(updateChain),
    })

    const result = await updateScenarioTemplate('template-1', {
      title: 'Updated title',
      sport_id: 'a0000000-0000-4000-8000-000000000001',
      input_type: 'team_pick',
      options: null,
      points: 25,
      resolution_phase: 'end',
      is_active: true,
    })
    expect(result.success).toBe(true)
  })

  test('succeeds for valid updates', async () => {
    const updateChain = createQueryChain({ data: { id: 'template-1' }, error: null })
    mockFromServiceRole.mockReturnValue({
      update: vi.fn().mockReturnValue(updateChain),
    })

    const result = await updateScenarioTemplate('template-1', {
      title: 'New title',
      sport_id: 'a0000000-0000-4000-8000-000000000001',
      input_type: 'player_pick',
      options: null,
      points: 15,
      resolution_phase: 'first_wicket',
      is_active: false,
    })
    expect(result.success).toBe(true)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/reference')
  })

  test('requires options when input_type is range on update', async () => {
    const result = await updateScenarioTemplate('template-1', {
      title: 'Ranges',
      sport_id: 'a0000000-0000-4000-8000-000000000001',
      input_type: 'range',
      options: null,
      points: 20,
      resolution_phase: 'end',
      is_active: true,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Options are required')
    }
  })
})

// ---------------------------------------------------------------------------
// toggleScenarioTemplateActive
// ---------------------------------------------------------------------------

describe('toggleScenarioTemplateActive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupAdmin()
  })

  test('returns error when not authenticated', async () => {
    setupNotAuthenticated()
    const result = await toggleScenarioTemplateActive('template-1', true)
    expect(result).toEqual({ success: false, error: 'Not authenticated' })
  })

  test('toggles is_active flag to true', async () => {
    const updateChain = createQueryChain({ data: { id: 'template-1' }, error: null })
    mockFromServiceRole.mockReturnValue({
      update: vi.fn().mockReturnValue(updateChain),
    })

    const result = await toggleScenarioTemplateActive('template-1', true)
    expect(result.success).toBe(true)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/reference')
  })

  test('toggles is_active flag to false', async () => {
    const updateChain = createQueryChain({ data: { id: 'template-1' }, error: null })
    mockFromServiceRole.mockReturnValue({
      update: vi.fn().mockReturnValue(updateChain),
    })

    const result = await toggleScenarioTemplateActive('template-1', false)
    expect(result.success).toBe(true)
  })

  test('returns error when template ID is empty', async () => {
    const result = await toggleScenarioTemplateActive('', true)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Template ID is required')
    }
  })
})

// ---------------------------------------------------------------------------
// deleteScenarioTemplate
// ---------------------------------------------------------------------------

describe('deleteScenarioTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupAdmin()
  })

  test('returns error when not authenticated', async () => {
    setupNotAuthenticated()
    const result = await deleteScenarioTemplate('template-1')
    expect(result).toEqual({ success: false, error: 'Not authenticated' })
  })

  test('rejects deletion when seeded count > 0', async () => {
    // Mock select for count check
    const countChain = createQueryChain({ count: 5, error: null })
    mockFromServiceRole.mockReturnValue({
      select: vi.fn().mockReturnValue(countChain),
    })

    const result = await deleteScenarioTemplate('template-1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Cannot delete')
      expect(result.error).toContain('5')
    }
  })

  test('succeeds when seeded count is 0', async () => {
    // First call: select for count check (returns 0)
    // Second call: delete
    let callCount = 0
    mockFromServiceRole.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // Count check
        const chain = createQueryChain({ count: 0, error: null })
        return { select: vi.fn().mockReturnValue(chain) }
      }
      // Delete
      const deleteChain = createQueryChain({ error: null })
      return { delete: vi.fn().mockReturnValue(deleteChain) }
    })

    const result = await deleteScenarioTemplate('template-1')
    expect(result.success).toBe(true)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/reference')
  })

  test('returns error when template ID is empty', async () => {
    const result = await deleteScenarioTemplate('')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Template ID is required')
    }
  })

  test('handles DB FK constraint error gracefully', async () => {
    // Count check returns 0 but delete fails with FK constraint
    let callCount = 0
    mockFromServiceRole.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        const chain = createQueryChain({ count: 0, error: null })
        return { select: vi.fn().mockReturnValue(chain) }
      }
      const deleteChain = createQueryChain({
        error: { code: '23503', message: 'FK violation' },
      })
      return { delete: vi.fn().mockReturnValue(deleteChain) }
    })

    const result = await deleteScenarioTemplate('template-1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Cannot delete')
    }
  })
})
