# 5. adopt tailwind css v4 as the ui styling system

Status: Accepted
Status Date: 2026-04-06
Driver: Alexander
Contributors: AI

## Context
The current MVP UI proves the catalog flow, but the visual layer is still a rough scaffold. The next step is to improve the interface quality and just ot make it look good.

The maintainer already has some experience with Tailwind CSS and wants to use Tailwind 4 as the primary styling approach.
The existing product direction remains.


## Decision
Adopt Tailwind CSS v4 as the primary styling system for the UI.
Do not adopt shadcn/ui or DaisyUI component at this stage.


## Options considered

### Option 1: Tailwind CSS v4 only
Pros:
- Fast iteration for someone already fluent in Tailwind
- Good fit for incremental visual improvement
- Keeps the stack simple and understandable
- Works well with a mostly server-rendered Astro application

Cons:
- Adds setup work now
- Provides fewer prebuilt component patterns than a larger UI library approach

### Option 2: Continue with handwritten global CSS only
Pros:
- Minimal tooling
- Very explicit styling model
- No new dependencies

Cons:
- Slower to evolve visually
- Harder to keep spacing, states, and variants consistent over time
- More friction when polishing the product UI
- Fussy to control colors and reuse any of componets

### Option 3: Tailwind plus component library tooling
Pros:
- Faster access to common UI primitives
- Can accelerate polished component work

Cons:
- Adds unnecessary complexity at the current stage
- Risks importing patterns that do not match the service catalog domain
- Increases the chance of frontend creep before product needs justify it

## Advices
* To myself: Don't rush yet with components. 
