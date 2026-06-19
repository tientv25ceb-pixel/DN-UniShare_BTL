import { supabase } from './supabase.js'
import { renderAdminItemCard } from './items.js'
import { showToast, openModal, closeModal } from './ui.js'

let rejectItemId = null

export async function fetchItemsByStatus(status) {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function approveItem(itemId) {
  const { error } = await supabase
    .from('items')
    .update({ status: 'available', updated_at: new Date().toISOString() })
    .eq('id', itemId)

  if (error) throw error
}

export async function rejectItem(itemId, reason = '') {
  const { error } = await supabase
    .from('items')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)

  if (error) throw error
}

export async function initAdminPage() {
  const listEl = document.getElementById('admin-list')
  const tabs = document.querySelectorAll('.tab')
  let currentStatus = 'pending'

  async function load(status) {
    currentStatus = status
    listEl.innerHTML = '<p style="text-align:center;padding:40px">Đang tải...</p>'

    try {
      const items = await fetchItemsByStatus(status)
      if (!items.length) {
        listEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state__icon">📭</div>
            <p class="empty-state__title">Không có tin nào</p>
            <p>Danh sách ${status === 'pending' ? 'chờ duyệt' : status} đang trống.</p>
          </div>
        `
        return
      }

      listEl.innerHTML = `<div class="request-list">${items.map((item) => renderAdminItemCard(item, status === 'pending')).join('')}</div>`
      bindActions()
    } catch (err) {
      listEl.innerHTML = `<p style="color:var(--color-danger);text-align:center">${err.message}</p>`
    }
  }

  function bindActions() {
    listEl.querySelectorAll('[data-approve]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true
        try {
          await approveItem(btn.dataset.approve)
          showToast('Đã duyệt bài đăng', 'success')
          load(currentStatus)
        } catch (err) {
          showToast(err.message, 'error')
          btn.disabled = false
        }
      })
    })

    listEl.querySelectorAll('[data-reject]').forEach((btn) => {
      btn.addEventListener('click', () => {
        rejectItemId = btn.dataset.reject
        document.getElementById('reject-reason').value = ''
        openModal('reject-modal')
      })
    })
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('tab--active'))
      tab.classList.add('tab--active')
      load(tab.dataset.status)
    })
  })

  document.getElementById('btn-cancel-reject')?.addEventListener('click', () => {
    closeModal('reject-modal')
    rejectItemId = null
  })

  document.getElementById('btn-confirm-reject')?.addEventListener('click', async () => {
    if (!rejectItemId) return
    const reason = document.getElementById('reject-reason').value.trim()
    try {
      await rejectItem(rejectItemId, reason)
      showToast('Đã từ chối bài đăng', 'success')
      closeModal('reject-modal')
      rejectItemId = null
      load(currentStatus)
    } catch (err) {
      showToast(err.message, 'error')
    }
  })

  await load('pending')
}