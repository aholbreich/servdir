# 1. choose typescript and astro for mvp

Status: Accepted
Status Date: 2026-03-31 19:45
Driver: Alexander
Contributors: ...

## Context 
The product is a simple service catalog with Git-backed Markdown as source of truth. The first version should optimize for low complexity, strong readability, and fast iteration rather than maximum frontend sophistication.

The UI needs list and detail pages, light search/filtering, rendered Markdown, and validation status. The codebase should be approachable for a backend-leaning engineer who already understands TypeScript and has some Astro familiarity, but wants to grow frontend skills over time.

## Decision
Use TypeScript across the project and use Astro as the primary web framework for the MVP.

Use Astro's server-rendered pages for the initial list and detail views. Add interactive islands only when they provide clear value, for example for richer client-side filtering.

Avoid committing to a heavy SPA architecture in the MVP.

### Consequences
- Keep one language across parser, validator, server, and UI.
- Reduce cognitive load compared with a split backend/frontend stack.
- Start with mostly server-rendered UI and only small interactive components where needed.
- Preserve the option to add React or Svelte islands later without rewriting the whole app.
- Accept that Astro is not the most conventional choice for highly dynamic internal tools, but it is a strong fit for content-centric pages and a low-complexity MVP.

## Options considered

### Option 1: Astro + TypeScript
Pros:
- Good fit for content-heavy pages
- Excellent performance by default
- Low ceremony
- Easy path to selective interactivity
- Familiar enough to start quickly

Cons:
- Less standard than React/Next for internal apps
- Team may eventually want a more app-like frontend model

### Option 2: React or Next.js + TypeScript
Pros:
- Very common ecosystem
- Strong fit for highly interactive UIs
- Many engineers already know React

Cons:
- More moving parts than needed for the MVP
- Higher risk of overbuilding early
- Easier to drift into SPA complexity before the product is proven

### Option 3: SvelteKit + TypeScript
Pros:
- Pleasant developer experience
- Great for interactive UIs with less boilerplate

Cons:
- Lower familiarity today
- Adds learning overhead compared with Astro

## Advices
Prefer simplicity over frontend fashion. If the catalog later needs advanced client-side graph views, live editing, or very rich interactions, revisit the framework decision with real product pressure rather than guessing now.
