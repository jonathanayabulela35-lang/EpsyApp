// Compatibility layer: keeps the existing code working while switching
// the backend from Base44 to Supabase.
//
// After migration is stable, you can rename this to supabaseClient.js
// and update imports across the app.

import { supabase } from '@/lib/supabaseClient'

const TABLES = {
  // Core content
  Challenge: 'challenges',
  ChallengeDay: 'challenge_days',
  DecoderContent: 'decoder_contents',
  QuestionTemplate: 'question_templates',

  // Student state
  StudentProgress: 'student_progress',
  WordBookmark: 'word_bookmarks',

  // School / licensing
  School: 'schools',
  SchoolPlan: 'school_plans',
  StudentCredential: 'student_credentials',

  // Users
  User: 'profiles',
}

function parseOrder(order) {
  if (!order || typeof order !== 'string') return null
  const trimmed = order.trim()
  if (!trimmed) return null
  const desc = trimmed.startsWith('-')
  const column = desc ? trimmed.slice(1) : trimmed
  return { column, ascending: !desc }
}

function applyFilters(q, filters = {}) {
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value === undefined) return
    if (value === null) {
      q = q.is(key, null)
      return
    }
    q = q.eq(key, value)
  })
  return q
}

function handleError(res, context) {
  if (res?.error) {
    const err = new Error(res.error.message || 'Supabase error')
    err.status = res.status
    err.data = res.error
    err.context = context
    throw err
  }
}

function entity(tableName) {
  return {
    async list(order) {
      let q = supabase.from(tableName).select('*')
      const o = parseOrder(order)
      if (o) q = q.order(o.column, { ascending: o.ascending })
      const res = await q
      handleError(res, `list:${tableName}`)
      return res.data ?? []
    },

    async filter(filters, order) {
      let q = supabase.from(tableName).select('*')
      q = applyFilters(q, filters)
      const o = parseOrder(order)
      if (o) q = q.order(o.column, { ascending: o.ascending })
      const res = await q
      handleError(res, `filter:${tableName}`)
      return res.data ?? []
    },

    async create(data) {
      const res = await supabase.from(tableName).insert(data).select('*').single()
      handleError(res, `create:${tableName}`)
      return res.data
    },

    async update(id, data) {
      const res = await supabase.from(tableName).update(data).eq('id', id).select('*').single()
      handleError(res, `update:${tableName}`)
      return res.data
    },

    async delete(id) {
      const res = await supabase.from(tableName).delete().eq('id', id)
      handleError(res, `delete:${tableName}`)
      return true
    },
  }
}

export const base44 = {
  // Auth is now Supabase Auth.
  auth: {
    async me() {
      const { data: userRes, error: userErr } = await supabase.auth.getUser()
      if (userErr) {
        const err = new Error(userErr.message)
        err.status = 401
        throw err
      }
      const authUser = userRes?.user
      if (!authUser) {
        const err = new Error('Not authenticated')
        err.status = 401
        throw err
      }

      // Join with profile data (role, school, preferences).
      const profileRes = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      handleError(profileRes, 'auth:me:profiles')

      return {
        id: authUser.id,
        email: authUser.email,
        ...profileRes.data,
      }
    },

    async updateMe(data) {
      const { data: userRes, error: userErr } = await supabase.auth.getUser()
      if (userErr || !userRes?.user) {
        const err = new Error(userErr?.message || 'Not authenticated')
        err.status = 401
        throw err
      }

      const res = await supabase
        .from('profiles')
        .upsert({ id: userRes.user.id, ...data }, { onConflict: 'id' })
        .select('*')
        .single()
      handleError(res, 'auth:updateMe')
      return res.data
    },

    async logout(redirectUrl) {
      await supabase.auth.signOut()
      if (redirectUrl) window.location.href = redirectUrl
    },

    redirectToLogin(redirectUrl) {
      const to = redirectUrl ? encodeURIComponent(redirectUrl) : ''
      window.location.href = to ? `/login?redirect=${to}` : '/login'
    },
  },

  // Edge functions / server actions.
  functions: {
    async invoke(name, payload) {
      const res = await supabase.functions.invoke(name, { body: payload })
      if (res.error) {
        const err = new Error(res.error.message || 'Function error')
        err.status = res.status
        err.data = res.error
        throw err
      }
      return { data: res.data }
    },
  },

  // Entities
  entities: Object.fromEntries(
    Object.entries(TABLES).map(([entityName, tableName]) => [entityName, entity(tableName)])
  ),

  // Optional logging hook (previously Base44 app logs). Safe no-op.
  appLogs: {
    async logUserInApp(_pageName) {
      return true
    },
  },
}
