import { supabase } from './supabase.js'
import { CATEGORY_MAP, CATEGORY_LABELS, CONDITION_LABELS, EXCHANGE_LABELS, STATUS_LABELS, LOCATION_COORDS, parseExchangeWant, parseLostPlace } from './constants.js'

import { formatDate } from './ui.js'

export async function fetchAvailableItems(filters = {}) {
  let query = supabase
    .from('items')
    .select('*')
    .eq('status', 'available')
    .neq('exchange_type', 'found')
    .order('created_at', { ascending: false })

  if (filters.category) query = query.eq('category', filters.category)
  if (filters.condition) query = query.eq('condition', filters.condition)
  if (filters.exchangeType) query = query.eq('exchange_type', filters.exchangeType)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function fetchItemById(id) {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createItem(itemData) {
  const { data, error } = await supabase
    .from('items')
    .insert({ ...itemData, status: 'pending' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function uploadImage(file, userId) {
  const ext = file.name.split('.').pop()
  const path = `${userId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('items')
    .upload(path, file)

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('items').getPublicUrl(path)
  return data.publicUrl
}

function detailUrl(id) {
  return (window.location.pathname.includes('/app/') ? '' : 'app/') + `detail.html?id=${id}`
}

export function renderItemCard(item, opts = {}) {
  const img = item.image || 'https://placehold.co/400x300/1a1a1d/5c5c62?text=No+Image'
  const cat = CATEGORY_MAP[item.category] || { label: item.category, emoji: '📦' }
  const exchange = EXCHANGE_LABELS[item.exchange_type] || item.exchange_type
  const price = item.price ? `<span class="badge badge--warning">${Number(item.price).toLocaleString('vi-VN')}đ</span>` : ''
  const want = item.exchange_type === 'traodoi' ? parseExchangeWant(item.description) : null
  const wantLine = want ? `<p class="card__meta" style="margin-top:4px">🔄 Đổi lấy: ${want}</p>` : ''
  const lostPlace = item.exchange_type === 'lost' ? parseLostPlace(item.description) : null
  const lostLine = lostPlace ? `<p class="card__meta" style="margin-top:4px">📍 Có thể mất tại: ${lostPlace}</p>` : ''
  const rewardLine = item.exchange_type === 'lost' && item.reward ? `<p class="card__meta" style="margin-top:4px">🎁 Thưởng: ${item.reward}</p>` : ''
  const fav = opts.favorited ? '<span style="position:absolute;top:10px;right:10px">❤️</span>' : ''

  return `
    <article class="card" style="position:relative" data-id="${item.id}" onclick="location.href='${detailUrl(item.id)}'">
      ${fav}
      <img class="card__image" src="${img}" alt="${item.title}" loading="lazy">
      <div class="card__body">
        <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap">
          <span class="badge badge--primary">${cat.emoji} ${cat.label}</span>
          <span class="badge badge--accent">${exchange}</span>
          ${price}
        </div>
        <h3 class="card__title">${item.title}</h3>
        <p class="card__meta">📍 ${item.location}</p>
        ${wantLine}
        ${lostLine}
        ${rewardLine}
        <p class="card__meta" style="margin-top:4px">👤 ${item.posted_by}</p>
      </div>
    </article>
  `
}

export function getItemCoords(item, idx = 0) {
  if (item.latitude != null && item.longitude != null) {
    return { lat: item.latitude, lng: item.longitude }
  }
  const base = LOCATION_COORDS[item.location] || LOCATION_COORDS['Đại học Công nghệ Thông tin & TT Việt-Hàn (VKU)']
  return {
    lat: base.lat + Math.sin(idx + (item.title?.length || 0)) * 0.0045,
    lng: base.lng + Math.cos(idx * 2) * 0.0045,
  }
}

export async function updateItem(id, data) {
  const { data: result, error } = await supabase.from('items').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw error
  return result
}

export async function deleteItem(id) {
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw error
}

export async function fetchMyItems(userId) {
  const { data, error } = await supabase.from('items').select('*').eq('poster_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export function renderAdminItemCard(item, showActions = true) {
  const img = item.image || 'https://placehold.co/400x300/e5e7eb/9ca3af?text=No+Image'
  const statusBadge = {
    pending: 'badge--warning',
    available: 'badge--success',
    rejected: 'badge--danger',
  }[item.status] || 'badge--neutral'

  const actions = showActions && item.status === 'pending' ? `
    <div class="request-item__actions">
      <button class="btn btn--success btn--sm" data-approve="${item.id}">Duyệt</button>
      <button class="btn btn--danger btn--sm" data-reject="${item.id}">Từ chối</button>
    </div>
  ` : ''

  const rejection = item.rejection_reason
    ? `<p class="card__meta" style="color:var(--color-danger);margin-top:8px">Lý do: ${item.rejection_reason}</p>`
    : ''

  return `
    <div class="request-item" data-item-id="${item.id}">
      <img src="${img}" alt="" style="width:80px;height:60px;object-fit:cover;border-radius:8px;flex-shrink:0">
      <div class="request-item__info" style="flex:1;min-width:200px">
        <h3>${item.title}</h3>
        <p class="request-item__meta">
          👤 ${item.posted_by} · ${item.poster_faculty || 'Khác'} · ${formatDate(item.created_at)}
        </p>
        <p class="request-item__meta" style="margin-top:4px">${item.description?.slice(0, 120)}...</p>
        <div style="margin-top:8px">
          <span class="badge ${statusBadge}">${STATUS_LABELS[item.status] || item.status}</span>
        </div>
        ${rejection}
      </div>
      ${actions}
    </div>
  `
}