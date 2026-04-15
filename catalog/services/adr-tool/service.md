---
id: adr-tool
name: ADR Tool
kind: tool
owner: team-platform
lifecycle: production
repo: https://github.com/aholbreich/adr-tool
description: Small helper tool for creating and maintaining Architecture Decision Records in a lightweight repository workflow
tier: 3
tags:
  - architecture
  - documentation
  - cli
  - tool
runbook: https://github.com/aholbreich/adr-tool#readme
links:
  - label: GitHub repository
    url: https://github.com/aholbreich/adr-tool
  - label: ADR reference
    url: https://github.com/joelparkerhenderson/architecture-decision-record
system: platform
domain: engineering-productivity
platform: gcp
delivery:
  - label: GitHub Actions
    url: https://github.com/aholbreich/adr-tool/actions
---

# ADR Tool

ADR Tool is a small CLI-oriented helper for creating and maintaining Architecture Decision Records in a repository.

## Purpose
- make ADR authoring easier in day-to-day engineering work
- keep decision records lightweight and close to the codebase
- support teams that want a simple documented architecture workflow without heavyweight tooling

## Get started
### Check it out
- Repository: https://github.com/aholbreich/adr-tool

### Typical usage
- create a new ADR entry
- keep numbering and file structure consistent
- maintain architecture decisions in Git alongside the product they describe

## Notes
- good fit for teams that already use Markdown-first documentation
- pairs naturally with repositories like servdir that keep important product decisions in ADRs
