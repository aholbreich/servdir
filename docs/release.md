# Release and Image Publishing Strategy

## Registry
Publish public container images to GitHub Container Registry:
- `ghcr.io/<owner>/servdir`

## CI behavior
### Pull requests
On pull requests:
- install dependencies with pnpm
- run tests
- build the application
- do not publish images

### Push to `main`
On push to `main`:
- run tests
- build the application
- build and publish Docker image tags:
  - `main`
  - `edge`
  - `sha-<commit>` or equivalent sha tag from metadata action

### Version tags
On tags matching `v*` such as `v0.1.0`:
- run tests
- build the application
- build and publish Docker image tags:
  - `v0.1.0`
  - sha tag
  - `latest`

## Why this strategy
- Pull requests stay safe and cheap
- `main` produces a continuously deployable image
- version tags represent intentional releases
- `latest` only moves on version tags, not every main push

## Suggested first release flow
1. merge stable code to `main`
2. create a version tag such as `v0.1.0`
3. push the tag
4. let GitHub Actions publish the versioned image and `latest`

## Notes
- The workflow uses the repository `GITHUB_TOKEN` to push to GHCR.
- Repository/package visibility should allow public pulls if the project is open source.
- If the image name ever changes, update `.github/workflows/ci.yml`.
