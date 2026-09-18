# claude-skills

My personal collection of [Agent Skills](https://skills.sh) for Claude Code (and
compatible agents). Markdown skill modules that load on demand.

## Skills

| Skill | What it does |
|---|---|
| **scroll-cinema** | Scroll-scrubbed cinematic / "fly through the world" landing hero. Free by default: Lenis + GSAP ScrollTrigger engine with a pluggable visual layer (SVG/CSS diorama, Three.js/Spline 3D, Rive, or optional paid video). Optimized for Next.js/React. |
| **qa-agent** | Two-stage website QA: exploratory testing with Claude in Chrome, then materialized into durable Playwright specs for regression. Localhost/staging only. |

## Install

With the [skills CLI](https://skills.sh) (one skill per command — comma-separated
lists do not work):

```
npx skills add arturmuller25/claude-skills --skill scroll-cinema
npx skills add arturmuller25/claude-skills --skill qa-agent
```

Or globally (available in every project):

```
npx skills add arturmuller25/claude-skills --skill scroll-cinema -g -y
```

## License

MIT
