---
id: bike-api
name: Bike API
kind: service
owner: team-bike
lifecycle: production
repo: https://github.com/acme/care-api
description: Example service definition that demonstrates the full servdir front matter shape, including structured tech stack metadata.
tier: 2
tags:
  - api
  - backend
  - care-app
  - example
  - production
depends_on:
  - auth-api
  - billing-api
runbook: https://example.com/runbooks/care-api
links:
  - label: Dashboard
    url: https://grafana.example.com/d/care-api
  - label: Alerts
    url: https://alerts.example.com/care-api
openapi:
  - label: Public API
    url: https://example.com/openapi/care-api.yaml
delivery:
  - label: GitHub Actions
    url: https://github.com/acme/care-api/actions
  - label: Deployment pipeline
    text: Managed in platform-delivery repository
tech_stack:
  languages:
    - java
  frameworks:
    - spring-boot
  data:
    - mariadb
    - redis
  platform:
    - kubernetes
    - keycloak
  tooling:
    - maven
    - github-actions
system: swing
domain: care
platform: aws-prod
---

# Bike API

bike API is an example service entry that intentionally demonstrates all currently supported `service.md` fields in one place.

## Purpose

- expose a realistic full-definition example for catalog maintainers
- serve as a reference when authoring new entries
- keep schema evolution easy to verify with visible catalog data

## Responsibilities

- provide backend APIs for care-related workflows
- integrate with platform identity and billing capabilities
- expose machine-readable API documentation for consumers

## Operational notes

- depends on `auth-api` for service-to-service authentication
- depends on `billing-api` for billing-related integration flows
- intended as a documentation and demo example, not a real production system
