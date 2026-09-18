# Next.js / React integration

The engine touches the DOM and `window`, so it runs client-side only.

## Install
```
npm i lenis gsap
```

## `useScrollCinema` hook
```tsx
'use client'
import { useEffect, useRef } from 'react'
import { initScrollCinema } from './scroll-engine'

export function useScrollCinema(scenes, onProgress) {
  const containerRef = useRef(null)
  const stageRef = useRef(null)

  useEffect(() => {
    const inst = initScrollCinema({
      container: containerRef.current,
      stage: stageRef.current,
      scenes,
      onProgress,
    })
    return () => inst.destroy() // cleanup on unmount / route change
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { containerRef, stageRef }
}
```

## Component
```tsx
'use client'
export function Hero({ beats }) {
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
- `initScrollCinema` runs in `useEffect`, so it only fires in the browser; the hook
  returns `destroy()` for cleanup — important with client-side navigation or GSAP
  ScrollTrigger leaks across routes.
- If content loads async (fonts, images), call the returned `refresh()` after it
  settles so ScrollTrigger recomputes positions.
- Reduced motion is handled inside the engine; you get `sceneProgress = 1` for every
  scene and can render them static.
