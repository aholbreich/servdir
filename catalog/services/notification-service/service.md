---
id: notification-service
name: Notification Service
kind: service
owner: team-platform
lifecycle: production
repo: https://github.com/acme/notification-service
description: Sends transactional emails and push notifications to end users
tier: 2
tags:
  - notifications
  - backend
  - aws
depends_on:
  - auth-api
system: platform
domain: communications
platform: aws-prod
---

# Notification Service

Handles transactional email and push notification delivery for internal services.

## Responsibilities
- Routes notification events to the correct channel (email, push, SMS)
- Manages delivery retries and dead-letter queues
- Tracks delivery status

## Notes
- Deployed on AWS ECS Fargate
- Uses SES for email and SNS for push delivery
