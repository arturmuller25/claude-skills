# Visual layers

The engine (`assets/scroll-engine.js`) emits `progress`. A **visual layer** consumes
it and draws. Pick by budget and fidelity. Default to SVG/CSS; escalate only on need.

| Layer | Cost | 3D | Weight | Use when |
|---|---|---|---|---|
| **SVG / CSS diorama** (default) | free | fake (parallax) | tiny | isometric diorama, editorial, most heroes |
| **Three.js** | free | real | heavy (~150KB+) | true camera flythrough, depth, lighting |
| **Spline** | free tier | real | heavy (proprietary runtime) | no-code 3D scene, fast to author |
| **Rive** | free | 2.5D | tiny | interactive character/mascot, UI motion |
| **Pre-rendered video** | PAID per clip | photoreal | heavy MB | photoreal flythrough, client demands it |

All layers read the same signal from `onProgress(index, sceneProgress, { globalProgress })`.

## SVG / CSS diorama (default, free)

Stack scene layers absolutely; move/scale/opacity by `sceneProgress`. Cross-fade
between scenes at the index boundary.

```js
initScrollCinema({
  container, stage, scenes: beats,
  onProgress(index, p, { globalProgress }) {
    beats.forEach((el, i) => {
      const active = i === index
      el.style.opacity = active ? 1 : 0
      // "fly in" the active scene: scale 0.9 -> 1 across its progress
      el.style.transform = active ? `scale(${0.9 + p * 0.1})` : 'scale(0.9)'
    })
    // parallax the camera by global progress
    stage.style.setProperty('--cam', String(globalProgress))
  },
})
```

## Three.js (real 3D)

Keep one camera; interpolate its position along a path by `globalProgress`. Cap DPR,
pause the render loop when the stage is offscreen.

```js
// path = array of THREE.Vector3 waypoints, one per beat
onProgress(index, p, { globalProgress }) {
  const t = globalProgress * (path.length - 1)
  const i = Math.min(path.length - 2, Math.floor(t))
  camera.position.lerpVectors(path[i], path[i + 1], t - i)
  camera.lookAt(targets[index])
}
```
Load Three lazily (`dynamic import`) below the fold; never block first paint.

### Device budget (Three.js and Spline)

Starting envelopes, not a pass mark: profile on the real phone before calling it done.

| | Phone | Desktop |
|---|---|---|
| Pixel ratio cap | 1.25 to 1.5 | 1.5 to 2 |
| Visible triangles | 150k to 300k | 500k to 1.2M |
| Draw calls | 50 to 90 | 90 to 160 |
| Shadow-casting lights | 1 to 2 | 2 to 4 |
| First-load transfer | 3 to 6 MB | 5 to 10 MB |
| Frame time | 16.7 ms, 25 ms at worst | 16.7 ms |

- Pick a quality tier from the device, then step down only after sustained misses (for
  example, 120 frames over 22 ms). Cheapest lever first: pixel ratio, post-processing,
  reflections, shadow updates, particles, and only then geometry detail. Never bounce
  between tiers; go back up only after a reload.
- Pause the render loop when the tab is hidden or the stage is offscreen. After a stall,
  clamp the frame delta (about 1/30 s) so the camera does not jump.
- Dispose geometries, materials, textures and render targets in `destroy()`.

Numbers adapted from Meng To's `build-threejs-scroll-worlds` skill
([mengto/skills](https://github.com/mengto/skills), MIT).

## Rive (interactive character)

Drive a Rive state-machine input from progress:
```js
onProgress(index, p) { riveInput.value = p * 100 } // a 0..100 "scrub" number input
```

## AI photoreal video (lane 4, paid): delegate to `scroll-world`

For an AI-generated, seamless "fly through the world" photoreal hero, do NOT build the
pipeline here. Invoke the **`scroll-world`** skill: it generates the scene stills, the
dive-in clips, and the frame-locked connector clips (Higgsfield/Monid, Seedance 2.0,
pay-per-clip), and ships its own vanilla scrub engine that plays the chain as one flight
with no seams. It owns the seam laws, the cost gate, and phone hardening. This skill only
routes there; if the same page also needs code-driven sections, run them with the engine
above alongside scroll-world's video hero.

If you ALREADY have a video (supplied by the user, not generated), you can scrub it with
this engine instead of pulling in scroll-world:
```js
onProgress(_, __, { globalProgress }) {
  if (video.readyState >= 2) video.currentTime = globalProgress * video.duration
}
```
Encode for seeking (frequent keyframes, e.g. `-g 6`), serve a poster, and keep the
headlines as real DOM text on top. For anything AI-generated, prefer scroll-world.
