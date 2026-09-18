// scroll-engine.js — framework-agnostic scroll-cinema engine.
// Lenis (smooth scroll) + GSAP ScrollTrigger (pin + scrub). No renderer coupling:
// it only emits progress; the visual layer decides what to draw.
//
// deps: npm i lenis gsap
//
// initScrollCinema({ container, stage, scenes, onProgress }) -> { destroy() }
//   container : the tall scroll section (its height sets total scroll distance)
//   stage     : the pinned element that stays fixed while scenes play
//   scenes    : array (length = number of beats); content is up to you
//   onProgress: (index, sceneProgress, { globalProgress }) => void
//               index         = current scene (0..scenes.length-1)
//               sceneProgress = 0..1 within the current scene
//               globalProgress= 0..1 across the whole timeline
//
// Honors prefers-reduced-motion: no smooth scroll, no scrub, scenes shown static.

import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function initScrollCinema({
  container,
  stage,
  scenes = [],
  onProgress,
  reducedMotion,
} = {}) {
  if (!container || !stage) {
    throw new Error('initScrollCinema: container and stage are required')
  }

  const prefersReduced =
    reducedMotion ??
    (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  const total = Math.max(1, scenes.length)

  // Reduced-motion branch: reveal everything, no engine.
  if (prefersReduced) {
    for (let i = 0; i < total; i++) {
      onProgress?.(i, 1, { globalProgress: 1, sceneProgress: 1 })
    }
    return { destroy() {} }
  }

  const lenis = new Lenis({ smoothWheel: true, lerp: 0.1 })
  lenis.on('scroll', ScrollTrigger.update)

  const raf = (time) => lenis.raf(time * 1000)
  gsap.ticker.add(raf)
  gsap.ticker.lagSmoothing(0)

  const st = ScrollTrigger.create({
    trigger: container,
    start: 'top top',
    // one viewport of scroll per scene feels natural; tune the multiplier to taste
    end: () => '+=' + window.innerHeight * total,
    pin: stage,
    scrub: true,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      const globalProgress = self.progress // 0..1
      const raw = globalProgress * total
      const index = Math.min(total - 1, Math.floor(raw))
      const sceneProgress = raw - index
      onProgress?.(index, sceneProgress, { globalProgress, sceneProgress })
    },
  })

  return {
    refresh: () => ScrollTrigger.refresh(),
    destroy() {
      st.kill()
      gsap.ticker.remove(raf)
      lenis.destroy()
    },
  }
}
