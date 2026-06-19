export const ALLOWED_EMAIL_DOMAINS = [
  'sv1.dut.udn.vn', 'sv2.dut.udn.vn', 'due.edu.vn', 'ued.udn.vn', 'udn.vn',
]

export function inferFacultyFromEmail(email) {
  const domain = (email || '').split('@')[1]?.toLowerCase() || ''
  if (domain.includes('dut')) return 'CNTT - ĐH Bách Khoa'
  if (domain.includes('due')) return 'Quản trị KD - ĐH Kinh tế'
  if (domain.includes('ued')) return 'Sư phạm Toán - ĐH Sư phạm'
  if (domain.includes('udn')) return 'Khác - ĐH Đà Nẵng'
  return 'Khác'
}

export function isAllowedStudentEmail(email) {
  const domain = (email || '').split('@')[1]?.toLowerCase()
  if (!domain) return false
  return ALLOWED_EMAIL_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d))
}

export const CATEGORY_MAP = {
  sach: { label: 'Sách giáo trình', emoji: '📚' },
  'do-hoc-tap': { label: 'Đồ học tập', emoji: '🎓' },
  'do-ktx': { label: 'Đồ KTX', emoji: '🏠' },
  suatan: { label: 'Suất ăn / Voucher', emoji: '🍜' },
  tailieu: { label: 'Tài liệu', emoji: '📄' },
  khac: { label: 'Khác', emoji: '📦' },
}

export const CATEGORY_LABELS = Object.fromEntries(
  Object.entries(CATEGORY_MAP).map(([k, v]) => [k, v.label])
)

export const CONDITION_LABELS = { moi: 'Mới', tot: 'Tốt', kha: 'Khá', cu: 'Cũ' }

export const EXCHANGE_LABELS = {
  mienphi: 'Tặng miễn phí', traodoi: 'Trao đổi', sale: 'Bán rẻ', lost: 'Tìm đồ',
}

export const STATUS_LABELS = {
  pending: 'Chờ duyệt', available: 'Đang chia sẻ', reserved: 'Đã giữ chỗ',
  completed: 'Hoàn thành', cancelled: 'Đã hủy', rejected: 'Bị từ chối',
}

export const REQUEST_STATUS_LABELS = {
  pending: 'Chờ duyệt', accepted: 'Đã chấp nhận', rejected: 'Từ chối', collected: 'Đã nhận đồ',
}

export const POST_TYPES = {
  give: { exchange: 'mienphi', title: 'Tặng đồ', desc: 'Cho đi món đồ còn tốt', emoji: '🎁', color: 'blue' },
  exchange: { exchange: 'traodoi', title: 'Trao đổi', desc: 'Đổi đồ với sinh viên khác', emoji: '🔄', color: 'cyan' },
  sell: { exchange: 'sale', title: 'Bán đồ', desc: 'Thanh lý giá sinh viên', emoji: '💰', color: 'amber' },
  lost: { exchange: 'lost', title: 'Tìm đồ', desc: 'Báo tin thất lạc trong làng Đại học', emoji: '🔍', color: 'red' },
}

export const ACTIVE_POST_TYPES = ['give', 'exchange', 'sell', 'lost']

export const LOCATIONS = [
  'Đại học Bách Khoa Đà Nẵng', 'Đại học Kinh tế Đà Nẵng', 'Đại học Sư phạm Đà Nẵng',
  'Đại học Ngoại ngữ Đà Nẵng', 'Đại học Sư phạm Kỹ thuật Đà Nẵng',
  'Đại học Công nghệ Thông tin & TT Việt-Hàn (VKU)', 'Đại học FPT Đà Nẵng',
  'Đại học Duy Tân', 'Đại học Đông Á', 'Đại học Kiến trúc Đà Nẵng',
  'Đại học Thể dục Thể thao Đà Nẵng', 'KTX Làng Đại học', 'Thư viện Làng Đại học',
]

export const LOCATION_COORDS = {
  'Đại học Bách Khoa Đà Nẵng': { lat: 16.0738, lng: 108.1499 },
  'Đại học Kinh tế Đà Nẵng': { lat: 16.0544, lng: 108.2322 },
  'Đại học Sư phạm Đà Nẵng': { lat: 16.0772, lng: 108.1522 },
  'Đại học Ngoại ngữ Đà Nẵng': { lat: 16.0422, lng: 108.2222 },
  'Đại học Sư phạm Kỹ thuật Đà Nẵng': { lat: 16.0776, lng: 108.2215 },
  'Đại học Công nghệ Thông tin & TT Việt-Hàn (VKU)': { lat: 15.9752, lng: 108.2497 },
  'Đại học FPT Đà Nẵng': { lat: 15.9722, lng: 108.2515 },
  'Đại học Duy Tân': { lat: 16.065, lng: 108.21 },
  'Đại học Đông Á': { lat: 16.058, lng: 108.228 },
  'Đại học Kiến trúc Đà Nẵng': { lat: 16.067, lng: 108.221 },
  'Đại học Thể dục Thể thao Đà Nẵng': { lat: 16.071, lng: 108.216 },
  'KTX Làng Đại học': { lat: 15.978, lng: 108.255 },
  'Thư viện Làng Đại học': { lat: 15.976, lng: 108.252 },
}

export function parseExchangeWant(description) {
  const match = (description || '').match(/🔄 Muốn đổi lấy:\s*(.+)/)
  return match ? match[1].trim() : null
}

export function parseLostPlace(description) {
  const match = (description || '').match(/📍 Nơi có thể mất:\s*(.+)/)
  return match ? match[1].trim() : null
}

export function stripPostMeta(description) {
  let text = (description || '').split('\n\n🔄 Muốn đổi lấy:')[0]
  text = text.split('\n\n📍 Nơi có thể mất:')[0]
  return text.trim()
}

export function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const FACULTIES = [
  'CNTT - ĐH Bách Khoa', 'Quản trị KD - ĐH Kinh tế', 'Sư phạm Toán - ĐH Sư phạm',
  'Khác - ĐH Đà Nẵng', 'Khác',
]