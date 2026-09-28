# Next.js / React integration

The engine touches the DOM and `window`, so it runs client-side only.

## Install
```
npm i lenis gsap @gsap/react
```

## One Lenis, in the root layout

A page runs one Lenis, created once in the root layout. Scroll-cinema sections reuse it
(`lenis: 'external'`) instead of creating their own; two instances fight over the scroll
position. The provider follows the GSAP integration in the `lenis/react` README: GSAP's
ticker drives Lenis, so pins and smooth scroll share one clock.

```tsx
// app/smooth-scroll.tsx
'use client'
import { useEffect, useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ReactLenis, useLenis, type LenisRef } from 'lenis/react'
import 'lenis/dist/lenis.css'

gsap.registerPlugin(ScrollTrigger)

function ScrollTriggerSync() {
  useLenis(ScrollTrigger.update) // every Lenis scroll updates ScrollTrigger
  return null
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<LenisRef>(null)

  useEffect(() => {
    // the ref exposes { wrapper, content, lenis }; lenis is undefined until it mounts
    const update = (time: number) => lenisRef.current?.lenis?.raf(time * 1000)
    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0)
    return () => gsap.ticker.remove(update)
  }, [])

  // Lenis 1.3 honors prefers-reduced-motion by itself (`respectReducedMotion`, on by
  // default): smoothing off, scroll tracks the input 1:1, ScrollTrigger stays in sync
  return (
    <ReactLenis root options={{ autoRaf: false }} ref={lenisRef}>
      <ScrollTriggerSync />
      {children}
    </ReactLenis>
  )
}
```

```tsx
// app/layout.tsx
import type { ReactNode } from 'react'
import { SmoothScroll } from './smooth-scroll'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  )
}
```

`root` makes the instance global and scrolls the document itself (no wrapper div).
Anywhere below it, `useLenis()` returns the instance (for `lenis.scrollTo`, for example).

## `useScrollCinema` hook
```tsx
'use client'
import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { initScrollCinema } from './scroll-engine'

gsap.registerPlugin(useGSAP)

type OnProgress = (
  index: number,
  sceneProgress: number,
  info: { globalProgress: number; sceneProgress: number },
) => void

export function useScrollCinema(
  scenes: unknown[],
  onProgress: OnProgress,
  options: { lenis?: 'own' | 'external' | 'none'; scrub?: number | boolean } = {},
) {
  const containerRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const inst = initScrollCinema({
      container: containerRef.current,
      stage: stageRef.current,
      scenes,
      onProgress,
      lenis: 'external', // SmoothScroll in the layout owns Lenis
      ...options,
    })
    // useGSAP reverts the ScrollTrigger (and its pin spacer) with the rest of the
    // context; destroy() covers what the context does not track
    return () => inst.destroy()
  }, { scope: containerRef })

  return { containerRef, stageRef }
}
```

`scenes` and `onProgress` are read once, at mount. If the beats can change, pass
`{ dependencies: [beats], scope: containerRef, revertOnUpdate: true }` so the engine is
torn down and rebuilt with them.

## Component
```tsx
'use client'
export function Hero({ beats }: { beats: { headline: string }[] }) {
  const { containerRef, stageRef } = useScrollCinema(beats, (index, p) => {
    // move DOM layers, or drive Three/Rive here
  })
  return (
    <section ref={containerRef} className="relative">
      <div ref={stageRef} className="h-screen sticky top-0 overflow-hidden">
        {beats.map((b, i) => (
          <div key={i} data-scene={i} className="absolute inset-0">
            <h2>{b.headline}</h2>{/* real DOM text: SEO + a11y */}
          </div>
        ))}
      </div>
    </section>
  )
}
```

## App Router notes
- Mark the component `'use client'`. The engine never runs during SSR.
- For a Three/Spline layer, `dynamic(() => import('./ThreeLayer'), { ssr: false })`
  so the heavy bundle is client-only and code-split.
- `useGSAP` runs only in the browser and cleans up on unmount and route change, which
  matters with client-side navigation and React Strict Mode's double mount (ScrollTrigger
  pins leak across routes otherwise).
- Page without the layout provider (a standalone route or a plain React app): pass
  `{ lenis: 'own' }` in `options` and the engine brings its own Lenis.
- If content loads async (fonts, images), call the returned `refresh()` after it
  settles so ScrollTrigger recomputes positions.
- Reduced motion is handled in two places: the engine gives `sceneProgress = 1` for
  every scene (render them static), and Lenis itself turns smoothing off
  (`respectReducedMotion`, default `true` in 1.3).
