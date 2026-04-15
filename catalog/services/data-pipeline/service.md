---
id: data-pipeline
name: Data Pipeline
kind: service
owner: team-data
lifecycle: experimental
repo: https://github.com/acme/data-pipeline
description: Ingests and transforms event streams from internal services into the analytics warehouse
tier: 3
tags:
  - data
  - backend
  - aws
  - example
depends_on:
  - billing-api
  - notification-service
system: analytics
domain: data
platform: aws-prod
---

# Data Pipeline

Ingests event streams from internal services and loads them into the analytics warehouse.

## Responsibilities

- Consumes Kafka topics from internal services
- Transforms and normalises event schemas
- Loads data into the analytics warehouse

## Notes

- Deployed on AWS as a managed Glue job with Step Functions orchestration
- Early-stage service — schema contracts are not yet stable
