export const TOTAL_HERO_FRAMES = 192
export const HERO_FRAME_PATH = 'assets/images/hero-frames/frame-'
export const FIRE_SCENE_START = 0.275
export const FIRE_SCENE_END = 0.625
export const STUDENTS_SCENE_START = 0.9

export function fireIntensityAt(progress) {
  if (progress < FIRE_SCENE_START) return 0
  if (progress > FIRE_SCENE_END) {
    const fade = 1 - (progress - FIRE_SCENE_END) / (STUDENTS_SCENE_START - FIRE_SCENE_END + 0.12)
    return Math.max(0, Math.min(1, fade))
  }
  return Math.min(1, (progress - FIRE_SCENE_START) / (FIRE_SCENE_END - FIRE_SCENE_START))
}

export function framePath(index) {
  return `${HERO_FRAME_PATH}${String(index + 1).padStart(3, '0')}.jpg`
}