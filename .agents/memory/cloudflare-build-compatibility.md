---
name: Cloudflare build compatibility
description: Environment-specific constraints for deploying the CLUBSA frontend through Cloudflare Pages.
---

Cloudflare Pages may run Bun installation even when the repository is a pnpm monorepo. Bun-compatible package manifests must use ordinary versions and package-manager workspaces; pnpm-only `catalog:` protocols and frontend `workspace:*` dependencies are not safe deployment inputs.

**Why:** Cloudflare's default install path can fail before the build starts when it parses pnpm catalog or unresolved workspace metadata.

**How to apply:** Keep the deployable frontend dependency graph self-contained, build it to `artifacts/clubsa/dist/public`, and preserve pnpm-specific workspace tooling only for packages that are not part of the Pages build.