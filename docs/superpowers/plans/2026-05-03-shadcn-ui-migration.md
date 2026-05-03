# shadcn/ui Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all UI components from bespoke Astro + custom CSS tokens to shadcn/ui React components with dark/light theme switching.

**Architecture:** Astro pages keep their `.astro` shells for routing and data loading. All UI components become `.tsx` React components. shadcn CSS variables in `tokens.css` replace the current `--color-*` tokens. Dark/light switching uses a class on `<html>` toggled by a small React island.

**Tech Stack:** shadcn/ui (nova preset), @astrojs/react, React 18, Tailwind v4 `@theme inline`, lucide-react, Vite `?raw` SVG imports.

**Spec:** `docs/superpowers/specs/2026-05-03-shadcn-ui-theme-design.md`

---

## File Map

### Created
- `src/components/ui/` — shadcn primitives (Button, Badge, Card, Alert, Tabs, Popover, …)
- `src/components/ui/SvgIcon.tsx` — inline SVG wrapper replacing astro-icon
- `src/components/ui/ThemeToggle.tsx` — dark/light toggle island
- `src/components/ui/IssueList.tsx`
- `src/components/ui/KeyValueList.tsx`
- `src/lib/utils.ts` — cn() utility (created by shadcn init)
- `src/components/catalog/TagLink.tsx`
- `src/components/catalog/TagCloud.tsx`
- `src/components/catalog/CatalogKindIcon.tsx`
- `src/components/catalog/ServiceCardLinkIcon.tsx`
- `src/components/ui/ServiceCard.tsx`
- `src/components/catalog/ServiceCardGrid.tsx`
- `src/components/catalog/ServiceHeader.tsx`
- `src/components/catalog/CatalogHero.tsx`
- `src/components/catalog/ServiceMetadataCard.tsx`
- `src/components/catalog/ServiceDependenciesCard.tsx`
- `src/components/catalog/ServiceValidationCard.tsx`
- `src/components/catalog/ServiceDocumentationCard.tsx`
- `src/components/catalog/CatalogStatusDetailList.tsx`
- `src/components/catalog/CatalogStatusCard.tsx`
- `src/components/catalog/ServiceCompactList.tsx`
- `src/components/catalog/PlatformList.tsx`
- `src/components/catalog/ServiceCatalogGrid.tsx`
- `components.json` — shadcn project config (created by init)
- `.adr/011-adopt-shadcn-ui-and-react-islands.md`

### Modified
- `astro.config.mjs` — add React integration
- `tsconfig.json` — add `@/` alias (done by shadcn init)
- `src/styles/tokens.css` — shadcn CSS vars replace custom tokens
- `src/styles/base.css` — stripped to resets only
- `src/styles/global.css` — remove import of components.css
- `src/layouts/BaseLayout.astro` — add flash-prevention script + ThemeToggle island
- `src/pages/index.astro`
- `src/pages/404.astro`
- `src/pages/services/[id].astro`
- `src/pages/tags/index.astro`
- `src/pages/tags/[tag].astro`
- `src/pages/platforms/index.astro`
- `src/pages/platforms/[platform].astro`
- `package.json` — @astrojs/react added

### Deleted
- `src/styles/components.css`
- `src/components/ui/Badge.astro`
- `src/components/ui/Card.astro`
- `src/components/ui/Icon.astro`
- `src/components/ui/IssueList.astro`
- `src/components/ui/KeyValueList.astro`
- `src/components/ui/MetadataPill.astro`
- `src/components/ui/SectionTitle.astro`
- `src/components/ui/ServiceCard.astro`
- `src/components/catalog/CatalogHero.astro`
- `src/components/catalog/CatalogKindIcon.astro`
- `src/components/catalog/CatalogStatusCard.astro`
- `src/components/catalog/CatalogStatusDetailList.astro`
- `src/components/catalog/CatalogStatusGitSourcesPopover.astro`
- `src/components/catalog/CatalogStatusPanel.astro`
- `src/components/catalog/CatalogStatusTabs.astro`
- `src/components/catalog/PlatformList.astro`
- `src/components/catalog/ServiceCardGrid.astro`
- `src/components/catalog/ServiceCardLinkIcon.astro`
- `src/components/catalog/ServiceCatalogGrid.astro`
- `src/components/catalog/ServiceCompactList.astro`
- `src/components/catalog/ServiceDependenciesCard.astro`
- `src/components/catalog/ServiceDocumentationCard.astro`
- `src/components/catalog/ServiceHeader.astro`
- `src/components/catalog/ServiceMetadataCard.astro`
- `src/components/catalog/ServiceValidationCard.astro`
- `src/components/catalog/TagCloud.astro`
- `src/components/catalog/TagLink.astro`
- `src/scripts/catalog-grid.ts` — replaced by React state in ServiceCatalogGrid
- `src/scripts/catalog-status-card.ts` — replaced by shadcn Tabs
- `src/scripts/mermaid-render.ts` — replaced by useEffect in ServiceDocumentationCard

---

## Task 1: Feature branch + shadcn init

**Files:**
- Create: `components.json`
- Modify: `tsconfig.json`, `package.json`, `astro.config.mjs`, `src/styles/tokens.css`

- [ ] **Step 1: Create feature branch**

```bash
git checkout -b feat/shadcn-ui
```

- [ ] **Step 2: Run shadcn init**

```bash
pnpm dlx shadcn@latest init --preset nova
```

When prompted, accept defaults. The CLI auto-detects Astro + Tailwind v4. It will:
- Create `components.json`
- Add `@/` alias to `tsconfig.json`
- Inject CSS variables into `src/styles/tokens.css`
- Install `@astrojs/react`, `react`, `react-dom`

- [ ] **Step 3: Add React integration to astro.config.mjs**

```js
// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import icon from 'astro-icon';
import tailwindcss from '@tailwindcss/vite';

const isStaticBuild = process.env.SERVDIR_BUILD_MODE === 'static';
const staticBasePath = process.env.SERVDIR_BASE_PATH;
const staticSiteUrl = process.env.SERVDIR_SITE_URL;

export default defineConfig({
  ...(isStaticBuild ? {} : { adapter: node({ mode: 'standalone' }) }),
  integrations: [react(), icon()],
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    host: process.env.HOST ?? '0.0.0.0',
    port: Number(process.env.PORT ?? 4321),
  },
  ...(isStaticBuild && staticBasePath ? { base: staticBasePath } : {}),
  ...(isStaticBuild && staticSiteUrl ? { site: staticSiteUrl } : {}),
  output: isStaticBuild ? 'static' : 'server',
});
```

- [ ] **Step 4: Verify the build compiles**

```bash
pnpm build
```

Expected: build succeeds with no errors (existing Astro components still in place).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: Initialize shadcn/ui with nova preset and React integration"
```

---

## Task 2: Theme system

**Files:**
- Modify: `src/styles/tokens.css`, `src/styles/global.css`, `src/layouts/BaseLayout.astro`
- Create: `src/components/ui/ThemeToggle.tsx`

- [ ] **Step 1: Clean up tokens.css**

After shadcn init, `tokens.css` will have shadcn CSS variables appended. Remove ALL the old custom variables (`--color-bg`, `--color-bg-2`, `--color-surface`, etc. and `--shadow-panel`). Keep only the `@import "tailwindcss";` line and the shadcn-generated `@theme inline { ... }` + `:root { ... }` + `.dark { ... }` blocks.

The file should look like this pattern (exact values from shadcn init output):
```css
@import "tailwindcss";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  /* ... shadcn generated theme vars ... */
}

:root {
  --background: <value from init>;
  --foreground: <value from init>;
  /* ... all shadcn light mode vars ... */
}

.dark {
  --background: <value from init>;
  --foreground: <value from init>;
  /* ... all shadcn dark mode vars ... */
}
```

Do not add back any `--color-bg` or other old tokens. The old names are gone.

- [ ] **Step 2: Install ThemeToggle shadcn Button dependency**

```bash
pnpm dlx shadcn@latest add button
```

- [ ] **Step 3: Create ThemeToggle.tsx**

Create `src/components/ui/ThemeToggle.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type Theme = 'light' | 'dark' | 'system';

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', isDark);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as Theme) ?? 'system';
    setTheme(saved);
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    applyTheme(next);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
      )}
    </Button>
  );
}
```

- [ ] **Step 4: Update BaseLayout.astro**

```astro
---
import '../styles/global.css';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { toAppPath } from '../lib/paths';

export interface Props {
  title: string;
}

const { title } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <link rel="icon" type="image/svg+xml" href={toAppPath('/favicon.svg')} />
    <link rel="icon" type="image/x-icon" href={toAppPath('/favicon.ico')} sizes="any" />
    <title>{title}</title>
    <script is:inline>
      const theme = localStorage.getItem('theme') ?? 'system';
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (theme === 'dark' || (theme === 'system' && prefersDark)) {
        document.documentElement.classList.add('dark');
      }
    </script>
  </head>
  <body>
    <div class="relative">
      <div class="absolute top-4 right-5 z-50">
        <ThemeToggle client:load />
      </div>
      <main class="mx-auto max-w-7xl px-5 py-9 md:px-6 md:pb-18">
        <slot />
      </main>
    </div>
  </body>
</html>
```

- [ ] **Step 5: Update global.css to remove components.css import** (keep for now, will delete the file later)

For now just verify `global.css` still imports tokens and base:
```css
@import "./tokens.css";
@import "./base.css";
@import "./components.css";
```
Leave this unchanged until Task 20 (cleanup).

- [ ] **Step 6: Strip base.css to resets only**

Replace `src/styles/base.css` with:
```css
@layer base {
  html {
    scroll-behavior: smooth;
  }

  body {
    margin: 0;
    min-height: 100vh;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
  }

  a {
    color: hsl(var(--primary));
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.92em;
  }
}
```

- [ ] **Step 7: Verify build**

```bash
pnpm build
```

Expected: build succeeds. The ThemeToggle appears in the layout.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: Add dark/light theme system with ThemeToggle"
```

---

## Task 3: SVG icon system

**Files:**
- Create: `src/components/ui/SvgIcon.tsx`

The project uses custom SVGs from `src/icons/` via `astro-icon`. We replace this with a thin React wrapper that imports SVGs via Vite's `?raw` loader (no new dependencies).

- [ ] **Step 1: Create SvgIcon.tsx**

Create `src/components/ui/SvgIcon.tsx`:

```tsx
import serviceIcon from '../../icons/kind/service.svg?raw';
import toolIcon from '../../icons/kind/tool.svg?raw';
import applicationIcon from '../../icons/kind/application.svg?raw';
import libraryIcon from '../../icons/kind/library.svg?raw';
import componentIcon from '../../icons/kind/component.svg?raw';
import iacIcon from '../../icons/kind/iac.svg?raw';
import defaultKindIcon from '../../icons/kind/default.svg?raw';
import configurationIcon from '../../icons/status/configuration.svg?raw';
import issuesIcon from '../../icons/status/issues.svg?raw';
import runtimeIcon from '../../icons/status/runtime.svg?raw';
import repositoryIcon from '../../icons/card-link/repository.svg?raw';
import runbookIcon from '../../icons/card-link/runbook.svg?raw';
import openapiIcon from '../../icons/card-link/openapi.svg?raw';
import deliveryIcon from '../../icons/card-link/delivery.svg?raw';
import platformGroupIcon from '../../icons/platform-group.svg?raw';

const icons: Record<string, string> = {
  'kind/service': serviceIcon,
  'kind/tool': toolIcon,
  'kind/application': applicationIcon,
  'kind/library': libraryIcon,
  'kind/component': componentIcon,
  'kind/iac': iacIcon,
  'kind/default': defaultKindIcon,
  'status/configuration': configurationIcon,
  'status/issues': issuesIcon,
  'status/runtime': runtimeIcon,
  'card-link/repository': repositoryIcon,
  'card-link/runbook': runbookIcon,
  'card-link/openapi': openapiIcon,
  'card-link/delivery': deliveryIcon,
  'platform-group': platformGroupIcon,
};

interface Props {
  name: string;
  size?: number | string;
  className?: string;
  label?: string;
}

export function SvgIcon({ name, size = 16, className, label }: Props) {
  const svg = icons[name];
  if (!svg) return null;
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      className={className}
      style={{ width: size, height: size, display: 'inline-flex', flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
```

- [ ] **Step 2: Add Vite SVG raw type declaration**

Create `src/env.d.ts` addition (or update `src/env.d.ts`):
```ts
/// <reference types="astro/client" />
declare module '*.svg?raw' {
  const content: string;
  export default content;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors on the new SvgIcon.tsx file.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/SvgIcon.tsx src/env.d.ts
git commit -m "feat: Add SvgIcon React component to replace astro-icon"
```

---

## Task 4: Install shadcn primitives

**Files:**
- Modify: `src/components/ui/` (shadcn adds files here)

- [ ] **Step 1: Install core primitives**

```bash
pnpm dlx shadcn@latest add badge card alert tabs popover separator
```

- [ ] **Step 2: Verify added files**

```bash
ls src/components/ui/
```

Expected: `badge.tsx`, `card.tsx`, `alert.tsx`, `tabs.tsx`, `popover.tsx`, `separator.tsx`, `button.tsx` (already added in Task 2) present alongside the old `.astro` files.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/
git commit -m "chore: Add shadcn Badge, Card, Alert, Tabs, Popover primitives"
```

---

## Task 5: IssueList.tsx and KeyValueList.tsx

**Files:**
- Create: `src/components/ui/IssueList.tsx`, `src/components/ui/KeyValueList.tsx`

- [ ] **Step 1: Create IssueList.tsx**

```tsx
import type { ValidationIssue } from '@/lib/catalog';
import { cn } from '@/lib/utils';

interface Props {
  issues: ValidationIssue[];
  className?: string;
}

export function IssueList({ issues, className }: Props) {
  return (
    <ul className={cn('grid gap-2 pl-[18px] leading-6', className)}>
      {issues.map((issue, i) => (
        <li
          key={i}
          className={issue.level === 'error' ? 'text-destructive' : 'text-amber-700 dark:text-amber-400'}
        >
          {issue.message}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Create KeyValueList.tsx**

```tsx
import { cn } from '@/lib/utils';

export interface KVItem {
  label: string;
  value?: string;
  href?: string;
  text?: string;
}

interface Props {
  items: KVItem[];
  className?: string;
}

export function KeyValueList({ items, className }: Props) {
  return (
    <ul className={cn('grid list-none gap-3 p-0 leading-6', className)}>
      {items
        .filter((item) => item.value || item.href)
        .map((item, i) => (
          <li key={i}>
            <strong className="font-semibold text-foreground">{item.label}:</strong>
            <br />
            {item.href ? (
              <a href={item.href} target="_blank" rel="noreferrer">
                {item.text ?? item.href}
              </a>
            ) : (
              item.value
            )}
          </li>
        ))}
    </ul>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/IssueList.tsx src/components/ui/KeyValueList.tsx
git commit -m "feat: Add IssueList and KeyValueList React components"
```

---

## Task 6: TagLink.tsx and TagCloud.tsx

**Files:**
- Create: `src/components/catalog/TagLink.tsx`, `src/components/catalog/TagCloud.tsx`

- [ ] **Step 1: Create TagLink.tsx**

```tsx
import { toTagSlug } from '@/lib/catalog';
import { toAppPath } from '@/lib/paths';
import { cn } from '@/lib/utils';

interface Props {
  tag: string;
  className?: string;
}

export function TagLink({ tag, className }: Props) {
  const slug = toTagSlug(tag);
  return (
    <a
      href={toAppPath(`/tags/${slug}`)}
      className={cn('font-medium text-sky-700 dark:text-sky-400 hover:underline', className)}
    >
      #{tag}
    </a>
  );
}
```

- [ ] **Step 2: Create TagCloud.tsx**

```tsx
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TagLink } from './TagLink';
import type { TagSummary } from '@/lib/catalog';
import { toTagSlug } from '@/lib/catalog';
import { toAppPath } from '@/lib/paths';

interface Props {
  tags: TagSummary[];
}

export function TagCloud({ tags }: Props) {
  if (tags.length === 0) {
    return (
      <Card>
        <CardContent className="px-6 py-14 text-center">
          <p className="text-muted-foreground mx-auto max-w-3xl leading-7">
            No tags were discovered from the configured services.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tags.map((tag) => (
        <Card key={tag.label} className="flex items-center justify-between gap-4 px-5 py-4">
          <TagLink tag={tag.label} className="text-base" />
          <Badge variant="secondary">
            {tag.serviceCount} service{tag.serviceCount === 1 ? '' : 's'}
          </Badge>
        </Card>
      ))}
    </section>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/catalog/TagLink.tsx src/components/catalog/TagCloud.tsx
git commit -m "feat: Add TagLink and TagCloud React components"
```

---

## Task 7: CatalogKindIcon.tsx and ServiceCardLinkIcon.tsx

**Files:**
- Create: `src/components/catalog/CatalogKindIcon.tsx`, `src/components/catalog/ServiceCardLinkIcon.tsx`

- [ ] **Step 1: Create CatalogKindIcon.tsx**

```tsx
import { SvgIcon } from '@/components/ui/SvgIcon';
import { getCatalogKindIconName } from '@/lib/catalog-kind-icon';

interface Props {
  kind: string | undefined;
  size?: number | string;
  className?: string;
}

export function CatalogKindIcon({ kind, size = 14, className }: Props) {
  return (
    <SvgIcon
      name={getCatalogKindIconName(kind)}
      size={size}
      className={className}
    />
  );
}
```

- [ ] **Step 2: Create ServiceCardLinkIcon.tsx**

```tsx
import { SvgIcon } from '@/components/ui/SvgIcon';
import type { ServiceCardLinkKind } from '@/lib/service-card-links';
import { cn } from '@/lib/utils';

const iconNames: Record<ServiceCardLinkKind, string> = {
  repository: 'card-link/repository',
  runbook: 'card-link/runbook',
  openapi: 'card-link/openapi',
  delivery: 'card-link/delivery',
};

interface Props {
  kind: ServiceCardLinkKind;
  href: string;
  label: string;
}

export function ServiceCardLinkIcon({ kind, href, label }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-full border text-muted-foreground transition-colors',
        'border-border/40 bg-background/90 hover:border-primary/20 hover:bg-primary/5 hover:text-primary',
      )}
    >
      <SvgIcon name={iconNames[kind]} size={16} />
    </a>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/catalog/CatalogKindIcon.tsx src/components/catalog/ServiceCardLinkIcon.tsx
git commit -m "feat: Add CatalogKindIcon and ServiceCardLinkIcon React components"
```

---

## Task 8: ServiceCard.tsx

**Files:**
- Create: `src/components/ui/ServiceCard.tsx`

- [ ] **Step 1: Create ServiceCard.tsx**

```tsx
import { Card, CardContent } from '@/components/ui/card';
import { IssueList } from '@/components/ui/IssueList';
import { CatalogKindIcon } from '@/components/catalog/CatalogKindIcon';
import { ServiceCardLinkIcon } from '@/components/catalog/ServiceCardLinkIcon';
import { TagLink } from '@/components/catalog/TagLink';
import { getServiceSummary } from '@/lib/catalog';
import type { ServiceRecord } from '@/lib/catalog';
import { toAppPath } from '@/lib/paths';
import { getServiceCardLinks } from '@/lib/service-card-links';

interface Props {
  service: ServiceRecord;
}

export function ServiceCard({ service }: Props) {
  const summary = getServiceSummary(service);
  const hasIssues = service.issues.length > 0;
  const cardLinks = getServiceCardLinks(service.data);

  return (
    <Card className="flex h-full flex-col px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
      <div>
        <h2 className="min-w-0 text-[1.2rem] leading-tight font-semibold sm:text-[1.28rem]">
          <a href={toAppPath(`/services/${service.slug}`)}>{service.data.name}</a>
        </h2>
        <span className="inline-flex items-center gap-1.5 text-[0.82rem] text-muted-foreground">
          <CatalogKindIcon kind={service.data.kind} className="shrink-0 text-muted-foreground" />
          <span>{service.data.id}</span>
        </span>
        {service.data.tags && service.data.tags.length > 0 && (
          <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[0.83rem] leading-5">
            {service.data.tags.map((tag) => (
              <TagLink key={tag} tag={tag} />
            ))}
          </p>
        )}
      </div>

      <p className="mt-3 line-clamp-2 text-[0.98rem] leading-6 text-muted-foreground">
        {summary}
      </p>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border/70 pt-3 text-[0.95rem]">
        <div className="flex flex-wrap items-center gap-2">
          {cardLinks.map((link) => (
            <ServiceCardLinkIcon key={link.kind} kind={link.kind} href={link.href} label={link.label} />
          ))}
        </div>
        <a href={toAppPath(`/services/${service.slug}`)}>View details →</a>
      </div>

      {hasIssues && <IssueList issues={service.issues} className="mt-3 gap-1.5" />}
    </Card>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/ServiceCard.tsx
git commit -m "feat: Add ServiceCard React component"
```

---

## Task 9: ServiceCardGrid.tsx

**Files:**
- Create: `src/components/catalog/ServiceCardGrid.tsx`

- [ ] **Step 1: Create ServiceCardGrid.tsx**

```tsx
import { ServiceCard } from '@/components/ui/ServiceCard';
import type { ServiceRecord } from '@/lib/catalog';
import { normalizeCatalogKind } from '@/lib/catalog-kind-icon';
import { cn } from '@/lib/utils';

interface Props {
  services: ServiceRecord[];
  grouped?: boolean;
}

export function ServiceCardGrid({ services, grouped = false }: Props) {
  return (
    <ul className={cn('grid list-none md:grid-cols-2 lg:grid-cols-3', grouped ? 'gap-3 lg:gap-3.5' : 'gap-4')}>
      {services.map((service) => (
        <li
          key={service.slug}
          data-service-kind={normalizeCatalogKind(service.data.kind) || 'service'}
          data-service-name={service.data.name.toLowerCase()}
          data-service-id={service.data.id.toLowerCase()}
        >
          <ServiceCard service={service} />
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/catalog/ServiceCardGrid.tsx
git commit -m "feat: Add ServiceCardGrid React component"
```

---

## Task 10: CatalogHero.tsx and ServiceHeader.tsx

**Files:**
- Create: `src/components/catalog/CatalogHero.tsx`, `src/components/catalog/ServiceHeader.tsx`

- [ ] **Step 1: Create CatalogHero.tsx**

```tsx
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}

export function CatalogHero({
  title,
  subtitle = 'Git is the database. Markdown files are the source of truth.',
  eyebrow = 'Servdir - Simple Service Catalog',
}: Props) {
  return (
    <Card>
      <CardContent className="p-7">
        <p className="text-muted-foreground mb-2.5 text-[0.82rem] tracking-[0.02em]">{eyebrow}</p>
        <h1 className="mb-3 text-4xl font-semibold leading-tight tracking-[-0.03em] md:text-5xl">
          {title}
        </h1>
        <p className="text-muted-foreground max-w-5xl leading-7">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create ServiceHeader.tsx**

```tsx
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TagLink } from './TagLink';
import type { ServiceRecord } from '@/lib/catalog';

interface Props {
  service: ServiceRecord;
}

export function ServiceHeader({ service }: Props) {
  const hasIssues = service.issues.length > 0;

  const attributeItems = [
    service.data.id,
    service.data.kind,
    service.data.owner,
    service.data.lifecycle,
    ...(service.data.system ? [service.data.system] : []),
    ...(service.data.domain ? [service.data.domain] : []),
    ...(service.data.tier ? [`tier ${service.data.tier}`] : []),
  ];

  return (
    <Card className="mb-5">
      <CardContent className="p-6.5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-3 text-4xl font-semibold leading-tight md:text-5xl">
              {service.data.name}
            </h1>
            <div className="mt-0.5 flex flex-wrap gap-2 text-[0.9rem] leading-5">
              {attributeItems.map((value, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/60 px-2.5 py-1 text-muted-foreground"
                >
                  {value}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Badge variant={hasIssues ? 'destructive' : 'default'}>
              {hasIssues ? `${service.issues.length} issue(s)` : 'valid'}
            </Badge>
            {service.data.tags?.map((tag) => (
              <TagLink key={tag} tag={tag} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/catalog/CatalogHero.tsx src/components/catalog/ServiceHeader.tsx
git commit -m "feat: Add CatalogHero and ServiceHeader React components"
```

---

## Task 11: ServiceMetadataCard.tsx

**Files:**
- Create: `src/components/catalog/ServiceMetadataCard.tsx`

- [ ] **Step 1: Create ServiceMetadataCard.tsx**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyValueList } from '@/components/ui/KeyValueList';
import type { ServiceRecord } from '@/lib/catalog';

interface Props {
  service: ServiceRecord;
}

export function ServiceMetadataCard({ service }: Props) {
  const metadataItems = [
    { label: 'Kind', value: service.data.kind },
    { label: 'Repository', href: service.data.repo, text: 'Open repository ↗' },
    { label: 'Runbook', href: service.data.runbook, text: 'Open runbook ↗' },
    { label: 'System', value: service.data.system },
    { label: 'Domain', value: service.data.domain },
    ...(service.data.links ?? []).map((link) => ({
      label: link.label,
      href: link.url,
      text: 'Visit ↗',
    })),
  ];

  const openApiItems = (service.data.openapi ?? []).map((entry) => ({
    label: entry.label,
    href: entry.url,
    text: 'OpenAPI spec ↗',
  }));

  const deliveryItems = (service.data.delivery ?? []).map((entry) => ({
    label: entry.label,
    value: entry.text,
    href: entry.url,
    text: entry.url ? 'Open pipeline ↗' : undefined,
  }));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <KeyValueList items={metadataItems} />
        </CardContent>
      </Card>

      {openApiItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">OpenAPI</CardTitle>
          </CardHeader>
          <CardContent>
            <KeyValueList items={openApiItems} />
          </CardContent>
        </Card>
      )}

      {deliveryItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <KeyValueList items={deliveryItems} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/catalog/ServiceMetadataCard.tsx
git commit -m "feat: Add ServiceMetadataCard React component"
```

---

## Task 12: ServiceDependenciesCard.tsx and ServiceValidationCard.tsx

**Files:**
- Create: `src/components/catalog/ServiceDependenciesCard.tsx`, `src/components/catalog/ServiceValidationCard.tsx`

- [ ] **Step 1: Create ServiceDependenciesCard.tsx**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ServiceRecord } from '@/lib/catalog';
import { toAppPath } from '@/lib/paths';

export interface DependencyItem {
  id: string;
  service?: ServiceRecord;
}

interface Props {
  dependencies: DependencyItem[];
}

export function ServiceDependenciesCard({ dependencies }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Dependencies</CardTitle>
      </CardHeader>
      <CardContent>
        {dependencies.length > 0 ? (
          <ul className="grid gap-2 pl-4.5 leading-6">
            {dependencies.map((dep) => (
              <li key={dep.id}>
                {dep.service ? (
                  <a href={toAppPath(`/services/${dep.service.slug}`)}>{dep.id}</a>
                ) : (
                  dep.id
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground leading-6">No dependencies declared.</p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create ServiceValidationCard.tsx**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IssueList } from '@/components/ui/IssueList';
import type { ServiceRecord } from '@/lib/catalog';

interface Props {
  service: ServiceRecord;
}

export function ServiceValidationCard({ service }: Props) {
  const hasIssues = service.issues.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Validation</CardTitle>
      </CardHeader>
      <CardContent>
        {hasIssues ? (
          <IssueList issues={service.issues} />
        ) : (
          <p className="leading-6 text-green-700 dark:text-green-400">No validation issues.</p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/catalog/ServiceDependenciesCard.tsx src/components/catalog/ServiceValidationCard.tsx
git commit -m "feat: Add ServiceDependenciesCard and ServiceValidationCard React components"
```

---

## Task 13: ServiceDocumentationCard.tsx

The mermaid-render script (`src/scripts/mermaid-render.ts`) operated on server-rendered DOM. In React, we trigger it via `useEffect` after hydration. This requires `client:load` on this component.

**Files:**
- Create: `src/components/catalog/ServiceDocumentationCard.tsx`

- [ ] **Step 1: Create ServiceDocumentationCard.tsx**

```tsx
import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  html: string;
}

export function ServiceDocumentationCard({ html }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const blocks = Array.from(
      el.querySelectorAll<HTMLElement>('pre code.language-mermaid'),
    );
    if (blocks.length === 0) return;

    let cancelled = false;

    async function renderDiagrams() {
      const { default: mermaid } = await import('mermaid');
      if (cancelled) return;

      mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' });
      let idCounter = 0;

      for (const block of blocks) {
        if (cancelled) break;
        const source = block.textContent ?? '';
        const pre = block.closest('pre');
        if (!pre || !source.trim()) continue;

        const diagramId = `mermaid-${idCounter++}`;
        const wrapper = document.createElement('div');
        wrapper.className = 'mermaid-block';

        try {
          const result = await mermaid.render(diagramId, source);
          const diagramEl = document.createElement('div');
          diagramEl.className = 'mermaid-diagram';
          diagramEl.innerHTML = result.svg;
          wrapper.appendChild(diagramEl);
          wrapper.appendChild(buildSourcePanel(source, false));
        } catch {
          const errorEl = document.createElement('div');
          errorEl.className = 'mermaid-error';
          errorEl.textContent = 'Diagram could not be rendered. Check the syntax below.';
          wrapper.appendChild(errorEl);
          wrapper.appendChild(buildSourcePanel(source, true));
        }

        pre.replaceWith(wrapper);
      }
    }

    renderDiagrams();
    return () => { cancelled = true; };
  }, [html]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Documentation</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={contentRef}
          className="prose-catalog max-w-none leading-7"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </CardContent>
    </Card>
  );
}

function buildSourcePanel(source: string, expanded: boolean): HTMLElement {
  const details = document.createElement('details');
  details.className = 'mermaid-source';
  if (expanded) details.open = true;
  const summary = document.createElement('summary');
  summary.textContent = 'Show source';
  details.appendChild(summary);
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.textContent = source;
  pre.appendChild(code);
  details.appendChild(pre);
  return details;
}
```

- [ ] **Step 2: Move mermaid + prose styles from components.css to global.css or tokens.css**

The `.prose-catalog` and `.mermaid-*` styles currently live in `components.css`. Move them verbatim to `src/styles/base.css` (append at end) so they survive the `components.css` deletion in Task 20:

```css
/* append to base.css */
.prose-catalog {
  @apply max-w-none leading-7;
}
.prose-catalog h1, .prose-catalog h2, .prose-catalog h3 {
  @apply mt-8 mb-3 font-semibold;
}
/* ... copy all .prose-catalog rules from components.css verbatim ... */

.mermaid-block { margin-block: 1.25rem; }
.mermaid-diagram { overflow-x: auto; }
.mermaid-diagram svg { max-width: 100%; height: auto; display: block; margin-inline: auto; }
.mermaid-error {
  padding: 0.5rem 0.75rem;
  border-left: 3px solid hsl(var(--destructive));
  background: hsl(var(--destructive)/0.08);
  color: hsl(var(--destructive));
  font-size: 0.875rem;
  border-radius: 0.25rem;
  margin-bottom: 0.5rem;
}
.mermaid-source { margin-top: 0.5rem; font-size: 0.8rem; }
.mermaid-source summary { cursor: pointer; color: hsl(var(--muted-foreground)); user-select: none; width: fit-content; }
.mermaid-source summary:hover { color: hsl(var(--foreground)); }
.mermaid-source pre { margin-top: 0.5rem; padding: 0.75rem; background: hsl(var(--muted)); border: 1px solid hsl(var(--border)); border-radius: 0.375rem; overflow-x: auto; font-size: 0.8rem; white-space: pre; }
```

- [ ] **Step 3: Verify TypeScript**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/catalog/ServiceDocumentationCard.tsx src/styles/base.css
git commit -m "feat: Add ServiceDocumentationCard React component with mermaid via useEffect"
```

---

## Task 14: CatalogStatusDetailList.tsx

**Files:**
- Create: `src/components/catalog/CatalogStatusDetailList.tsx`

- [ ] **Step 1: Create CatalogStatusDetailList.tsx**

```tsx
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface DetailItem {
  label: string;
  value: string;
  asCode?: boolean;
}

interface Props {
  items: DetailItem[];
  className?: string;
  children?: ReactNode;
}

export function CatalogStatusDetailList({ items, className, children }: Props) {
  return (
    <dl className={cn('grid gap-x-4 gap-y-2 text-[0.95rem] leading-6', className)}
      style={{ gridTemplateColumns: 'auto minmax(0, 1fr)' }}
    >
      {items.map((item) => (
        <>
          <dt key={`${item.label}-dt`} className="text-muted-foreground font-medium">{item.label}</dt>
          <dd key={`${item.label}-dd`} className="min-w-0 break-words text-foreground">
            {item.asCode ? <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{item.value}</code> : item.value}
          </dd>
        </>
      ))}
      {children}
    </dl>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/catalog/CatalogStatusDetailList.tsx
git commit -m "feat: Add CatalogStatusDetailList React component"
```

---

## Task 15: CatalogStatusCard.tsx (Tabs, Popover, client:load)

This is the most complex component. It replaces `CatalogStatusCard.astro`, `CatalogStatusTabs.astro`, `CatalogStatusPanel.astro`, and `CatalogStatusGitSourcesPopover.astro`. The vanilla JS tab logic is replaced by shadcn `Tabs`. The `<details>` popover becomes shadcn `Popover`.

**Files:**
- Create: `src/components/catalog/CatalogStatusCard.tsx`

- [ ] **Step 1: Create CatalogStatusCard.tsx**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { SvgIcon } from '@/components/ui/SvgIcon';
import { CatalogStatusDetailList } from './CatalogStatusDetailList';
import type { DetailItem } from './CatalogStatusDetailList';
import {
  CATALOG_STATUS_TABS,
  describeGitSourceHealth,
  describeSourceMode,
  formatDuration,
  getGitSourcesSummaryLabel,
  getGitSourceSyncBadge,
  summarizeGitSourceError,
} from '@/lib/catalog-status';
import type { GitSourceSyncStatus } from '@/lib/catalog/sources';
import type { GitSourceConfig } from '@/lib/config';

interface GitSourceItem extends GitSourceConfig {
  syncStatus?: GitSourceSyncStatus;
}

interface Props {
  servicesCount: number;
  servicesValid: number;
  servicesWithIssues: number;
  generatedAt: string;
  buildVersion: string;
  snapshotStatus: 'fresh' | 'stale';
  snapshotError?: string;
  localCatalogPath?: string;
  gitSourcesCount: number;
  gitSources: GitSourceConfig[];
  gitSyncIntervalMs: number;
  gitSourceStatuses: GitSourceSyncStatus[];
  basicAuthEnabled: boolean;
}

export function CatalogStatusCard({
  servicesCount,
  servicesValid,
  servicesWithIssues,
  generatedAt,
  buildVersion,
  snapshotStatus,
  snapshotError,
  localCatalogPath,
  gitSourcesCount,
  gitSources,
  gitSyncIntervalMs,
  gitSourceStatuses,
  basicAuthEnabled,
}: Props) {
  const dateFormatter = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  const gitSourceStatusByPath = new Map(gitSourceStatuses.map((s) => [s.checkoutPath, s]));
  const gitSourcesWithStatus: GitSourceItem[] = gitSources.map((source) => ({
    ...source,
    syncStatus: gitSourceStatusByPath.get(source.checkoutPath),
  }));
  const gitSourceFailureCount = gitSourcesWithStatus.filter((s) => s.syncStatus && !s.syncStatus.lastSyncSucceeded).length;
  const gitSourceKnownStatusCount = gitSourcesWithStatus.filter((s) => s.syncStatus).length;

  const configurationItems: DetailItem[] = [
    { label: 'Source mode', value: describeSourceMode(localCatalogPath, gitSourcesCount) },
    { label: 'Local catalog', value: localCatalogPath ?? 'disabled', asCode: Boolean(localCatalogPath) },
    { label: 'Git sync health', value: describeGitSourceHealth(gitSourcesCount, gitSourceFailureCount, gitSourceKnownStatusCount) },
    { label: 'Basic auth', value: basicAuthEnabled ? 'enabled' : 'disabled' },
  ];

  const runtimeItems: DetailItem[] = [
    { label: 'Generated', value: dateFormatter.format(new Date(generatedAt)) },
    { label: 'Snapshot', value: snapshotStatus },
    { label: 'Build', value: buildVersion },
    { label: 'Git sync interval', value: formatDuration(gitSyncIntervalMs) },
  ];

  const issueItems: DetailItem[] = [
    {
      label: 'Validation warnings',
      value: servicesWithIssues > 0
        ? `${servicesWithIssues} service${servicesWithIssues === 1 ? '' : 's'} with warnings`
        : 'None',
    },
    ...(gitSourcesCount > 0 ? [{ label: 'Git source sync', value: describeGitSourceHealth(gitSourcesCount, gitSourceFailureCount, gitSourceKnownStatusCount) }] : []),
    ...(snapshotError ? [{ label: 'Last refresh error', value: snapshotError }] : []),
  ];

  const summaryBadges = [
    { variant: 'secondary' as const, label: `${servicesCount} services` },
    { variant: 'secondary' as const, label: `${servicesValid} valid` },
    { variant: (servicesWithIssues > 0 ? 'destructive' : 'secondary') as const, label: servicesWithIssues > 0 ? `${servicesWithIssues} warnings` : 'No warnings' },
    ...(gitSourcesCount > 0 ? [{
      variant: (gitSourceFailureCount > 0 ? 'destructive' : gitSourceKnownStatusCount > 0 ? 'secondary' : 'outline') as const,
      label: describeGitSourceHealth(gitSourcesCount, gitSourceFailureCount, gitSourceKnownStatusCount),
    }] : []),
    { variant: (snapshotStatus === 'fresh' ? 'secondary' : 'destructive') as const, label: snapshotStatus },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Catalog status</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="configuration">
          <TabsList className="mb-4">
            {CATALOG_STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="inline-flex items-center gap-1.5">
                <SvgIcon name={tab.icon} size={14} />
                <span className="sr-only sm:not-sr-only">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="configuration">
            <CatalogStatusDetailList items={configurationItems}>
              <dt className="text-muted-foreground font-medium">Git sources</dt>
              <dd className="flex min-w-0 flex-wrap items-center gap-2 text-foreground">
                {gitSources.length > 0 ? (
                  <GitSourcesPopover
                    gitSources={gitSourcesWithStatus}
                    summaryLabel={getGitSourcesSummaryLabel(gitSourcesCount)}
                    countLabel={String(gitSourcesCount)}
                  />
                ) : (
                  <span>{gitSourcesCount}</span>
                )}
              </dd>
            </CatalogStatusDetailList>
          </TabsContent>

          <TabsContent value="runtime">
            <CatalogStatusDetailList items={runtimeItems} />
          </TabsContent>

          <TabsContent value="issues">
            <div className="mb-4 flex flex-wrap gap-2">
              {summaryBadges.map((badge, i) => (
                <Badge key={i} variant={badge.variant}>{badge.label}</Badge>
              ))}
            </div>
            <CatalogStatusDetailList items={issueItems} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface GitSourcesPopoverProps {
  gitSources: GitSourceItem[];
  summaryLabel: string;
  countLabel: string;
}

function GitSourcesPopover({ gitSources, summaryLabel, countLabel }: GitSourcesPopoverProps) {
  const dateFormatter = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex items-center text-[0.88rem] font-medium text-muted-foreground underline underline-offset-2 transition-colors hover:text-primary"
        aria-label={summaryLabel}
        title={summaryLabel}
      >
        {countLabel}…
      </PopoverTrigger>
      <PopoverContent className="w-[min(21rem,calc(100vw-3rem))] p-2.5" align="end">
        <div className="grid gap-1.5 overflow-auto" style={{ maxHeight: 'min(18rem, 52vh)' }}>
          {gitSources.map((source, i) => {
            const syncBadge = getGitSourceSyncBadge(source.syncStatus);
            const syncHint = summarizeGitSourceError(source.syncStatus?.lastError);
            return (
              <section key={i} className="rounded-lg border bg-muted/40 px-2.5 py-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="text-[0.78rem] font-semibold">{source.name}</h3>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Badge variant={syncBadge.tone === 'ok' ? 'secondary' : syncBadge.tone === 'warn' ? 'destructive' : 'outline'}>
                      {syncBadge.label}
                    </Badge>
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[0.66rem] font-medium text-muted-foreground">
                      {source.branch}
                    </span>
                  </div>
                </div>
                <dl className="grid gap-x-2 gap-y-0.5 text-[0.75rem] leading-4.5"
                  style={{ gridTemplateColumns: 'auto minmax(0, 1fr)' }}
                >
                  <dt className="text-muted-foreground">Repo</dt>
                  <dd className="min-w-0 break-all"><code className="text-[0.72rem]">{source.repoUrl}</code></dd>
                  <dt className="text-muted-foreground">Scan</dt>
                  <dd className="min-w-0 break-words">{source.scanPaths ? source.scanPaths.join(', ') : '(repo root)'}</dd>
                  {source.syncStatus?.lastSyncFinishedAt && (
                    <>
                      <dt className="text-muted-foreground">Last sync</dt>
                      <dd className="min-w-0 break-words">{dateFormatter.format(new Date(source.syncStatus.lastSyncFinishedAt))}</dd>
                    </>
                  )}
                  {syncHint && (
                    <>
                      <dt className="text-muted-foreground">Issue</dt>
                      <dd className="min-w-0 break-words text-destructive">{syncHint}</dd>
                    </>
                  )}
                </dl>
              </section>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/catalog/CatalogStatusCard.tsx
git commit -m "feat: Add CatalogStatusCard React component with shadcn Tabs and Popover"
```

---

## Task 16: ServiceCompactList.tsx and PlatformList.tsx

**Files:**
- Create: `src/components/catalog/ServiceCompactList.tsx`, `src/components/catalog/PlatformList.tsx`

- [ ] **Step 1: Create ServiceCompactList.tsx**

```tsx
import { Badge } from '@/components/ui/badge';
import { CatalogKindIcon } from './CatalogKindIcon';
import { TagLink } from './TagLink';
import type { CSSProperties } from 'react';
import type { ServiceRecord } from '@/lib/catalog';
import { toAppPath } from '@/lib/paths';
import { cn } from '@/lib/utils';

interface Props {
  services: ServiceRecord[];
  idColumnWidthCh?: number;
}

export function ServiceCompactList({ services, idColumnWidthCh }: Props) {
  const colWidth = idColumnWidthCh ?? Math.max(...services.map((s) => s.data.id.length), 8);

  return (
    <ul
      className="divide-y divide-border rounded-2xl border border-border bg-background/85 shadow-sm"
      style={{ '--catalog-id-column': `calc(${colWidth}ch + 1.25rem)` } as CSSProperties}
    >
      {services.map((service) => (
        <li
          key={service.slug}
          data-service-kind={service.data.kind?.trim().toLowerCase() || 'service'}
          data-service-name={service.data.name.toLowerCase()}
          data-service-id={service.data.id.toLowerCase()}
        >
          <div className="group/row px-4 py-3 transition-all duration-150 hover:bg-primary/[0.03] sm:px-5">
            <div
              className="grid items-start gap-[0.5rem_0.875rem] md:gap-[0.75rem_1rem]"
              style={{
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gridTemplateAreas: '"title status" "id status" "meta meta"',
              } as CSSProperties}
            >
              <a
                href={toAppPath(`/services/${service.slug}`)}
                className="min-w-0 text-[1rem] font-semibold leading-5 transition-colors group-hover/row:text-primary"
                style={{ gridArea: 'title' }}
              >
                {service.data.name}
              </a>

              <a
                href={toAppPath(`/services/${service.slug}`)}
                className="inline-flex items-center gap-1.5 text-[0.84rem] text-muted-foreground"
                style={{ gridArea: 'id', width: 'fit-content' }}
              >
                <CatalogKindIcon
                  kind={service.data.kind}
                  className="shrink-0 text-muted-foreground transition-colors group-hover/row:text-primary"
                />
                <span>{service.data.id}</span>
              </a>

              <span
                className="flex shrink-0 items-center gap-2 justify-self-end"
                style={{ gridArea: 'status' }}
              >
                {service.issues.length > 0 ? (
                  <Badge variant="destructive">
                    {service.issues.length} warning{service.issues.length === 1 ? '' : 's'}
                  </Badge>
                ) : (
                  <Badge variant="secondary">ok</Badge>
                )}
              </span>

              <span
                className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[0.9rem]"
                style={{ gridArea: 'meta', marginTop: '0.125rem' }}
              >
                {service.data.tags && service.data.tags.length > 0 && (
                  <span className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-[0.83rem] leading-5">
                    {service.data.tags.map((tag) => (
                      <TagLink key={tag} tag={tag} />
                    ))}
                  </span>
                )}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Create PlatformList.tsx**

```tsx
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PlatformSummary } from '@/lib/catalog';
import { toAppPath } from '@/lib/paths';

interface Props {
  platforms: PlatformSummary[];
}

export function PlatformList({ platforms }: Props) {
  if (platforms.length === 0) {
    return (
      <Card>
        <CardContent className="px-6 py-14 text-center">
          <p className="text-muted-foreground mx-auto max-w-3xl leading-7">
            No platforms were found in the configured services.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {platforms.map((platform) => (
        <Card key={platform.slug} className="flex items-center justify-between gap-4 px-5 py-4">
          <a
            href={toAppPath(`/platforms/${platform.slug}`)}
            className="text-base font-medium hover:underline"
          >
            {platform.label}
          </a>
          <Badge variant="secondary">
            {platform.serviceCount} service{platform.serviceCount === 1 ? '' : 's'}
          </Badge>
        </Card>
      ))}
    </section>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/catalog/ServiceCompactList.tsx src/components/catalog/PlatformList.tsx
git commit -m "feat: Add ServiceCompactList and PlatformList React components"
```

---

## Task 17: ServiceCatalogGrid.tsx (interactive, client:load)

This component replaces `ServiceCatalogGrid.astro` + `src/scripts/catalog-grid.ts`. All vanilla JS state becomes React state.

**Files:**
- Create: `src/components/catalog/ServiceCatalogGrid.tsx`

- [ ] **Step 1: Create ServiceCatalogGrid.tsx**

```tsx
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ServiceCardGrid } from './ServiceCardGrid';
import { ServiceCompactList } from './ServiceCompactList';
import { CatalogKindIcon } from './CatalogKindIcon';
import type { ServiceRecord } from '@/lib/catalog';
import { buildPlatformGroups, flattenPlatformGroups } from '@/lib/catalog';
import { normalizeCatalogKind } from '@/lib/catalog-kind-icon';
import { toAppPath } from '@/lib/paths';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'servdir:catalog-view';

interface Props {
  services: ServiceRecord[];
}

export function ServiceCatalogGrid({ services }: Props) {
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [activeKind, setActiveKind] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformGrouped, setPlatformGrouped] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'cards') setViewMode('cards');
  }, []);

  function handleViewMode(mode: 'list' | 'cards') {
    setViewMode(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }

  function toggleKind(kind: string) {
    setActiveKind((prev) => (prev === kind ? null : kind));
  }

  const uniqueKinds = useMemo(
    () => [...new Set(services.map((s) => normalizeCatalogKind(s.data.kind) || 'service'))].sort(),
    [services],
  );

  const platformGroups = useMemo(() => buildPlatformGroups(services), [services]);
  const showPlatformToggle = platformGroups.length > 1;
  const showKindFilter = uniqueKinds.length > 1;

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return services.filter((s) => {
      const kindMatch = !activeKind || normalizeCatalogKind(s.data.kind) === activeKind;
      const searchMatch =
        !q ||
        s.data.name.toLowerCase().includes(q) ||
        s.data.id.toLowerCase().includes(q);
      return kindMatch && searchMatch;
    });
  }, [services, activeKind, searchQuery]);

  const filteredGroups = useMemo(
    () =>
      platformGroups.map((group) => ({
        ...group,
        services: group.services.filter((s) => filteredServices.includes(s)),
      })).filter((g) => g.services.length > 0),
    [platformGroups, filteredServices],
  );

  const globalIdWidthCh = useMemo(
    () => Math.max(...filteredServices.map((s) => s.data.id.length), 8),
    [filteredServices],
  );

  const sortedFiltered = useMemo(() => flattenPlatformGroups(
    platformGroups.map((g) => ({ ...g, services: g.services.filter((s) => filteredServices.includes(s)) }))
  ), [platformGroups, filteredServices]);

  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="px-6 py-14 text-center">
          <h2 className="mb-2.5 text-xl font-semibold">No services found</h2>
          <p className="text-muted-foreground mx-auto max-w-3xl leading-7">
            No services were discovered from the configured sources yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or id…"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl border border-border bg-background/85 px-4 py-2 text-[0.95rem] shadow-sm placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />

        <div className="flex shrink-0 items-center gap-3">
          {showKindFilter && (
            <div className="inline-flex items-center gap-1" role="group" aria-label="Filter by kind">
              {uniqueKinds.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => toggleKind(kind)}
                  aria-pressed={activeKind === kind}
                  title={kind.charAt(0).toUpperCase() + kind.slice(1)}
                  className={cn(
                    'inline-flex size-7 items-center justify-center rounded-full border bg-background/72 text-muted-foreground transition-colors',
                    'hover:bg-primary/8 hover:text-foreground border-border',
                    activeKind === kind && 'border-primary/38 bg-primary/12 text-primary',
                  )}
                >
                  <CatalogKindIcon kind={kind} size={15} />
                </button>
              ))}
            </div>
          )}

          <div className="inline-flex rounded-full border border-border bg-background/80 p-1 shadow-sm" role="group" aria-label="Catalog view mode">
            {(['list', 'cards'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleViewMode(mode)}
                aria-pressed={viewMode === mode}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[0.92rem] font-medium transition-colors',
                  viewMode === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-primary/8 hover:text-foreground',
                )}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
            {showPlatformToggle && (
              <>
                <span className="mx-1 w-px self-stretch bg-border" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => setPlatformGrouped((v) => !v)}
                  aria-pressed={platformGrouped}
                  title="Group by platform"
                  className={cn(
                    'rounded-full px-3 py-1.5 text-[0.92rem] font-medium transition-colors',
                    platformGrouped ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-primary/8 hover:text-foreground',
                  )}
                >
                  Group
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-4">
        <p className="text-muted-foreground text-[0.95rem]">
          Showing {filteredServices.length} service{filteredServices.length === 1 ? '' : 's'}
        </p>
        <a href={toAppPath('/tags')} className="text-[0.95rem]">Browse tags</a>
        {services.some((s) => s.data.platform?.trim()) && (
          <a href={toAppPath('/platforms')} className="text-[0.95rem]">Browse platforms</a>
        )}
      </div>

      {viewMode === 'list' && (
        platformGrouped ? (
          <div className="grid gap-6">
            {filteredGroups.map((group) => (
              <div key={group.platform ?? '__other__'}>
                <div className="mb-2 flex items-center gap-1.5 px-0.5">
                  <span className="text-[0.82rem] font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</span>
                  <span className="inline-flex items-center rounded-full border border-border bg-muted px-1.5 py-0.25 text-[0.72rem] leading-none text-muted-foreground">
                    {group.services.length}
                  </span>
                </div>
                <ServiceCompactList services={group.services} idColumnWidthCh={globalIdWidthCh} />
              </div>
            ))}
          </div>
        ) : (
          <ServiceCompactList services={sortedFiltered} idColumnWidthCh={globalIdWidthCh} />
        )
      )}

      {viewMode === 'cards' && (
        platformGrouped ? (
          <div className="grid gap-4">
            {filteredGroups.map((group) => (
              <div key={group.platform ?? '__other__'}>
                <div className="mb-2 flex items-center gap-1.5 px-0.5">
                  <span className="text-[0.74rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{group.label}</span>
                  <span className="inline-flex items-center rounded-full border border-border bg-muted px-1.25 py-0.25 text-[0.68rem] leading-none text-muted-foreground">
                    {group.services.length}
                  </span>
                </div>
                <ServiceCardGrid services={group.services} grouped />
              </div>
            ))}
          </div>
        ) : (
          <ServiceCardGrid services={sortedFiltered} />
        )
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/catalog/ServiceCatalogGrid.tsx
git commit -m "feat: Add ServiceCatalogGrid React component with React state"
```

---

## Task 18: Update all pages

**Files:**
- Modify: `src/pages/index.astro`, `src/pages/404.astro`, `src/pages/services/[id].astro`, `src/pages/tags/index.astro`, `src/pages/tags/[tag].astro`, `src/pages/platforms/index.astro`, `src/pages/platforms/[platform].astro`

- [ ] **Step 1: Update src/pages/index.astro**

```astro
---
import { CatalogHero } from '@/components/catalog/CatalogHero';
import { CatalogStatusCard } from '@/components/catalog/CatalogStatusCard';
import { ServiceCatalogGrid } from '@/components/catalog/ServiceCatalogGrid';
import BaseLayout from '@/layouts/BaseLayout.astro';
import { getConfig } from '@/lib/config';
import { loadConfiguredCatalog } from '@/lib/catalog';
import { getGitSyncStatuses } from '@/lib/git-sync';

const config = getConfig();
const catalog = await loadConfiguredCatalog();
const gitSourceStatuses = getGitSyncStatuses();
const servicesWithIssues = catalog.services.filter((s) => s.issues.length > 0).length;
const servicesValid = catalog.services.length - servicesWithIssues;
---

<BaseLayout title="servdir — Service Catalog">
  <section class="mb-7 grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,0.9fr)]">
    <CatalogHero title={config.catalogTitle} />

    <CatalogStatusCard
      client:load
      servicesCount={catalog.services.length}
      servicesValid={servicesValid}
      servicesWithIssues={servicesWithIssues}
      generatedAt={catalog.generatedAt}
      buildVersion={config.appBuildVersion}
      snapshotStatus={catalog.snapshotStatus}
      snapshotError={catalog.snapshotError}
      localCatalogPath={config.localCatalogPath}
      gitSourcesCount={config.gitSources.length}
      gitSources={config.gitSources}
      gitSyncIntervalMs={config.gitSyncIntervalMs}
      gitSourceStatuses={gitSourceStatuses}
      basicAuthEnabled={config.basicAuth.enabled}
    />
  </section>

  <ServiceCatalogGrid client:load services={catalog.services} />
</BaseLayout>
```

- [ ] **Step 2: Update src/pages/services/[id].astro**

```astro
---
import { ServiceDependenciesCard } from '@/components/catalog/ServiceDependenciesCard';
import { ServiceDocumentationCard } from '@/components/catalog/ServiceDocumentationCard';
import { ServiceHeader } from '@/components/catalog/ServiceHeader';
import { ServiceMetadataCard } from '@/components/catalog/ServiceMetadataCard';
import { ServiceValidationCard } from '@/components/catalog/ServiceValidationCard';
import BaseLayout from '@/layouts/BaseLayout.astro';
import { listConfiguredServicePaths, loadConfiguredServicePage } from '@/lib/catalog';
import { toAppPath } from '@/lib/paths';
import { createNotFoundRedirectResponse } from '@/lib/page';

export async function getStaticPaths() {
  return listConfiguredServicePaths();
}

const id = Astro.params.id;
const servicePage = await loadConfiguredServicePage(id);

if (!servicePage) {
  return createNotFoundRedirectResponse();
}

const { service, dependencies } = servicePage;
---

<BaseLayout title={`${service.data.name} — servdir`}>
  <p class="mb-4"><a href={toAppPath('/')}>← Back to catalog</a></p>

  <ServiceHeader service={service} />

  <section class="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
    <ServiceDocumentationCard client:load html={service.html} />

    <aside class="grid gap-[18px]">
      <ServiceMetadataCard service={service} />
      <ServiceDependenciesCard dependencies={dependencies} />
      <ServiceValidationCard service={service} />
    </aside>
  </section>
</BaseLayout>
```

- [ ] **Step 3: Update src/pages/tags/index.astro**

```astro
---
import { CatalogHero } from '@/components/catalog/CatalogHero';
import { TagCloud } from '@/components/catalog/TagCloud';
import BaseLayout from '@/layouts/BaseLayout.astro';
import { loadConfiguredTagsIndex } from '@/lib/catalog';
import { toAppPath } from '@/lib/paths';

const { tags } = await loadConfiguredTagsIndex();
---

<BaseLayout title="Tags — servdir">
  <p class="mb-4"><a href={toAppPath('/')}>← Back to catalog</a></p>
  <section class="mb-7">
    <CatalogHero title="Browse by tag" subtitle="Explore services by technology, domain, or concern." eyebrow="Servdir - Tags" />
  </section>
  <TagCloud tags={tags} />
</BaseLayout>
```

- [ ] **Step 4: Update src/pages/tags/[tag].astro**

```astro
---
import { CatalogHero } from '@/components/catalog/CatalogHero';
import { ServiceCatalogGrid } from '@/components/catalog/ServiceCatalogGrid';
import BaseLayout from '@/layouts/BaseLayout.astro';
import { listConfiguredTagPaths, loadConfiguredTagPage } from '@/lib/catalog';
import { toAppPath } from '@/lib/paths';
import { createNotFoundRedirectResponse } from '@/lib/page';

export async function getStaticPaths() {
  return listConfiguredTagPaths();
}

const tagSlug = Astro.params.tag;
const tagPage = await loadConfiguredTagPage(tagSlug);

if (!tagPage) {
  return createNotFoundRedirectResponse();
}

const { tag, services } = tagPage;
---

<BaseLayout title={`#${tag.label} — servdir`}>
  <p class="mb-4 flex flex-wrap gap-4">
    <a href={toAppPath('/')}>← Back to catalog</a>
    <a href={toAppPath('/tags')}>All tags</a>
  </p>
  <section class="mb-7">
    <CatalogHero title={`#${tag.label}`} subtitle={`${tag.serviceCount} service${tag.serviceCount === 1 ? '' : 's'} tagged with ${tag.label}.`} eyebrow="Servdir - Tag view" />
  </section>
  <ServiceCatalogGrid client:load services={services} />
</BaseLayout>
```

- [ ] **Step 5: Update src/pages/platforms/index.astro**

```astro
---
import { CatalogHero } from '@/components/catalog/CatalogHero';
import { PlatformList } from '@/components/catalog/PlatformList';
import BaseLayout from '@/layouts/BaseLayout.astro';
import { loadConfiguredPlatformsIndex } from '@/lib/catalog';
import { toAppPath } from '@/lib/paths';

const { platforms } = await loadConfiguredPlatformsIndex();
---

<BaseLayout title="Platforms — servdir">
  <p class="mb-4"><a href={toAppPath('/')}>← Back to catalog</a></p>
  <section class="mb-7">
    <CatalogHero title="Browse by platform" subtitle="Explore services by deployment platform." eyebrow="Servdir - Platforms" />
  </section>
  <PlatformList platforms={platforms} />
</BaseLayout>
```

- [ ] **Step 6: Update src/pages/platforms/[platform].astro**

```astro
---
import { CatalogHero } from '@/components/catalog/CatalogHero';
import { ServiceCatalogGrid } from '@/components/catalog/ServiceCatalogGrid';
import BaseLayout from '@/layouts/BaseLayout.astro';
import { listConfiguredPlatformPaths, loadConfiguredPlatformPage } from '@/lib/catalog';
import { toAppPath } from '@/lib/paths';
import { createNotFoundRedirectResponse } from '@/lib/page';

export async function getStaticPaths() {
  return listConfiguredPlatformPaths();
}

const platformSlug = Astro.params.platform;
const platformPage = await loadConfiguredPlatformPage(platformSlug);

if (!platformPage) {
  return createNotFoundRedirectResponse();
}

const { platform, services } = platformPage;
---

<BaseLayout title={`${platform.label} — servdir`}>
  <p class="mb-4 flex flex-wrap gap-4">
    <a href={toAppPath('/')}>← Back to catalog</a>
    <a href={toAppPath('/platforms')}>All platforms</a>
  </p>
  <section class="mb-7">
    <CatalogHero title={platform.label} subtitle={`${platform.serviceCount} service${platform.serviceCount === 1 ? '' : 's'} on this platform.`} eyebrow="Servdir - Platform view" />
  </section>
  <ServiceCatalogGrid client:load services={services} />
</BaseLayout>
```

- [ ] **Step 7: Update src/pages/404.astro**

```astro
---
import BaseLayout from '@/layouts/BaseLayout.astro';
import { toAppPath } from '@/lib/paths';
---

<BaseLayout title="Not found — servdir">
  <div class="mx-auto mt-16 max-w-[720px] rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-sm">
    <p class="text-muted-foreground mb-2.5 text-[0.82rem] uppercase tracking-[0.04em]">404</p>
    <h1 class="mb-3 text-4xl font-semibold leading-tight">Page not found</h1>
    <p class="text-muted-foreground mx-auto mb-[22px] max-w-3xl leading-7">
      The page you requested does not exist, or the referenced service could not be resolved.
    </p>
    <a class="inline-flex rounded-full border border-border bg-muted px-2.5 py-1 text-[0.8rem]" href={toAppPath('/')}>
      Back to catalog
    </a>
  </div>
</BaseLayout>
```

- [ ] **Step 8: Verify TypeScript**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 9: Run build to catch all wiring issues**

```bash
pnpm build
```

Expected: clean build with no TypeScript or import errors.

- [ ] **Step 10: Commit**

```bash
git add src/pages/
git commit -m "feat: Wire all pages to React components"
```

---

## Task 19: Delete old Astro components and cleanup

**Files:**
- Delete: all `.astro` component files listed in File Map above
- Delete: `src/styles/components.css`, `src/scripts/catalog-grid.ts`, `src/scripts/catalog-status-card.ts`, `src/scripts/mermaid-render.ts`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Delete old Astro UI components**

```bash
rm src/components/ui/Badge.astro \
   src/components/ui/Card.astro \
   src/components/ui/Icon.astro \
   src/components/ui/IssueList.astro \
   src/components/ui/KeyValueList.astro \
   src/components/ui/MetadataPill.astro \
   src/components/ui/SectionTitle.astro \
   src/components/ui/ServiceCard.astro
```

- [ ] **Step 2: Delete old Astro catalog components**

```bash
rm src/components/catalog/CatalogHero.astro \
   src/components/catalog/CatalogKindIcon.astro \
   src/components/catalog/CatalogStatusCard.astro \
   src/components/catalog/CatalogStatusDetailList.astro \
   src/components/catalog/CatalogStatusGitSourcesPopover.astro \
   src/components/catalog/CatalogStatusPanel.astro \
   src/components/catalog/CatalogStatusTabs.astro \
   src/components/catalog/PlatformList.astro \
   src/components/catalog/ServiceCardGrid.astro \
   src/components/catalog/ServiceCardLinkIcon.astro \
   src/components/catalog/ServiceCatalogGrid.astro \
   src/components/catalog/ServiceCompactList.astro \
   src/components/catalog/ServiceDependenciesCard.astro \
   src/components/catalog/ServiceDocumentationCard.astro \
   src/components/catalog/ServiceHeader.astro \
   src/components/catalog/ServiceMetadataCard.astro \
   src/components/catalog/ServiceValidationCard.astro \
   src/components/catalog/TagCloud.astro \
   src/components/catalog/TagLink.astro
```

- [ ] **Step 3: Delete replaced scripts**

```bash
rm src/scripts/catalog-grid.ts \
   src/scripts/catalog-status-card.ts \
   src/scripts/mermaid-render.ts
```

- [ ] **Step 4: Delete components.css and remove its import from global.css**

```bash
rm src/styles/components.css
```

Update `src/styles/global.css`:
```css
@import "./tokens.css";
@import "./base.css";
```

- [ ] **Step 5: Remove astro-icon from astro.config.mjs**

```js
// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

const isStaticBuild = process.env.SERVDIR_BUILD_MODE === 'static';
const staticBasePath = process.env.SERVDIR_BASE_PATH;
const staticSiteUrl = process.env.SERVDIR_SITE_URL;

export default defineConfig({
  ...(isStaticBuild ? {} : { adapter: node({ mode: 'standalone' }) }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    host: process.env.HOST ?? '0.0.0.0',
    port: Number(process.env.PORT ?? 4321),
  },
  ...(isStaticBuild && staticBasePath ? { base: staticBasePath } : {}),
  ...(isStaticBuild && staticSiteUrl ? { site: staticSiteUrl } : {}),
  output: isStaticBuild ? 'static' : 'server',
});
```

- [ ] **Step 6: Uninstall astro-icon**

```bash
pnpm remove astro-icon
```

- [ ] **Step 7: Verify build**

```bash
pnpm build
```

Expected: clean build, no references to deleted files.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: Remove old Astro components, scripts, and astro-icon"
```

---

## Task 20: Write ADR 011

**Files:**
- Create: `.adr/011-adopt-shadcn-ui-and-react-islands.md`

- [ ] **Step 1: Write ADR**

Create `.adr/011-adopt-shadcn-ui-and-react-islands.md`:

```markdown
# 11. Adopt shadcn/ui and React Islands for the UI Layer

Status: Accepted
Status Date: 2026-05-03
Driver: Alexander
Supersedes: 005-adopt-tailwind-css-v4-as-the-ui-styling-system.md

## Context

ADR 005 deferred shadcn/ui at the time, noting it would add unnecessary complexity before
the product needs justified it. The MVP has since been built and the UI component set has
grown to the point where maintaining a bespoke CSS class system has more friction than it
saves.

The project needs:
- A consistent component platform with dark/light theme switching
- Accessible interactive components (tabs, popovers) without writing vanilla JS
- A cleaner upgrade path for future UI work

## Decision

Adopt shadcn/ui (nova preset) as the component platform. All UI components become React
`.tsx` files. Astro pages keep their `.astro` shells for routing and server-side data
loading. React is added via `@astrojs/react`.

The dark/light theme is implemented via CSS custom properties (`--background`,
`--foreground`, etc. from shadcn) with a class toggle on `<html>`. A small inline
`<script is:inline>` in `BaseLayout.astro` prevents flash-of-wrong-theme on load.

The vanilla JS scripts (`catalog-grid.ts`, `catalog-status-card.ts`, `mermaid-render.ts`)
are replaced by React component state and `useEffect`.

## Options Considered

### Option 1: shadcn/ui + React islands (chosen)
- Pros: unified component system, shadcn CLI, dark mode native, accessible primitives
- Cons: React hydration overhead for display components; mitigated by Astro's SSR

### Option 2: Astro components + shadcn CSS tokens only
- Pros: no React dependency
- Cons: not really using shadcn as a platform, no component ecosystem

### Option 3: Continue with bespoke CSS
- Pros: no new dependencies
- Cons: growing maintenance burden, no dark mode, no accessible component primitives

## Consequences

- `@astrojs/react` is a production dependency
- All UI components are `.tsx`; Astro components handle only routing and data loading
- The `astro-icon` package is removed; icons are custom SVGs loaded via Vite `?raw`
- `components.css` is deleted; styles live in component files using Tailwind semantics
- Display-only components: no `client:*` (SSR only). Interactive: `client:load`
```

- [ ] **Step 2: Commit**

```bash
git add .adr/011-adopt-shadcn-ui-and-react-islands.md
git commit -m "docs: Add ADR 011 adopting shadcn/ui and React islands"
```

---

## Task 21: Final verification

- [ ] **Step 1: Run tests**

```bash
pnpm test
```

Expected: all existing lib tests pass unchanged. (Tests are in `src/lib/` and test catalog logic, not UI components.)

- [ ] **Step 2: Run server build**

```bash
pnpm build
```

Expected: clean build, `dist/` populated.

- [ ] **Step 3: Run static build**

```bash
pnpm build:static
```

Expected: clean build, both server and static modes produce valid output.

- [ ] **Step 4: Fix any TypeScript errors found**

```bash
pnpm exec tsc --noEmit
```

Fix any remaining type errors before proceeding.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: Final cleanup and verification pass"
```

- [ ] **Step 6: Open a PR from feat/shadcn-ui to main**

```bash
gh pr create \
  --title "feat: Migrate UI to shadcn/ui with dark/light theme switching" \
  --body "Supersedes ADR 005. See docs/superpowers/specs/2026-05-03-shadcn-ui-theme-design.md for design rationale."
```
