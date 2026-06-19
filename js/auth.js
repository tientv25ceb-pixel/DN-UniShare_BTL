import { supabase } from './supabase.js'
import { isAllowedStudentEmail, inferFacultyFromEmail } from './constants.js'
import { showToast } from './ui.js'

let cachedProfile = null

function getCallbackUrl() {
  const path = window.location.pathname
  const knownRoots = ['app', 'auth', 'css', 'js', 'assets', 'index.html']
  const segments = path.split('/').filter(Boolean)
  const base = (segments.length > 0 && !knownRoots.includes(segments[0])) ? '/' + segments[0] : ''
  return `${window.location.origin}${base}/auth/callback.html`
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getProfile() {
  const session = await getSession()
  if (!session) return null
  if (cachedProfile?.id === session.user.id) return cachedProfile

  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, avatar, faculty, role')
    .eq('id', session.user.id)
    .single()

  if (error) {
    console.error('getProfile:', error.message)
    if (error.code === 'PGRST116') {
      try {
        await ensureUserProfile(session.user)
        const { data: retryData, error: retryError } = await supabase
          .from('users')
          .select('id, email, name, avatar, faculty, role')
          .eq('id', session.user.id)
          .single()
        if (retryData) {
          cachedProfile = retryData
          return retryData
        }
        if (retryError) console.error('getProfile retry:', retryError.message)
      } catch (err) {
        console.error('Failed to auto-create user profile:', err.message)
      }
    }
    return null
  }

  cachedProfile = data
  return data
}

export async function requireAuth(redirectTo = '../auth/login.html') {
  const session = await getSession()
  if (!session) {
    window.location.href = redirectTo
    return null
  }
  return session
}

export async function requireAdmin(redirectTo = 'items.html') {
  const profile = await getProfile()
  if (!profile || profile.role !== 'admin') {
    showToast('Bạn không có quyền truy cập trang này', 'error')
    window.location.href = redirectTo
    return null
  }
  return profile
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getCallbackUrl(),
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })
  if (error) throw error
}

export async function signInAdmin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error

  cachedProfile = null
  const profile = await getProfile()

  if (!profile || profile.role !== 'admin') {
    await supabase.auth.signOut()
    cachedProfile = null
    throw new Error('Tài khoản này không có quyền admin. Sinh viên vui lòng đăng nhập bằng Google.')
  }

  return data
}

export async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) throw exchangeError
  }

  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!session) throw new Error('Không lấy được phiên đăng nhập. Vui lòng thử lại.')

  const email = session.user.email
  if (!isAllowedStudentEmail(email)) {
    await supabase.auth.signOut()
    cachedProfile = null
    throw new Error(
      `Email ${email} không thuộc trường được phép. Chỉ chấp nhận email sinh viên Làng Đại học Đà Nẵng.`
    )
  }

  await ensureUserProfile(session.user)
  cachedProfile = null
  return session
}

async function ensureUserProfile(user) {
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  const meta = user.user_metadata || {}
  const name = meta.full_name || meta.name || user.email?.split('@')[0] || 'Sinh viên'
  const avatar = meta.avatar_url || meta.picture || null
  const faculty = inferFacultyFromEmail(user.email)

  if (existing) {
    await supabase
      .from('users')
      .update({ name, avatar, faculty, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    return
  }

  const { error } = await supabase.from('users').insert({
    id: user.id,
    email: user.email,
    name,
    avatar,
    faculty,
    role: 'user',
  })

  if (error) throw error
}

export async function signOut() {
  cachedProfile = null
  await supabase.auth.signOut()
  const path = window.location.pathname
  const prefix = path.includes('/app/') || path.includes('/auth/') ? '../' : ''
  window.location.href = `${prefix}index.html`
}

export function clearProfileCache() {
  cachedProfile = null
}