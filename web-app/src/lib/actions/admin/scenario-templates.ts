'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { isSystemAdmin } from '@/lib/dal/admin/auth'
import type { ActionResult } from '@/types/index'
import type { Json } from '@/types/database'

// ---------------------------------------------------------------------------
// Auth helper (copied from trigger-cron.ts)
// ---------------------------------------------------------------------------

async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const admin = await isSystemAdmin(user.id)
  if (!admin) return { error: 'Not authorized — system admin required' }

  return { userId: user.id }
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const SLUG_REGEX = /^[a-z][a-z0-9_]*$/

const INPUT_TYPES = ['team_pick', 'player_pick', 'range', 'yes_no'] as const

const RESOLUTION_PHASES = [
  'toss',
  'first_wicket',
  'team_powerplay_end',
  'mid_match',
  'team_innings_end',
  'end',
  'post_match',
] as const

const baseSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(
      SLUG_REGEX,
      'Slug must start with a lowercase letter, followed by lowercase letters, digits, or underscores',
    ),
  title: z.string().min(1, 'Title is required'),
  sport_id: z.string().uuid('Sport is required'),
  input_type: z.enum(INPUT_TYPES),
  options: z.unknown().nullable(),
  points: z.number().int().min(1, 'Points must be at least 1'),
  resolution_phase: z.enum(RESOLUTION_PHASES),
  is_active: z.boolean(),
})

// For create, options is required when input_type is range
const createSchema = baseSchema.superRefine((data, ctx) => {
  if (data.input_type === 'range') {
    if (data.options === null || data.options === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Options are required when input type is range',
        path: ['options'],
      })
    }
  }
})

// For update, slug is NOT included (immutable)
const updateSchema = baseSchema.omit({ slug: true }).superRefine((data, ctx) => {
  if (data.input_type === 'range') {
    if (data.options === null || data.options === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Options are required when input type is range',
        path: ['options'],
      })
    }
  }
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreateTemplateInput = z.input<typeof baseSchema>
export type UpdateTemplateInput = z.input<typeof updateSchema>

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * Create a new scenario template.
 */
export async function createScenarioTemplate(
  data: CreateTemplateInput,
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const parsed = createSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
  }

  const { slug, title, sport_id, input_type, options, points, resolution_phase, is_active } =
    parsed.data

  const supabase = createServiceRoleClient()

  // Clean options: set to null if input_type is not range
  const cleanOptions = input_type === 'range' ? options : null

  const { error } = await supabase.from('v2_scenario_templates').insert({
    slug,
    title,
    sport_id,
    input_type,
    options: cleanOptions as Json,
    points,
    resolution_phase,
    is_active,
  })

  if (error) {
    // Check for unique constraint violation
    if (error.code === '23505') {
      return { success: false, error: `A template with slug "${slug}" already exists` }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/reference')
  return { success: true }
}

/**
 * Update an existing scenario template. Slug is NOT updatable.
 */
export async function updateScenarioTemplate(
  id: string,
  data: UpdateTemplateInput,
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  if (!id) return { success: false, error: 'Template ID is required' }

  const parsed = updateSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
  }

  const { title, sport_id, input_type, options, points, resolution_phase, is_active } =
    parsed.data

  const supabase = createServiceRoleClient()

  // Clean options: set to null if input_type is not range
  const cleanOptions = input_type === 'range' ? options : null

  const { data: updated, error } = await supabase
    .from('v2_scenario_templates')
    .update({
      title,
      sport_id,
      input_type,
      options: cleanOptions as Json,
      points,
      resolution_phase,
      is_active,
    })
    .eq('id', id)
    .select('id')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, error: 'Template not found' }
    }
    return { success: false, error: error.message }
  }

  if (!updated) {
    return { success: false, error: 'Template not found' }
  }

  revalidatePath('/admin/reference')
  return { success: true }
}

/**
 * Toggle the is_active flag on a scenario template.
 */
export async function toggleScenarioTemplateActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  if (!id) return { success: false, error: 'Template ID is required' }

  const supabase = createServiceRoleClient()

  const { data: updated, error } = await supabase
    .from('v2_scenario_templates')
    .update({ is_active: isActive })
    .eq('id', id)
    .select('id')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, error: 'Template not found' }
    }
    return { success: false, error: error.message }
  }

  if (!updated) {
    return { success: false, error: 'Template not found' }
  }

  revalidatePath('/admin/reference')
  return { success: true }
}

/**
 * Delete a scenario template. Only allowed when seeded count is 0.
 */
export async function deleteScenarioTemplate(
  id: string,
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  if (!id) return { success: false, error: 'Template ID is required' }

  const supabase = createServiceRoleClient()

  // Check seeded count before deleting
  const { count, error: countError } = await supabase
    .from('v2_fixture_scenarios')
    .select('id', { count: 'exact', head: true })
    .eq('template_id', id)

  if (countError) {
    return { success: false, error: countError.message }
  }

  if (count && count > 0) {
    return {
      success: false,
      error: `Cannot delete — this template has been seeded to ${count} fixture scenarios. Deactivate it instead.`,
    }
  }

  const { error } = await supabase
    .from('v2_scenario_templates')
    .delete()
    .eq('id', id)

  if (error) {
    // DB constraint catch (ON DELETE RESTRICT)
    if (error.code === '23503') {
      return {
        success: false,
        error: 'Cannot delete — this template has been seeded to fixtures. Deactivate it instead.',
      }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/reference')
  return { success: true }
}
