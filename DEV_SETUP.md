# Development setup

Verified on Node.js 22.23.4 and npm 10.9.9. GitHub Actions uses Node 22 (`.github/workflows/android-build.yml`). `package.json` does not pin `engines`. Use npm. The lockfile is `package-lock.json`, and `.npmrc` sets `legacy-peer-deps=true`.

## Commands

```bash
npm ci
cp .env.example .env
npm run typecheck
npm test
npm run check
npx expo start --localhost --port 8081
npx expo export --platform web
```

`npm ci` is idempotent. There is no lint script and no ESLint config.

Expo will not bundle until `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set. `src/lib/supabase.ts` throws at import time when either is missing. Copy the public API and Supabase URL from `mobile-app.md`. The anon key is already committed in `eas.json` (see problems below). Leave `EXPO_PUBLIC_EUR_PER_NAD` empty to use the in-code fallback of `0.05`.

## Environment variable names

Required for local Metro, typecheck-time imports of the Supabase client, and the web export:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Optional:

- `EXPO_PUBLIC_EUR_PER_NAD` — display-only NAD to EUR rate. Empty uses `0.05` in `src/lib/money.ts`.
- `GOOGLE_SERVICES_JSON` — Android push config path. `app.config.ts` also accepts `./google-services.json`. Not needed for web or unit tests.

CI only, not a local runtime variable:

- `EXPO_TOKEN` — GitHub Actions secret used by `eas build`.

Do not add `DPO_COMPANY_TOKEN`, `RESEND_API_KEY`, or a Supabase service-role key. The app talks to the website API and the Supabase anon client only.

## Problems found

- No README and no lint command.
- Startup fails closed when the two Supabase public variables are unset.
- `eas.json` commits `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the development, preview, and production profiles. It is a public anon JWT, but it should live in EAS env / local `.env`, not in git.
- `npm audit` reports 12 issues (5 high, 7 moderate), all transitive through Expo (`node-forge`, `zod`, `decode-uri-component`, `uuid`, `xcode`). Do not run `npm audit fix --force`; the suggested Expo target is a downgrade to 44.x.
- Android package `com.rappisporthub.app` and iOS bundle id `com.rappisportshub.app` are spelled differently (`app.config.ts`).
- `mobile-app.md` describes a teams-quote screen. No route or API call for it exists.
- `npx expo start` reaches `http://localhost:8081` and the web export completes. Non-fatal warnings: push listeners are unsupported on web, and `shadow*` / `textShadow*` styles are deprecated.
