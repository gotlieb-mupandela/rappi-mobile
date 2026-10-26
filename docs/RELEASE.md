# Release

AWAITING GOTLIEB'S OK: `scripts/generate-storefront-snapshot.mjs` is not wired into any EAS or release build until he approves. The script fetches only the public `GET /api/mobile/v1/storefront` route on `www.rappisportshub.com`. It sends no keys, tokens, or cookies. The snapshot file is generated, git-ignored, and never committed.

The app was never released with the data-driven feed. A release stays gated by this file and by Gotlieb.
