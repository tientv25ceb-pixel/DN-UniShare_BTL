import { TOTAL_HERO_FRAMES, fireIntensityAt, framePath } from './cinematic.js'

const PROGRESS_LERP = 0.08

function loadScript(src) {
  if (document.querySelector(`script[src="${src}"]`)) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function preloadFrames(onProgress) {
  return new Promise((resolve) => {
    const images = []
    let loaded = 0
    for (let i = 0; i < TOTAL_HERO_FRAMES; i++) {
      const img = new Image()
      img.src = framePath(i)
      const done = () => {
        loaded++
        onProgress?.(Math.round((loaded / TOTAL_HERO_FRAMES) * 100))
        if (loaded === TOTAL_HERO_FRAMES) resolve(images)
      }
      img.onload = () => { images[i] = img; done() }
      img.onerror = () => { images[i] = images[0] || img; done() }
      images[i] = img
    }
  })
}

export async function initHomeCinematic() {
  const page = document.getElementById('cinematic-page')
  const canvas = document.getElementById('hero-canvas')
  const loader = document.getElementById('cinematic-loader')
  const loaderText = document.getElementById('cinematic-loader-text')
  const fireEl = document.getElementById('fire-overlay')
  const progressBar = document.getElementById('scroll-progress-bar')

  if (!page || !canvas) return

  if (prefersReducedMotion()) {
    loader?.remove()
    canvas.style.opacity = '0'
    initScrollReveal(page)
    return
  }

  await loadScript('https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js')
  await loadScript('https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js')

  const gsap = window.gsap
  const ScrollTrigger = window.ScrollTrigger
  gsap.registerPlugin(ScrollTrigger)

  const images = await preloadFrames((pct) => {
    if (loaderText) loaderText.textContent = `Đang tải hiệu ứng: ${pct}%`
  })

  loader?.classList.add('hidden')
  canvas.width = 1280
  canvas.height = 720
  const ctx = canvas.getContext('2d')

  const drawFrame = (img) => {
    if (img?.complete) ctx.drawImage(img, 0, 0, 1280, 720)
  }

  drawFrame(images[0])

  let target = 0
  let smooth = 0
  const lerp = PROGRESS_LERP

  ScrollTrigger.create({
    trigger: page,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => { target = self.progress },
  })

  const tick = () => {
    smooth += (target - smooth) * lerp
    if (Math.abs(target - smooth) < 0.00008) smooth = target

    const idx = Math.min(TOTAL_HERO_FRAMES - 1, Math.max(0, Math.round(smooth * (TOTAL_HERO_FRAMES - 1))))
    drawFrame(images[idx])

    const intensity = fireIntensityAt(smooth)
    if (fireEl) fireEl.style.opacity = intensity > 0.01 ? intensity : 0
    if (progressBar) progressBar.style.transform = `scaleX(${smooth})`
  }

  gsap.ticker.add(tick)
  initScrollReveal(page, gsap, ScrollTrigger)
}

function initScrollReveal(root, gsap, ScrollTrigger) {
  const targets = root.querySelectorAll('.gsap-reveal')
  if (!targets.length || prefersReducedMotion()) {
    targets.forEach((el) => { el.style.opacity = '1'; el.style.transform = 'none' })
    return
  }

  gsap.set(targets, { autoAlpha: 0, y: 32, force3D: true })

  ScrollTrigger.batch(targets, {
    start: 'top 88%',
    once: true,
    onEnter: (elements) => {
      gsap.to(elements, {
        autoAlpha: 1,
        y: 0,
        duration: 0.65,
        ease: 'power3.out',
        stagger: 0.08,
        overwrite: true,
      })
    },
  })
}