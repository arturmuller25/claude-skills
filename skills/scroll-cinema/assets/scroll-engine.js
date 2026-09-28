// scroll-engine.js: framework-agnostic scroll-cinema engine.
// Lenis (smooth scroll) + GSAP ScrollTrigger (pin + scrub). No renderer coupling:
// it only emits progress; the visual layer decides what to draw.
//
// deps: npm i lenis gsap, plus the stylesheet Lenis recommends: import 'lenis/dist/lenis.css'
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
//   scrub     : seconds the scenes take to catch up with the scroll position (default 0.5).
//               Measured in Chromium (5-scene section, 800px viewport), Lenis on:
//                 true -> wheel flick settles in ~420 ms, but a PageDown or anchor jump
//                         moves the scene ~3.3% of the section per frame (a visible jolt);
//                 0.5  -> ~520 ms, scene trails the scroll by ~1.5%, key jumps ~2%/frame;
//                 1.2  -> ~730 ms, trails by ~2.8%: feels late on top of Lenis.
//               Without Lenis, true steps 2.5% per wheel notch; 0.5 smooths it to ~0.9%.
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
  scrub = 0.5,
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

  // scrub only smooths an animation linked to the trigger; ScrollTrigger's own
  // progress is always the raw scroll position. So the engine scrubs a linear
  // proxy tween and reports the proxy, which is what the scrub value smooths.
  const proxy = { progress: 0 }
  const emit = () => {
    const globalProgress = proxy.progress // 0..1
    const raw = globalProgress * total
    const index = Math.min(total - 1, Math.floor(raw))
    const sceneProgress = raw - index
    onProgress?.(index, sceneProgress, { globalProgress, sceneProgress })
  }

  const tween = gsap.to(proxy, {
    progress: 1,
    ease: 'none',
    onUpdate: emit,
    scrollTrigger: {
      trigger: container,
      start: 'top top',
      // one viewport of scroll per scene feels natural; tune the multiplier to taste
      end: () => '+=' + window.innerHeight * total,
      pin: stage,
      scrub,
      invalidateOnRefresh: true,
    },
  })
  emit() // paint the starting state before the first scroll

  return {
    refresh: () => ScrollTrigger.refresh(),
    destroy() {
      tween.scrollTrigger?.kill()
      tween.kill()
      if (raf) gsap.ticker.remove(raf)
      lenis?.destroy() // only ever the instance this engine created
    },
  }
}
