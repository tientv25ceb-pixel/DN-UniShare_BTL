let toastContainer = null

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.className = 'toast-container'
    document.body.appendChild(toastContainer)
  }
  return toastContainer
}

export function showToast(message, type = 'info') {
  const container = getToastContainer()
  const toast = document.createElement('div')
  toast.className = `toast toast--${type}`
  toast.textContent = message
  container.appendChild(toast)
  setTimeout(() => toast.remove(), 4000)
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getInitials(name) {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function renderSkeletonCards(count = 6) {
  return Array.from({ length: count }, () => `
    <div class="card" style="cursor:default;pointer-events:none">
      <div class="skeleton" style="aspect-ratio:4/3"></div>
      <div class="card__body">
        <div class="skeleton" style="height:18px;width:80%;margin-bottom:8px"></div>
        <div class="skeleton" style="height:14px;width:50%"></div>
      </div>
    </div>
  `).join('')
}

export function openModal(id) {
  document.getElementById(id)?.classList.remove('hidden')
}

export function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden')
}