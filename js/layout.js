import { getProfile, signOut } from './auth.js'
import { getInitials } from './ui.js'

const NAV = [
  { id: 'items', file: '/app/items.html', label: 'Khám phá', icon: '🔍' },
  { id: 'nearby', file: '/app/nearby.html', label: 'Quanh đây', icon: '📍' },
  { id: 'post', file: '/app/post/index.html', label: 'Đăng tin', icon: '➕' },
  { id: 'chat', file: '/app/chat.html', label: 'Tin nhắn', icon: '💬' },
]

const BOTTOM = [
  { id: 'home', file: '/index.html', label: 'Trang chủ', icon: '🏠' },
  { id: 'items', file: '/app/items.html', label: 'Khám phá', icon: '🔍' },
  { id: 'post', file: '/app/post/index.html', label: 'Đăng', icon: '➕', prominent: true },
  { id: 'nearby', file: '/app/nearby.html', label: 'Quanh đây', icon: '📍' },
  { id: 'account', label: 'Tài khoản', icon: '👤', account: true },
]

const ACCOUNT = [
  { id: 'profile', file: '/app/profile.html', label: 'Cá nhân', icon: '👤' },
  { id: 'favorites', file: '/app/favorites.html', label: 'Yêu thích', icon: '❤️' },
  { id: 'requests', file: '/app/requests.html', label: 'Yêu cầu', icon: '📋' },
  { id: 'chat', file: '/app/chat.html', label: 'Tin nhắn', icon: '💬' },
  { id: 'impact', file: '/app/impact.html', label: 'Tác động', icon: '🌱' },
  { id: 'about', file: '/app/about.html', label: 'Giới thiệu', icon: 'ℹ️' },
  { id: 'admin', file: '/app/admin.html', label: 'Duyệt bài', icon: '🛡️', adminOnly: true },
]

const ACCOUNT_IDS = new Set(['profile', 'favorites', 'requests', 'chat', 'impact', 'about', 'admin', 'account'])

export function getBasePath() {
  const path = window.location.pathname
  const knownRoots = ['app', 'auth', 'css', 'js', 'assets', 'index.html']
  const segments = path.split('/').filter(Boolean)
  if (segments.length > 0 && !knownRoots.includes(segments[0])) {
    return '/' + segments[0]
  }
  return ''
}

function resolvePaths() {
  const base = getBasePath()
  const path = window.location.pathname
  const root = base + '/index.html'
  const auth = base + '/auth/login.html'
  const logo = base + '/assets/images/logo.png'

  if (/\/app\/post\/(?:give|exchange|sell|lost)\/?/.test(path)) {
    return { prefix: '../../', root, auth, logo }
  }
  if (path.includes('/app/post/')) {
    return { prefix: '../', root, auth, logo }
  }
  if (path.includes('/app/')) {
    return { prefix: '', root, auth, logo }
  }
  if (path.includes('/auth/')) {
    return { prefix: '/app/', root, auth, logo }
  }
  return { prefix: '/app/', root, auth, logo }
}

function href(paths, file) {
  const base = getBasePath()
  if (file.startsWith('/')) {
    return base + file
  }
  if (file.startsWith('../index')) {
    return base + paths.root
  }
  return paths.prefix + file
}

function bottomActiveId(activeId) {
  return ACCOUNT_IDS.has(activeId) ? 'account' : activeId
}

export async function initSiteLayout(activeId) {
  const profile = await getProfile()
  const isAdmin = profile?.role === 'admin'
  const paths = resolvePaths()
  const tabActive = bottomActiveId(activeId)

  const header = document.getElementById('site-header')
  if (header) {
    const navLinks = NAV.map((n) => `
      <a href="${href(paths, n.file)}" class="site-nav__link${activeId === n.id ? ' site-nav__link--active' : ''}">
        <span>${n.icon}</span> ${n.label}
      </a>
    `).join('')

    const accountMenu = profile ? `
      <div class="site-nav__dropdown" id="account-dropdown">
        <button type="button" class="site-nav__user" id="account-toggle" aria-expanded="false">
          <span class="site-nav__avatar">${profile.avatar ? `<img src="${profile.avatar}" alt="">` : getInitials(profile.name)}</span>
          <span class="site-nav__name">${profile.name}</span>
          <span class="site-nav__caret">▾</span>
        </button>
        <div class="site-nav__menu hidden" id="account-menu">
          ${ACCOUNT.filter((m) => !m.adminOnly || isAdmin).map((m) => `
            <a href="${href(paths, m.file)}" class="site-nav__menu-item${activeId === m.id ? ' site-nav__menu-item--active' : ''}">
              <span>${m.icon}</span> ${m.label}
            </a>
          `).join('')}
          <button type="button" class="site-nav__menu-item site-nav__menu-item--danger" id="btn-logout">🚪 Thoát</button>
        </div>
      </div>
    ` : `<a href="${paths.auth}" class="btn btn--primary btn--sm">Đăng nhập</a>`

    header.innerHTML = `
      <nav class="site-nav">
        <a href="${paths.root}" class="site-nav__brand">
          <img src="${paths.logo}" alt="ĐN-UniShare" class="site-nav__logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <span class="site-nav__logo-fallback" style="display:none">ĐN</span>
        </a>
        <div class="site-nav__links">${navLinks}</div>
        <div class="site-nav__actions">${accountMenu}</div>
        <button class="site-nav__burger" id="nav-burger" aria-label="Menu">☰</button>
      </nav>
      <div class="site-nav__mobile hidden" id="nav-mobile">${navLinks}</div>
    `

    document.getElementById('btn-logout')?.addEventListener('click', signOut)

    const toggle = document.getElementById('account-toggle')
    const menu = document.getElementById('account-menu')
    toggle?.addEventListener('click', (e) => {
      e.stopPropagation()
      const open = menu?.classList.toggle('hidden')
      toggle.setAttribute('aria-expanded', String(!open))
    })
    document.addEventListener('click', () => menu?.classList.add('hidden'))

    document.getElementById('nav-burger')?.addEventListener('click', () => {
      document.getElementById('nav-mobile')?.classList.toggle('hidden')
    })
  }

  const bottom = document.getElementById('bottom-nav')
  if (bottom) {
    bottom.className = 'bottom-tab-bar'
    bottom.innerHTML = BOTTOM.map((t) => {
      if (t.account) {
        return `<button class="bottom-tab${tabActive === 'account' ? ' bottom-tab--active' : ''}" data-account-btn type="button"><span>${t.icon}</span><small>${t.label}</small></button>`
      }
      const cls = t.prominent ? ' bottom-tab--prominent' : (tabActive === t.id ? ' bottom-tab--active' : '')
      return `<a href="${href(paths, t.file)}" class="bottom-tab${cls}"><span>${t.icon}</span><small>${t.label}</small></a>`
    }).join('')

    document.getElementById('account-sheet')?.remove()

    bottom.insertAdjacentHTML('afterend', `
      <div class="more-sheet hidden" id="account-sheet">
        <div class="more-sheet__backdrop" data-close-account></div>
        <div class="more-sheet__panel">
          ${profile ? `
            <div class="account-sheet__profile">
              <span class="site-nav__avatar">${profile.avatar ? `<img src="${profile.avatar}" alt="">` : getInitials(profile.name)}</span>
              <div>
                <strong>${profile.name}</strong>
                <p class="card__meta">${profile.email}</p>
              </div>
            </div>
          ` : ''}
          <div class="more-sheet__grid">
            ${ACCOUNT.filter((m) => !m.adminOnly || isAdmin).map((m) => `
              <a href="${href(paths, m.file)}" class="more-sheet__item"><span>${m.icon}</span>${m.label}</a>
            `).join('')}
          </div>
          ${profile ? `<button type="button" class="btn btn--ghost btn--full" id="btn-logout-mobile" style="margin-top:var(--space-4)">Thoát</button>` : ''}
        </div>
      </div>
    `)

    bottom.querySelector('[data-account-btn]')?.addEventListener('click', () => {
      document.getElementById('account-sheet')?.classList.remove('hidden')
    })
    document.querySelector('[data-close-account]')?.addEventListener('click', () => {
      document.getElementById('account-sheet')?.classList.add('hidden')
    })
    document.getElementById('btn-logout-mobile')?.addEventListener('click', signOut)
  }
}