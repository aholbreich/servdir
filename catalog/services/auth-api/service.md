---
id: auth-api
name: Auth API
kind: service
owner: team-platform
lifecycle: experimental
repo: https://github.com/acme/auth-api
description: Zentrale Authentifizierungs- und Autorisierungsschnittstelle für interne Plattformdienste
tier: 1
tags:
  - identity
  - backend
  - api
  - test
  - example
runbook: https://example.com/runbooks/auth-api
links:
  - label: Dashboard
    url: https://grafana.example.com/d/auth-api
  - label: Alerts
    url: https://alerts.example.com/auth-api
openapi:
  - label: Public API
    url: https://example.com/openapi/auth-api.yaml
delivery:
  - label: GitHub Actions
    url: https://github.com/acme/auth-api/actions
  - label: Deployment pipeline
    text: Managed in platform-infra repository
system: platform
domain: identity
---

# Auth API

Stellt Authentifizierung und Autorisierung für interne Plattformdienste bereit.

## Verantwortlichkeit
- Zuständig für Token-Ausgabe, Session-Prüfung und grundlegende Berechtigungsentscheidungen
- Kernabhängigkeit für interne APIs und nachgelagerte Plattformdienste

## Betriebshinweise
- Änderungen an Token-Claims müssen mit Konsumenten abgestimmt werden
- Ausfälle wirken sich direkt auf Login und Service-zu-Service-Authentifizierung aus
