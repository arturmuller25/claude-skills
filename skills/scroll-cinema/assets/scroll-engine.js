// scroll-engine.js: framework-agnostic scroll-cinema engine.
// Lenis (smooth scroll) + GSAP ScrollTrigger (pin + scrub). No renderer coupling:
// it only emits progress; the visual layer decides what to draw.
//
// deps: npm i lenis gsap
//
// initScrollCinema({ container, stage, scenes, onProgress, lenis, scrub }) -> { refresh(), destroy() }
//   container : the tall scroll section (its height sets total scroll distance)
//   stage     : the pinned element that stays fixed while scenes play
//   scenes    : array (length = number of beats); content is up to you
//   onProgress: (index, sceneProgress, { globalProgress }) => void
//               index         = current scene (0..scenes.length-1)
//               sceneProgress = 0..1 within the current scene
//               globalProgress= 0..1 across the whole timeline
//   lenis     : who owns smooth scroll. A page runs ONE Lenis; two fight over the scroll.
//               'own' (default): standalone page; the engine creates, wires and destroys it.
//               'external': the page already runs a Lenis that feeds ScrollTrigger
//                 (lenis.on('scroll', ScrollTrigger.update)) and is driven by gsap.ticker,
//                 e.g. the Next.js layout provider in references/react-nextjs.md.
//                 The engine creates none and never destroys it.
//               'none': native scroll.
//   scrub     : seconds the scenes take to catch up with the scroll position (default 1.2).
//               Lenis already smooths the scroll, so lower it (0.5 to 1) if scenes feel late.
//               true locks them to the scrollbar with no catch-up.
//
// Honors prefers-reduced-motion: no smooth scroll, no scrub, scenes shown static.

import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const LENIS_MODES = ['own', 'external', 'none']

/**
 * @param {{
 *   container?: Element | null,
 *   stage?: Element | null,
 *   scenes?: unknown[],
 *   onProgress?: (index: number, sceneProgress: number, info: { globalProgress: number, sceneProgress: number }) => void,
 *   reducedMotion?: boolean,
 *   lenis?: 'own' | 'external' | 'none',
 *   scrub?: number | boolean,
 * }} options
 */
export function initScrollCinema({
  container,
  stage,
  scenes = [],
  onProgress,
  reducedMotion,
  lenis: lenisMode = 'own',
  scrub = 1.2,
} = {}) {
  if (!container || !stage) {
    throw new Error('initScrollCinema: container and stage are required')
  }
  if (!LENIS_MODES.includes(lenisMode)) {
    throw new Error(`initScrollCinema: lenis must be one of ${LENIS_MODES.join(', ')}`)
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
    return { refresh() {}, destroy() {} }
  }

  // Only a standalone page gets its own Lenis. With 'external', whoever created the
  // instance already feeds ScrollTrigger and drives lenis.raf from gsap.ticker.
  /** @type {Lenis | null} */
  let lenis = null
  /** @type {((time: number) => void) | null} */
  let raf = null
  if (lenisMode === 'own') {
    const own = new Lenis({ smoothWheel: true, lerp: 0.1 })
    own.on('scroll', ScrollTrigger.update)
    raf = (time) => own.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    lenis = own
  }

  const st = ScrollTrigger.create({
    trigger: container,
    start: 'top top',
    // one viewport of scroll per scene feels natural; tune the multiplier to taste
    end: () => '+=' + window.innerHeight * total,
    pin: stage,
    scrub,
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
      if (raf) gsap.ticker.remove(raf)
      lenis?.destroy() // only ever the instance this engine created
    },
  }
}
