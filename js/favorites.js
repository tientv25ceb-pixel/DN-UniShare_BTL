import { supabase } from './supabase.js'

let cache = null

export async function fetchFavoriteIds() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase.from('favorites').select('item_id').eq('user_id', user.id)
  if (error) throw error
  cache = (data || []).map((f) => f.item_id)
  return cache
}

export function getFavoriteIds() {
  return cache || []
}

export async function toggleFavorite(itemId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Vui lòng đăng nhập')

  const ids = await fetchFavoriteIds()
  const isFav = ids.includes(itemId)

  if (isFav) {
    const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('item_id', itemId)
    if (error) throw error
    cache = ids.filter((id) => id !== itemId)
    return false
  }

  const { error } = await supabase.from('favorites').insert({ user_id: user.id, item_id: itemId })
  if (error && error.code !== '23505') throw error
  cache = [...ids, itemId]
  return true
}