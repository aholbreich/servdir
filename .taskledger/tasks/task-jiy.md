---
id: task-jiy
title: 'fix: add tslib to unblock pnpm build'
status: done
priority: high
type: fix
created_at: 2026-05-18T21:37:59Z
updated_at: 2026-05-18T21:38:55Z
created_by: claude
assignee: null
depends_on: []
claim:
  actor: null
  claimed_at: null
  expires_at: null
  heartbeat_at: null
tags:
  - infra
  - build
---

## Description

pnpm build fails on main today with: Rollup failed to resolve import 'tslib' from node_modules/.../react-remove-scroll/.../Combination.js. react-remove-scroll (pulled by radix-ui / shadcn dialog/etc.) declares tslib as a peer dep that pnpm doesn't hoist. Fix: pnpm add tslib (latest, lib not types). Verify pnpm build and pnpm build:static both succeed. Discovered while implementing task-3dp.

## Notes

### 2026-05-18T21:38:55Z - claude

pnpm add tslib 2.8.1. pnpm test (73/73 pass), pnpm build (server) and pnpm build:static both succeed.
