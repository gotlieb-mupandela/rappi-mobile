# Release

AWAITING GOTLIEB'S OK: `scripts/generate-storefront-snapshot.mjs` is not wired into any EAS or release build until he approves. The script fetches only the public `GET /api/mobile/v1/storefront` route on `www.rappisportshub.com`. It sends no keys, tokens, or cookies. The snapshot file is generated, git-ignored, and never committed.

The app was never released with the data-driven feed. A release stays gated by this file and by Gotlieb.

The feed is the only source of storefront content. The DATA_DRIVEN_STOREFRONT flag is removed. With no feed and no last good copy, Home, Shop, and the category hub show a clear can't load screen with Retry. They do not show a blank screen and they do not show a hardcoded fallback. The snapshot script still awaits Gotlieb's OK and is not part of any build.
