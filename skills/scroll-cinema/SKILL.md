---
name: scroll-cinema
description: Build a scroll-scrubbed cinematic / "fly through the world" landing hero, free by default. Combines Lenis smooth-scroll and GSAP ScrollTrigger as the engine, with a pluggable visual layer (SVG/CSS diorama, Three.js/Spline 3D, Rive, or pre-rendered video). Use when the user wants a scroll cinematic, a 3D-world or diorama landing hero, a "browse-through-the-industry" section, or a scroll-driven storytelling page. Optimized for Next.js/React, mobile-safe, and needs no paid render unless the video layer is chosen.
---

# Scroll Cinema

Build a scroll-scrubbed cinematic hero: as the visitor scrolls, a camera/timeline
flies through connected scenes with no cuts. One engine drives the scroll; the
*visual layer* is swappable. Free by default (SVG/CSS + code); paid video only if
the user explicitly wants photoreal.

This skill exists because "scroll-world"-style tools render the flythrough as
**paid per-clip video** (Higgsfield/Monid). That looks great but costs money, ships
heavy MB, and is not editable after render. Here the default is a code-driven
timeline that is free, light, editable, and SEO-friendly, with the paid video kept
as one optional layer.

## Procedure

1. **Interview.** Ask the user for: topic/brand, the scene beats (3 to 6 sections,
   each with a headline + role in the story), brand kit (colors, font, logo), and
   the vibe (isometric diorama, product flythrough, editorial). Do not generate
   until beats are named.
2. **Pick the visual layer** by budget and fidelity. Default to **SVG/CSS diorama**
   (free, light). Escalate only if the user needs it: **Three.js** for real 3D,
   **Rive** for an interactive character, **video** for photoreal (paid). See
   `references/visual-layers.md`.
3. **Wire the engine.** Use `assets/scroll-engine.js` (Lenis + GSAP ScrollTrigger).
   It pins the stage, builds one scrubbed timeline across the beats, and emits a
   `progress` (0..1) per scene that the visual layer reads. Framework-agnostic core.
4. **Integrate for the target framework.** For Next.js/React use the hook in
   `references/react-nextjs.md` (client component, dynamic import, cleanup, SSR-safe).
5. **Performance and accessibility pass (non-negotiable).**
   - Honor `prefers-reduced-motion`: skip smooth-scroll and scrubbing, show scenes
     statically.
   - Lazy-load heavy layers (Three/Spline/video) below the fold; never block first paint.
   - Every scene's headline is real DOM text (SEO + screen readers), never baked into
     an image/video only.
   - Cap devicePixelRatio for 3D; pause the loop when the stage is offscreen.
6. **Render and eyeball.** Open the page, scroll it slowly and fast, check on a
   narrow viewport. Watch for jank, layout shift, and scenes that overlap wrong.

## Non-negotiables

- **Free by default.** Do not reach for the paid video layer unless the user asks
  for photoreal and accepts per-clip cost.
- **One engine, swappable visuals.** Never couple scroll logic to a specific
  renderer; the layer only consumes `progress`.
- **Reduced-motion is a real branch**, not an afterthought.
- **Text is DOM text.** Cinematics decorate; they never replace readable content.

## Files

| File | What it holds |
|---|---|
| `assets/scroll-engine.js` | The Lenis + GSAP ScrollTrigger engine (vanilla + React exports) |
| `references/visual-layers.md` | The four layers, when to use each, how to plug into `progress` |
| `references/react-nextjs.md` | `useScrollCinema` hook, Next.js App Router integration, SSR/cleanup |
