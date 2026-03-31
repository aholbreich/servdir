# 2. use git-backed markdown as source of truth

Status: Accepted
Status Date: 2026-03-31 19:45
Driver: Alexander
Contributors: Codex

## Context 
The catalog should beat handwritten Confluence pages by being easier to maintain, review, and trust. The team wants a real MVP quickly, without introducing a separate database, admin UI, or migration burden.

Service metadata is naturally document-like. Engineers are comfortable editing Markdown in Git and reviewing changes through normal pull requests.

## Decision
Store catalog entries as Markdown files with YAML frontmatter in Git. Treat Git as the database and the repository contents as the single source of truth.

Use a file scanner plus parser/validator to build an in-memory catalog at runtime.

Use a conventional structure such as:

```text
catalog/
  services/
    billing-api/
      service.md
    auth-api/
      service.md
```

### Consequences
- No database setup, migrations, or persistence layer in the MVP.
- Changes flow through familiar Git review practices.
- Local development and self-hosting remain simple.
- Version history comes for free.
- Catalog freshness depends on file hygiene and validation quality.
- Large-scale querying and write-heavy workflows may require a different architecture later.

## Options considered

### Option 1: Git-backed Markdown files
Pros:
- Extremely simple
- Human-readable
- Reviewable in pull requests
- Easy to bootstrap
- Works well for content plus metadata

Cons:
- No transactional writes or rich query engine
- Need to build validation and indexing carefully
- Bulk edits may eventually need tooling support

### Option 2: Relational database with admin UI
Pros:
- Strong querying and structured constraints
- Better fit for complex write workflows

Cons:
- Much more setup and maintenance
- Slower path to MVP
- Higher chance of building infrastructure before proving usefulness

### Option 3: YAML or JSON files only
Pros:
- Slightly simpler parsing model

Cons:
- Loses the benefit of rich human-readable narrative content in Markdown
- Less friendly for service documentation pages

## Advices
* To myself: Treat the parser and validator as critical product features, not just plumbing. Trust in the catalog comes from making invalid data visible early.
