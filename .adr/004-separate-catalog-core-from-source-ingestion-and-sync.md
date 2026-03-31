# 4. separate catalog core from source ingestion and sync

Status: Accepted
Status Date: 2026-03-31 20:03
Driver: Alexander
Contributors: Codex

## Context 
The MVP service catalog reads service definition files from a local directory and builds an in-memory catalog. A likely next feature is periodic scanning of configured repositories for service definition files.

If repository sync concerns are mixed directly into parsing, validation, and rendering logic, the codebase will become harder to evolve. The product should preserve a simple core model even as new ingestion methods are added.

## Decision
Separate the system into:
- a catalog core
- one or more source ingestion modules
- an optional sync/scheduler subsystem

The catalog core is responsible for:
- normalized service model
- parsing and validation pipeline
- catalog assembly
- query/read access for the UI

Source ingestion modules are responsible for obtaining raw service definition files from a specific source, for example:
- local filesystem directory
- future repository cache or checkout

The sync/scheduler subsystem is responsible for future background operations such as:
- periodic repository fetch/pull
- tracking sync status
- storing minimal operational state

The catalog core must not depend directly on scheduler logic.

### Consequences
- The MVP remains simple and focused.
- Future repository scanning can be added without rewriting the core catalog model.
- The codebase gains clearer boundaries and is easier to test.
- A small amount of duplication may appear early between source adapters, but this is acceptable.
- Future local state for sync metadata can remain isolated from the main product model.

## Options considered

### Option 1: Separate core from ingestion and sync
Pros:
- Clear architecture boundaries
- Easier future evolution
- Lower coupling
- Better fit for incremental delivery

Cons:
- Requires a bit more design discipline up front
- Slightly more abstraction than a one-file prototype

### Option 2: Put scanning, parsing, validation, and sync logic together
Pros:
- Fastest path for a throwaway prototype

Cons:
- Harder to evolve once repository sync arrives
- Increases coupling between domain logic and runtime concerns
- Makes testing and deployment behavior less clear

## Advices
Keep abstractions lightweight. Do not build a plugin system or generic integration framework. A few explicit modules and interfaces are enough.
