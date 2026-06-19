import { supabase } from './supabase.js'
import { formatDate } from './ui.js'

export async function fetchConversations() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .contains('participant_ids', [user.id])
    .order('last_message_time', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getOrCreateConversation(profile, otherUserId, otherUserName, itemId, itemTitle) {
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .contains('participant_ids', [profile.id, otherUserId])
    .maybeSingle()

  if (existing) return existing

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      participant_ids: [profile.id, otherUserId],
      participant_names: [profile.name, otherUserName],
      item_id: itemId || null,
      item_title: itemTitle || '',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function fetchMessages(conversationId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function sendMessage(conversationId, senderId, text) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, text })
    .select()
    .single()

  if (error) throw error

  await supabase.from('conversations').update({
    last_message: text,
    last_message_time: new Date().toISOString(),
  }).eq('id', conversationId)

  return data
}

export function subscribeMessages(conversationId, onMessage) {
  return supabase
    .channel(`messages:${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, (payload) => onMessage(payload.new))
    .subscribe()
}

export function renderConversationRow(conv, userId) {
  const otherIdx = conv.participant_ids[0] === userId ? 1 : 0
  const otherName = conv.participant_names[otherIdx] || 'Người dùng'
  return `
    <a href="chat-room.html?id=${conv.id}" class="chat-row">
      <div class="chat-row__avatar">${otherName[0]}</div>
      <div class="chat-row__body">
        <div class="chat-row__top">
          <strong>${otherName}</strong>
          <span class="chat-row__time">${formatDate(conv.last_message_time)}</span>
        </div>
        <p class="chat-row__preview">${conv.item_title ? `📦 ${conv.item_title} · ` : ''}${conv.last_message || 'Bắt đầu trò chuyện'}</p>
      </div>
    </a>
  `
}