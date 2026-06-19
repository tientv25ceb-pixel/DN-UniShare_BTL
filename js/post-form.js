import { getProfile } from './auth.js'
import { createItem, uploadImage } from './items.js'
import { POST_TYPES, CATEGORY_LABELS, CONDITION_LABELS, LOCATIONS } from './constants.js'
import { showToast } from './ui.js'
import { initMapPicker, renderMapPlaceholder } from './vietmap.js'
import { getBasePath } from './layout.js'

let mapPicker = null

const TYPE_HINTS = {
  give: 'Mô tả rõ tình trạng đồ để người nhận dễ quyết định. Ảnh thật giúp tin được duyệt nhanh hơn.',
  exchange: 'Ghi rõ món bạn muốn đổi lấy — sinh viên khắp làng ĐH sẽ dễ ghép đôi với bạn.',
  sell: 'Đặt giá hợp lý cho sinh viên. Người mua có thể thanh toán demo (VietQR) trên trang chi tiết.',
  lost: 'Mô tả đặc điểm nhận dạng, thời gian và nơi có thể mất. Thêm phần thưởng nếu muốn.',
}

const TITLE_PLACEHOLDERS = {
  give: 'VD: Giáo trình Lập trình C++ còn mới',
  exchange: 'VD: Bàn học gấp — muốn đổi lấy ghế xoay',
  sell: 'VD: Tai nghe Bluetooth còn tốt',
  lost: 'VD: Thẻ sinh viên tên Nguyễn Văn A',
}

const SUCCESS_MSG = {
  give: 'Tin tặng đồ đã gửi. Sinh viên gần bạn sẽ thấy trong mục Quanh đây sau khi admin duyệt.',
  exchange: 'Tin trao đổi đã gửi. Hãy theo dõi yêu cầu và chat để chốt đổi đồ.',
  sell: 'Tin bán đã gửi. Người mua có thể thanh toán demo hoặc nhắn tin trực tiếp.',
  lost: 'Tin tìm đồ đã gửi. Ai thấy sẽ liên hệ qua số điện thoại bạn cung cấp.',
}

export async function initLocationPicker(options = {}) {
  const locInput = document.getElementById('location')
  const latInput = document.getElementById('latitude')
  const lngInput = document.getElementById('longitude')
  const presetSel = document.getElementById('location-preset')
  const mapEl = document.getElementById('location-map')

  if (!mapEl) return

  LOCATIONS.forEach((loc) => {
    const opt = document.createElement('option')
    opt.value = loc
    opt.textContent = loc
    if (loc === options.location) opt.selected = true
    presetSel?.appendChild(opt)
  })

  presetSel?.addEventListener('change', () => {
    if (presetSel.value && mapPicker) mapPicker.setByLocationName(presetSel.value)
  })

  document.getElementById('btn-locate')?.addEventListener('click', async () => {
    if (!mapPicker) return
    try {
      await mapPicker.locateUser()
      showToast('Đã ghim vị trí GPS', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  })

  try {
    mapPicker = await initMapPicker('location-map', {
      location: options.location,
      lat: options.lat,
      lng: options.lng,
      onLocationChange(name) {
        if (locInput) locInput.value = name
      },
      onCoordsChange(lat, lng) {
        if (latInput) latInput.value = lat
        if (lngInput) lngInput.value = lng
      },
    })

    if (options.location) {
      locInput.value = options.location
      if (options.lat != null) {
        latInput.value = options.lat
        lngInput.value = options.lng
      } else {
        mapPicker.setByLocationName(options.location)
      }
    }
  } catch (err) {
    renderMapPlaceholder('location-map', err.message)
  }
}

function buildDescription(type, baseDesc) {
  if (type === 'exchange') {
    const want = document.getElementById('want')?.value.trim()
    if (!want) throw new Error('Vui lòng nhập món đồ muốn đổi lấy')
    return `${baseDesc}\n\n🔄 Muốn đổi lấy: ${want}`
  }
  if (type === 'lost') {
    const place = document.getElementById('lost_place')?.value.trim()
    if (place) return `${baseDesc}\n\n📍 Nơi có thể mất: ${place}`
  }
  return baseDesc
}

function showSuccess(type, meta) {
  const form = document.getElementById('post-form')
  const wrap = document.getElementById('post-form-wrap')
  if (!wrap) return

  form.classList.add('hidden')
  document.getElementById('post-success')?.remove()

  const base = getBasePath()
  wrap.insertAdjacentHTML('beforeend', `
    <div class="post-success" id="post-success">
      <div class="post-success__icon">${meta.emoji}</div>
      <h2>Đăng tin thành công!</h2>
      <p>${SUCCESS_MSG[type] || 'Tin đang chờ admin duyệt.'}</p>
      <div class="post-success__actions">
        <a href="${base}/app/post/index.html" class="btn btn--primary">Đăng tin khác</a>
        <a href="${base}/app/profile.html" class="btn btn--secondary">Xem tin của tôi</a>
      </div>
    </div>
  `)
}

export async function initPostForm(type) {
  const meta = POST_TYPES[type]
  if (!meta) return

  document.getElementById('form-title').textContent = `Đăng tin: ${meta.title}`
  document.getElementById('form-desc').textContent = meta.desc
  document.getElementById('form-hint').textContent = TYPE_HINTS[type] || ''

  const titleInput = document.getElementById('title')
  if (titleInput && TITLE_PLACEHOLDERS[type]) titleInput.placeholder = TITLE_PLACEHOLDERS[type]

  const catSel = document.getElementById('category')
  Object.entries(CATEGORY_LABELS).forEach(([k, v]) => {
    catSel.innerHTML += `<option value="${k}">${v}</option>`
  })
  Object.entries(CONDITION_LABELS).forEach(([k, v]) => {
    document.getElementById('condition').innerHTML += `<option value="${k}">${v}</option>`
  })

  if (type === 'lost') {
    document.getElementById('condition').closest('.form-group')?.parentElement?.classList.add('hidden')
  } else {
    document.getElementById('condition').required = true
  }

  await initLocationPicker()

  const extra = document.getElementById('extra-fields')
  const imageLabel = document.querySelector('label[for="image"]')

  if (type === 'exchange') {
    extra.innerHTML = `
      <div class="form-group">
        <label class="form-label" for="want">Muốn đổi lấy *</label>
        <input class="form-input" type="text" id="want" required placeholder="VD: Giáo trình Toán A1, bình nước 1L...">
        <p class="form-hint">Ghi cụ thể món bạn muốn nhận lại khi trao đổi</p>
      </div>`
    if (imageLabel) imageLabel.textContent = 'Ảnh món đổi *'
    document.getElementById('image').required = true
  } else if (type === 'sell') {
    extra.innerHTML = `
      <div class="form-group">
        <label class="form-label" for="price">Giá bán (VNĐ) *</label>
        <input class="form-input" type="number" id="price" required min="1000" step="1000" placeholder="VD: 50000">
        <p class="form-hint">Giá sinh viên — có thanh toán VietQR demo trên trang chi tiết</p>
      </div>`
    if (imageLabel) imageLabel.textContent = 'Ảnh sản phẩm *'
    document.getElementById('image').required = true
  } else if (type === 'lost') {
    extra.innerHTML = `
      <div class="form-group">
        <label class="form-label" for="lost_place">Nơi có thể mất *</label>
        <input class="form-input" type="text" id="lost_place" required placeholder="VD: Thư viện VKU, phòng A101, căng tin KTX...">
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Ngày mất</label><input class="form-input" type="date" id="lost_date"></div>
        <div class="form-group"><label class="form-label">Phần thưởng</label><input class="form-input" type="text" id="reward" placeholder="VD: 50.000đ hoặc 1 ly trà sữa"></div>
      </div>
      <div class="form-group">
        <label class="form-label" for="contact_phone">SĐT liên hệ *</label>
        <input class="form-input" type="tel" id="contact_phone" required placeholder="Người tìm thấy gọi cho bạn">
      </div>`
    if (imageLabel) imageLabel.textContent = 'Ảnh minh họa (nếu có)'
    document.getElementById('condition').required = false
    document.getElementById('condition').value = 'kha'
  } else if (type === 'give') {
    extra.innerHTML = `<p class="form-hint" style="padding:12px;background:var(--dn-accent-soft);border-radius:8px;margin-bottom:var(--space-4)">💡 Ghim điểm hẹn chính xác — sinh viên gần bạn sẽ thấy tin trong mục "Quanh đây".</p>`
    if (imageLabel) imageLabel.textContent = 'Ảnh sản phẩm (nên có)'
  }

  document.getElementById('image')?.addEventListener('change', (e) => {
    const file = e.target.files[0]
    const preview = document.getElementById('image-preview')
    if (file) { preview.src = URL.createObjectURL(file); preview.classList.add('visible') }
    else preview.classList.remove('visible')
  })

  document.getElementById('post-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = document.getElementById('btn-submit')
    btn.disabled = true
    btn.textContent = 'Đang đăng...'

    try {
      const profile = await getProfile()
      const file = document.getElementById('image').files[0]
      if (file && file.size > 5 * 1024 * 1024) throw new Error('Ảnh tối đa 5MB')
      if ((type === 'sell' || type === 'exchange') && !file) throw new Error('Vui lòng tải ảnh sản phẩm')

      let imageUrl = ''
      if (file) imageUrl = await uploadImage(file, profile.id)

      const location = document.getElementById('location').value.trim()
      if (!location) throw new Error('Vui lòng chọn điểm hẹn khi đăng tin')

      const latVal = document.getElementById('latitude').value
      const lngVal = document.getElementById('longitude').value
      const coords = mapPicker?.getCoords()
      const rawDesc = document.getElementById('description').value.trim()
      if (!rawDesc) throw new Error('Vui lòng nhập mô tả')

      const payload = {
        title: document.getElementById('title').value.trim(),
        description: buildDescription(type, rawDesc),
        category: document.getElementById('category').value,
        condition: document.getElementById('condition').value || 'kha',
        exchange_type: meta.exchange,
        location,
        image: imageUrl,
        posted_by: profile.name,
        poster_id: profile.id,
        poster_faculty: profile.faculty,
        latitude: latVal ? Number(latVal) : coords?.lat ?? null,
        longitude: lngVal ? Number(lngVal) : coords?.lng ?? null,
      }

      if (type === 'sell') {
        const price = Number(document.getElementById('price').value)
        if (!price || price < 1000) throw new Error('Giá bán tối thiểu 1.000đ')
        payload.price = price
      }
      if (type === 'lost') {
        payload.contact_phone = document.getElementById('contact_phone')?.value.trim() || ''
        if (!payload.contact_phone) throw new Error('Vui lòng nhập SĐT liên hệ')
        payload.lost_date = document.getElementById('lost_date')?.value || ''
        payload.reward = document.getElementById('reward')?.value || ''
      }

      await createItem(payload)
      showToast('Đăng tin thành công! Đang chờ admin duyệt.', 'success')
      showSuccess(type, meta)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      btn.disabled = false
      btn.textContent = 'Đăng tin'
    }
  })
}