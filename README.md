# StoreiOS

Web frontend for [storeios.net](https://storeios.net), a Vietnamese iOS
community platform that helps users discover and install legitimate iOS apps.

## What it does

- App listings by category: TestFlight apps, signed apps, and jailbreak
  utilities, with search, app detail pages, and install via `itms-services`.
- TestFlight slot tracking and certificate status tracking (signed / revoked).
- IPA signing request flow, including certificate management for admins.
- Blog, user accounts and profiles, comments, and notifications.
- Admin panel for managing apps, certificates, and signing requests.

StoreiOS only supports installing legitimate apps. It does not distribute
cracks, mods, cheats, or pirated paid apps, and it is not affiliated with
Apple.

## Tech stack

- Next.js 13, React 18, Tailwind CSS
- Supabase (data, auth, storage)
- Firebase (auth, Firestore, admin SDK)

## Run locally

```bash
npm install
npm run dev
```

The app needs a `.env.local` with your own Supabase and Firebase projects:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_FB_API_KEY=
NEXT_PUBLIC_FB_AUTH_DOMAIN=
NEXT_PUBLIC_FB_PROJECT_ID=
NEXT_PUBLIC_FB_STORAGE_BUCKET=
NEXT_PUBLIC_FB_MSG_SENDER_ID=
NEXT_PUBLIC_FB_APP_ID=
NEXT_PUBLIC_FB_MEASUREMENT_ID=
```

Server-side and admin features additionally need `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `JWT_SECRET`, and a
Firebase service account. A production database is required for listings and
signing flows to work end to end.

## Status

Solo-maintained since 2022. The code in this repository powers the production
site at [storeios.net](https://storeios.net).

## License

MIT — see [LICENSE](LICENSE).
