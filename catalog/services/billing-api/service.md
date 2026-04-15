---
id: billing-api
name: Billing API
kind: service
owner: team-payments
lifecycle: experimental
repo: https://github.com/acme/billing-api
description: Kernservice für Rechnungsstellung und Billing-Funktionen in internen Systemen
tier: 2
runbook: https://example.com/runbooks/billing-api
tags:
  - backend
  - test
  - example
depends_on:
  - auth-api
links:
  - label: Dashboard
    url: https://grafana.example.com/d/billing-api
  - label: Alerts
    url: https://alerts.example.com/billing-api
openapi:
  - label: Public API
    url: https://example.com/openapi/billing-api.yaml
delivery:
  - label: GitHub Actions
    url: https://github.com/acme/billing-api/actions
  - label: Deployment pipeline
    text: Managed in platform-infra repository
system: payments
domain: finance
platform: legacy-k8s
---

# Billing API

Erzeugt Rechnungen und stellt Billing-Funktionen für interne Systeme bereit.

## Hinweise

- Kritischer Pfad für Invoice Creation
- PagerDuty Rotation bei Team Payments

## Betriebswissen

- Schreibt Rechnungs- und Zahlungsstatus in nachgelagerte Systeme fort
- Nutzt `auth-api` für interne Service-Authentifizierung
- Änderungen an Preislogik und Rechnungsformaten benötigen erhöhte Aufmerksamkeit
