import { VIETMAP_API_KEY } from './config.js'
import { LOCATIONS, LOCATION_COORDS, getDistance } from './constants.js'

const DEFAULT_CENTER = { lat: 15.9752, lng: 108.2497 }
const CDN_CSS = 'https://unpkg.com/@vietmap/vietmap-gl-js@6.0.1/dist/vietmap-gl.css'
const CDN_JS = 'https://unpkg.com/@vietmap/vietmap-gl-js@6.0.1/dist/vietmap-gl.js'

const EXCHANGE_COLORS = {
  mienphi: '#22c55e',
  traodoi: '#3b82f6',
  sale: '#f59e0b',
  lost: '#ef4444',
}

let loadPromise = null

export function hasMapsKey() {
  return Boolean(VIETMAP_API_KEY?.trim())
}

function styleUrl() {
  return hasMapsKey()
    ? `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=${VIETMAP_API_KEY}`
    : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
}

function ensureCss() {
  if (document.querySelector('link[data-vietmap-css]')) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = CDN_CSS
  link.dataset.vietmapCss = '1'
  document.head.appendChild(link)
}

export function loadVietMap() {
  if (window.vietmapgl) return Promise.resolve(window.vietmapgl)
  if (loadPromise) return loadPromise

  ensureCss()
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = CDN_JS
    script.async = true
    script.onload = () => resolve(window.vietmapgl)
    script.onerror = () => reject(new Error('Không tải được thư viện VietMap GL'))
    document.head.appendChild(script)
  })

  return loadPromise
}

export function findNearestLocation(lat, lng) {
  let best = LOCATIONS[0]
  let minDist = Infinity
  for (const name of LOCATIONS) {
    const c = LOCATION_COORDS[name]
    if (!c) continue
    const d = getDistance(lat, lng, c.lat, c.lng)
    if (d < minDist) {
      minDist = d
      best = name
    }
  }
  return best
}

function locationLabel(lat, lng, preset) {
  if (preset && LOCATION_COORDS[preset]) return preset
  for (const name of LOCATIONS) {
    const c = LOCATION_COORDS[name]
    if (!c) continue
    if (getDistance(lat, lng, c.lat, c.lng) < 120) return name
  }
  return `Tọa độ [${lat.toFixed(5)}, ${lng.toFixed(5)}]`
}

function pinEl(color, size = 14) {
  const el = document.createElement('div')
  el.innerHTML = `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 10px ${color}"></span>`
  return el
}

function waitMapLoad(map) {
  return new Promise((resolve) => {
    if (map.loaded()) resolve()
    else map.once('load', resolve)
  })
}

export async function initMapPicker(container, options = {}) {
  const el = typeof container === 'string' ? document.getElementById(container) : container
  if (!el) throw new Error('Không tìm thấy container bản đồ')

  const vm = await loadVietMap()
  const initial = options.lat != null && options.lng != null
    ? { lat: options.lat, lng: options.lng }
    : (LOCATION_COORDS[options.location] || DEFAULT_CENTER)

  const map = new vm.Map({
    container: el,
    style: styleUrl(),
    center: [initial.lng, initial.lat],
    zoom: options.zoom || 15,
    pitch: 25,
  })

  let marker = null
  const state = { lat: initial.lat, lng: initial.lng, location: options.location || '' }

  function emitChange(presetName) {
    if (!marker) return
    const ll = marker.getLngLat()
    state.lat = ll.lat
    state.lng = ll.lng
    state.location = locationLabel(state.lat, state.lng, presetName)
    options.onCoordsChange?.(state.lat, state.lng)
    options.onLocationChange?.(state.location, state.lat, state.lng)
  }

  function placeMarker(lat, lng, draggable = true) {
    if (marker) {
      marker.setLngLat([lng, lat])
      return
    }
    marker = new vm.Marker({ element: pinEl('#ef4444', 16), draggable })
      .setLngLat([lng, lat])
      .addTo(map)
    if (draggable) marker.on('dragend', () => emitChange())
  }

  await waitMapLoad(map)
  map.addControl(new vm.NavigationControl(), 'top-right')
  placeMarker(initial.lat, initial.lng)

  map.on('click', (e) => {
    placeMarker(e.lngLat.lat, e.lngLat.lng)
    emitChange()
  })

  if (options.location && !options.lat) emitChange(options.location)

  return {
    map,
    marker,
    getCoords: () => ({ lat: state.lat, lng: state.lng }),
    getLocation: () => state.location,
    setPosition(lat, lng, locationName) {
      placeMarker(lat, lng)
      map.easeTo({ center: [lng, lat], zoom: 15 })
      state.lat = lat
      state.lng = lng
      if (locationName) {
        state.location = locationName
        options.onLocationChange?.(locationName, lat, lng)
      } else {
        emitChange()
      }
      options.onCoordsChange?.(lat, lng)
    },
    setByLocationName(name) {
      const coords = LOCATION_COORDS[name]
      if (coords) this.setPosition(coords.lat, coords.lng, name)
    },
    locateUser() {
      if (!navigator.geolocation) return Promise.reject(new Error('Trình duyệt không hỗ trợ GPS'))
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude
            const lng = pos.coords.longitude
            this.setPosition(lat, lng)
            resolve({ lat, lng })
          },
          () => reject(new Error('Không lấy được vị trí GPS')),
          { enableHighAccuracy: true, timeout: 10000 }
        )
      })
    },
    destroy() {
      marker?.remove()
      map.remove()
    },
  }
}

export async function initStaticMap(container, lat, lng, options = {}) {
  const el = typeof container === 'string' ? document.getElementById(container) : container
  if (!el || lat == null || lng == null) return null

  const vm = await loadVietMap()
  const map = new vm.Map({
    container: el,
    style: styleUrl(),
    center: [lng, lat],
    zoom: options.zoom || 16,
    pitch: 25,
    interactive: true,
  })

  await waitMapLoad(map)
  map.addControl(new vm.NavigationControl(), 'top-right')
  new vm.Marker({ element: pinEl(options.color || '#3b82f6', 16) })
    .setLngLat([lng, lat])
    .addTo(map)

  return map
}

export async function initItemsMap(container, items, options = {}) {
  const el = typeof container === 'string' ? document.getElementById(container) : container
  if (!el) throw new Error('Không tìm thấy container bản đồ')

  const vm = await loadVietMap()
  const center = options.center || DEFAULT_CENTER

  const map = new vm.Map({
    container: el,
    style: styleUrl(),
    center: [center.lng, center.lat],
    zoom: options.zoom || 14,
    pitch: 30,
  })

  await waitMapLoad(map)
  map.addControl(new vm.NavigationControl(), 'top-right')

  const markers = []
  const popup = new vm.Popup({ closeButton: true, maxWidth: '240px' })

  items.forEach((item) => {
    if (item.lat == null || item.lng == null) return
    const color = EXCHANGE_COLORS[item.exchange_type] || '#3b82f6'
    const elPin = pinEl(color, 12)
    const marker = new vm.Marker({ element: elPin })
      .setLngLat([item.lng, item.lat])
      .addTo(map)

    elPin.style.cursor = 'pointer'
    elPin.addEventListener('click', (e) => {
      e.stopPropagation()
      const dist = item.distance != null ? `<br><small>Cách bạn ${Math.round(item.distance)}m</small>` : ''
      popup.setLngLat([item.lng, item.lat])
        .setHTML(`<div style="font-family:system-ui,sans-serif;padding:4px"><strong>${item.title}</strong>${dist}<br><a href="detail.html?id=${item.id}">Xem chi tiết →</a></div>`)
        .addTo(map)
      options.onItemClick?.(item)
    })

    markers.push({ marker, item })
  })

  if (options.userPosition) {
    new vm.Marker({ element: pinEl('#3b82f6', 14) })
      .setLngLat([options.userPosition.lng, options.userPosition.lat])
      .addTo(map)
  }

  return {
    map,
    markers,
    popup,
    infoWindow: popup,
    fitBounds() {
      if (!markers.length) return
      const bounds = new vm.LngLatBounds()
      markers.forEach(({ item }) => bounds.extend([item.lng, item.lat]))
      if (options.userPosition) bounds.extend([options.userPosition.lng, options.userPosition.lat])
      map.fitBounds(bounds, { padding: 48, maxZoom: 16 })
    },
  }
}

export function renderMapPlaceholder(container, message) {
  const el = typeof container === 'string' ? document.getElementById(container) : container
  if (!el) return
  el.innerHTML = `
    <div class="map-placeholder">
      <span class="map-placeholder__icon">🗺️</span>
      <p>${message || 'Không tải được bản đồ VietMap'}</p>
      <small>${hasMapsKey() ? 'Kiểm tra API key VietMap' : 'Thêm VIETMAP_API_KEY trong js/config.js để dùng bản đồ Việt Nam'}</small>
    </div>
  `
}