import { openModal, closeModal } from './ui.js'

export function showPaymentModal(item, onSuccess) {
  let modal = document.getElementById('payment-modal')
  if (!modal) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay hidden" id="payment-modal">
        <div class="modal" style="max-width:480px">
          <h2 class="modal__title">Thanh toán</h2>
          <div id="payment-body"></div>
          <div class="modal__actions">
            <button class="btn btn--secondary" id="payment-cancel">Huỷ</button>
            <button class="btn btn--primary" id="payment-confirm">Xác nhận đã thanh toán</button>
          </div>
        </div>
      </div>`)
    modal = document.getElementById('payment-modal')
    document.getElementById('payment-cancel').onclick = () => closeModal('payment-modal')
  }

  const price = Number(item.price || 0).toLocaleString('vi-VN')
  document.getElementById('payment-body').innerHTML = `
    <p style="margin-bottom:16px;color:var(--color-text-secondary)">${item.title}</p>
    <div style="text-align:center;padding:24px;background:var(--dn-surface-raised);border-radius:12px;margin-bottom:16px">
      <div style="font-size:2rem;font-weight:800;color:var(--dn-accent)">${price}đ</div>
      <p style="font-size:0.8125rem;color:var(--color-text-muted);margin-top:8px">Quét mã VietQR (giả lập đồ án)</p>
      <div style="width:160px;height:160px;margin:16px auto;background:#fff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:4rem">📱</div>
    </div>
    <div class="tabs" style="width:100%;margin-bottom:12px">
      <button class="tab tab--active" type="button">VietQR</button>
      <button class="tab" type="button">Thẻ</button>
      <button class="tab" type="button">UniPay</button>
    </div>
    <p class="form-hint">Đây là luồng thanh toán giả lập cho mục đích demo đồ án.</p>
  `

  document.getElementById('payment-confirm').onclick = () => {
    closeModal('payment-modal')
    onSuccess?.()
  }
  openModal('payment-modal')
}