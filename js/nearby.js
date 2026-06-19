import { LOCATION_COORDS, getDistance } from './constants.js'

const DEFAULT_CENTER = LOCATION_COORDS['Đại học Công nghệ Thông tin & TT Việt-Hàn (VKU)']

export function getPosterCoords(item, idx = 0) {
  if (item.latitude != null && item.longitude != null) {
    return { lat: item.latitude, lng: item.longitude, fromPoster: true }
  }
  const base = LOCATION_COORDS[item.location] || DEFAULT_CENTER
  return {
    lat: base.lat + Math.sin(idx + (item.title?.length || 0)) * 0.0045,
    lng: base.lng + Math.cos(idx * 2) * 0.0045,
    fromPoster: false,
  }
}

export function rankNearbyItems(items, center, options = {}) {
  const maxRange = options.maxRange ?? 1500
  const typeFilter = options.typeFilter || ''

  return items
    .map((item, idx) => {
      const coords = getPosterCoords(item, idx)
      const distance = getDistance(center.lat, center.lng, coords.lat, coords.lng)
      return { ...item, distance, coords, hasPosterCoords: coords.fromPoster }
    })
    .filter((item) => item.distance <= maxRange)
    .filter((item) => !typeFilter || item.exchange_type === typeFilter)
    .sort((a, b) => a.distance - b.distance)
}

export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)} km`
}