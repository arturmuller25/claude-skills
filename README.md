# claude-skills

My personal collection of [Agent Skills](https://skills.sh) for Claude Code (and
compatible agents). Markdown skill modules that load on demand.

## Skills

| Skill | What it does |
|---|---|
| **scroll-cinema** | Universal scroll-driven cinematic hero. Routes to the best technique for the job and budget: free Lenis + GSAP engine with SVG/CSS diorama, Three.js/Spline 3D, or Rive; for AI photoreal "fly-through" video it delegates to the `scroll-world` skill instead of reimplementing its Higgsfield/Monid pipeline. Optimized for Next.js/React: one Lenis in the root layout, `useGSAP` sections, device budget for 3D. |
| **qa-agent** | Two-stage website QA: exploratory testing in an isolated browser with repro-first logs, then materialized into durable Playwright specs for regression. Localhost/staging only. |

## Install

With the [skills CLI](https://skills.sh) (one skill per command; comma-separated
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
