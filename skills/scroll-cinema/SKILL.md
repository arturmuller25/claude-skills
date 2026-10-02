---
name: scroll-cinema
description: Universal scroll-driven cinematic hero. One entry point that routes to the best technique for the job and budget. Free by default (Lenis + GSAP engine with SVG/CSS diorama, Three.js/Spline 3D, or Rive layers); for AI-generated photoreal "fly-through-the-world" video it DELEGATES to the scroll-world skill (Higgsfield/Monid pipeline) instead of reimplementing it. Use when the user wants a scroll cinematic, a 3D-world or diorama landing hero, a "browse-through-the-industry" section, or a scroll-driven storytelling page. Optimized for Next.js/React, mobile-safe.
---

# Scroll Cinema (universal)

One skill, four visual lanes. The scroll mechanic is always the same (scroll drives
a timeline or camera, no cuts), but the *renderer* is chosen by fidelity and budget.
This skill picks the lane, wires the engine, and for the paid photoreal lane hands off
to the specialist skill rather than duplicating it.

Design principle: **take the best of each technique, reimplement none.** The free lanes
share one code engine; the photoreal-video lane is the `scroll-world` skill's job.

## Step 1: Interview

Ask, in plain prose (not fabricated multiple-choice for the open ones):
- **Subject/brand** + one-line pitch, brand kit (4-6 hex, name, tone).
- **Beats**: 3 to 6 ordered scenes, each with headline + role in the story.
- **Fidelity + budget**: this picks the lane (Step 2). State the cost of the paid lane
  before choosing it.
- **Target framework** (Next.js/React assumed; the engine is framework-agnostic).

## Step 2: Route to a lane

| Lane | Renderer | Cost | Use when | Engine |
|---|---|---|---|---|
| **1. SVG/CSS diorama** (default) | DOM layers, parallax | free | most heroes, editorial, isometric diorama | this skill's `assets/scroll-engine.js` |
| **2. Three.js / Spline** | real-time 3D | free | true camera flythrough, depth, lighting | this skill's engine + a 3D layer |
| **3. Rive** | vector state machine | free | interactive mascot/character, 2.5D | this skill's engine + Rive input |
| **4. AI photoreal video** | pre-rendered seamless flythrough | **PAID (per clip)** | client wants photoreal, no manual assets, accepts cost | **delegate to `scroll-world`** |

Default to lane 1. Escalate only on explicit need. Only reach lane 4 when the user
wants AI-generated photoreal video AND accepts per-clip spend.

## Step 3: Build the chosen lane

**Lanes 1-3 (free, code):** wire `assets/scroll-engine.js` (Lenis + GSAP ScrollTrigger).
It pins the stage, builds one scrubbed timeline across the beats, and emits `progress`
(0..1) per scene that the visual layer reads. Layer specifics + code:
`references/visual-layers.md`. Next.js/React integration (layout provider, hook, SSR,
cleanup): `references/react-nextjs.md`.

Engine rules, kept in line with my landing-page master prompt so a page built from it
can use this engine as is:
- **One Lenis per page.** Standalone page: the engine creates its own (`lenis: 'own'`,
  the default). Next.js: Lenis lives once in the root layout as a provider and every
  section passes `lenis: 'external'`. Never two smooth-scroll systems at once.
- **Scrub 0.5 by default** (`scrub` option). Measured in Chromium: pure `true` jolts the
  scene on keyboard and anchor jumps, and above 1 the scene trails Lenis visibly. The
  numbers are in the engine header.
- **React uses `useGSAP`** from `@gsap/react` with a scope, not a bare `useEffect`.
- **Load `lenis/dist/lenis.css`**, the stylesheet Lenis recommends.

**Lane 4 (paid, photoreal video):** do NOT reimplement the render pipeline. Invoke the
**`scroll-world`** skill: it interviews for art direction/camera, generates the scene
stills, the dive-in clips, and the frame-locked connector clips (Higgsfield stills +
Monid/Seedance video, or Higgsfield-credits fallback), and ships its own vanilla scrub
engine that plays the chain as one flight. This skill's role in lane 4 is only to route
there and, if the page also needs code-driven sections, to run them on the same page
alongside scroll-world's video hero. scroll-world owns the seams, the cost gate, and the
video engine; trust it, don't fork it.

## Step 4: Performance & accessibility (all lanes, non-negotiable)

- Honor `prefers-reduced-motion`: no smooth-scroll, no scrub; show scenes static.
- Headlines are real DOM text (SEO + screen readers), never baked into image/video only.
- Lazy-load heavy layers (Three/Spline/video) below the fold; never block first paint.
- 3D: stay inside the device budget in `references/visual-layers.md` (pixel ratio,
  triangles, draw calls); pause the loop when the stage is offscreen or the tab hidden.
- Video (lane 4): scroll-world already hardens phones (seek-coalescing, iOS priming); keep it.

## Step 5: Render and eyeball

Open the page; scroll slow and fast; check a narrow viewport. Watch for jank, layout
shift, wrong scene overlap, and (lane 4) any seam "pop". For 3D, read the renderer
stats (draw calls, triangles) on a phone against the budget.

Judge it in a real browser (Chrome on the localhost URL, then a real phone), never in an
app's built-in preview pane: those panes are known to stutter on scroll-scrubbed video
(reported in the tiagopro.com.br/guia10k guide, 2026-10), so a scrub that looks broken
there may be fine, and one that looks fine there proves nothing.

## Non-negotiables

- **Free by default.** Lane 4's per-clip cost is opt-in, stated before spend.
- **One engine, swappable visuals** for the code lanes; the renderer only consumes `progress`.
- **One Lenis per page.** In Next.js it belongs to the layout, not to a section.
- **Delegate, don't duplicate.** Photoreal video = the `scroll-world` skill. This skill
  never re-creates the Higgsfield/Monid pipeline.
- **Reduced-motion is a real branch.** **Text is DOM text.**

## Files

| File | What it holds |
|---|---|
| `assets/scroll-engine.js` | Lenis + GSAP ScrollTrigger engine for lanes 1-3 (options `lenis` and `scrub`) |
| `references/visual-layers.md` | The code lanes (SVG/Three/Rive), the 3D device budget, and how the video lane delegates |
| `references/react-nextjs.md` | Lenis provider in the root layout, `useScrollCinema` hook with `useGSAP`, SSR and cleanup |
