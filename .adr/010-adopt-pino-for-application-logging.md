# 10. adopt pino for application logging

Status: Accepted
Status Date: 2026-04-16
Driver: Alexander
Contributors: AI

## Context
Servdir now runs both locally and in Kubernetes-style environments.

The earlier logging approach relied on scattered `console.*` calls and a
small custom formatter. That was enough for early development, but it
left too much room for inconsistent fields, formatting drift, and
environment-specific behavior.

We want:
- readable text logs by default for local development
- structured JSON logs for Kubernetes and log aggregation
- stable log levels and fields across runtime modules
- a standard logging library instead of growing custom logging code

## Decision
Adopt Pino as the application logging backend.

For the first version:
- keep `text` as the default log format
- support `json` through `LOG_FORMAT=json`
- support runtime verbosity through `LOG_LEVEL`
- keep logs on stdout/stderr and let the environment handle collection
- use a small local wrapper so app code logs with consistent component
  names and field conventions

## Consequences
- local development keeps human-readable logs by default
- Kubernetes deployments can emit structured one-line JSON logs without
  code changes
- logging behavior becomes more predictable and less dependent on
  hand-rolled formatting
- servdir stays with plain application logs and does not take on full
  tracing or metrics infrastructure yet

## Options considered

### Option 1: adopt Pino with a thin local wrapper
Pros:
- standard Node logging library
- good JSON logging support
- fits Kubernetes stdout logging well
- keeps application call sites simple

Cons:
- adds a runtime dependency
- still requires small local conventions for fields and components

### Option 2: continue with a custom logger
Pros:
- no external dependency
- full control over formatting

Cons:
- easier to introduce formatting bugs
- more maintenance for a solved problem
- harder to align with common Node logging practices

### Option 3: adopt OpenTelemetry logging now
Pros:
- aligns with a broader observability ecosystem
- could support future cross-signal correlation

Cons:
- too large in scope for the current need
- would introduce observability complexity before traces and metrics are
  actually required

## Advices
* To myself: Keep the default local experience readable.
* To myself: Prefer stable structured fields over clever message text.
