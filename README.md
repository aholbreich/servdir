# servdir

Simple service catalog for engineers.

Git is the database. Markdown files are the source of truth.

## Initial docs
- `docs/prd.md` — short MVP product doc
- `.adr/` — architecture decision records

## MVP idea
- scan `catalog/services/**/service.md`
- parse YAML frontmatter + Markdown body
- validate required fields
- build in-memory catalog
- serve list/detail/search UI over HTTP
