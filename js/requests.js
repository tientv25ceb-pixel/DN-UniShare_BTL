import { supabase } from './supabase.js'
import { REQUEST_STATUS_LABELS } from './constants.js'
import { formatDate } from './ui.js'

export async function sendRequest(item, profile) {
  const { data, error } = await supabase
    .from('requests')
    .insert({
      item_id: item.id,
      item_title: item.title,
      requester_id: profile.id,
      requester_name: profile.name,
      poster_name: item.posted_by,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error

  await supabase
    .from('items')
    .update({ requested_count: (item.requested_count || 0) + 1 })
    .eq('id', item.id)

  return data
}

export async function fetchSentRequests(userId) {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('requester_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function fetchReceivedRequests(userId) {
  const { data: items } = await supabase
    .from('items')
    .select('id')
    .eq('poster_id', userId)

  if (!items?.length) return []

  const itemIds = items.map((i) => i.id)
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .in('item_id', itemIds)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function updateRequestStatus(requestId, status) {
  const { data, error } = await supabase
    .from('requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single()

  if (error) throw error

  if (status === 'accepted') {
    const req = data
    await supabase.from('items').update({ status: 'reserved' }).eq('id', req.item_id)
  }

  return data
}

export async function getExistingRequest(itemId, userId) {
  const { data } = await supabase
    .from('requests')
    .select('id, status')
    .eq('item_id', itemId)
    .eq('requester_id', userId)
    .maybeSingle()

  return data
}

export function renderRequestCard(req, type = 'sent') {
  const badgeClass = {
    pending: 'badge--warning',
    accepted: 'badge--success',
    rejected: 'badge--danger',
    collected: 'badge--primary',
  }[req.status] || 'badge--neutral'

  const actions = type === 'received' && req.status === 'pending' ? `
    <div class="request-item__actions">
      <button class="btn btn--success btn--sm" data-accept="${req.id}">Chấp nhận</button>
      <button class="btn btn--danger btn--sm" data-reject-req="${req.id}">Từ chối</button>
    </div>
  ` : ''

  return `
    <div class="request-item">
      <div class="request-item__info">
        <h3>${req.item_title}</h3>
        <p class="request-item__meta">
          ${type === 'sent' ? `Gửi tới: ${req.poster_name}` : `Từ: ${req.requester_name}`}
          · ${formatDate(req.created_at)}
        </p>
        <span class="badge ${badgeClass}">${REQUEST_STATUS_LABELS[req.status]}</span>
      </div>
      ${actions}
    </div>
  `
}