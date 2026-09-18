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

## Rive (interactive character)

Drive a Rive state-machine input from progress:
```js
onProgress(index, p) { riceInput.value = p * 100 } // a 0..100 "scrub" number input
```

## Pre-rendered video (paid, photoreal) — last resort

This is the "scroll-world" approach. Only if the user wants photoreal AND accepts
per-clip render cost. Scrub `video.currentTime` by progress:
```js
onProgress(_, __, { globalProgress }) {
  if (video.readyState >= 2) video.currentTime = globalProgress * video.duration
}
```
Encode the video for seeking (frequent keyframes, e.g. `-g 6`), serve a poster, and
still render the headlines as real DOM text on top.
