---
id: billing-api
name: Billing API
owner: team-payments
lifecycle: production
repo: https://github.com/acme/billing-api
tier: 2
runbook: https://example.com/runbooks/billing-api
tags:
  - payments
  - backend
depends_on:
  - auth-api
---

# Billing API

Erzeugt Rechnungen und stellt Billing-Funktionen für interne Systeme bereit.

## Hinweise
- Kritischer Pfad für Invoice Creation
- PagerDuty Rotation bei Team Payments
