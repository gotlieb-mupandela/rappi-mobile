# Rappi Sport — Expo app brief

Build a brand-new React Native app with Expo. Do not copy, import, or share source files from the website repo (rappi-webapp). Recreate types and UI from this document. The app only talks to the live website API and the existing Supabase project.

Store: Rappi Sport, Windhoek, Namibia. Language: English. Currency: Namibian dollars, shown as N$304 (no space, no decimals when the amount is whole, two decimals otherwise). Market is Namibia only. Do not add euro, language switching, or admin screens.

## How to use this file

Create an empty Expo app (TypeScript, Expo Router) in its own git repo.

Put this file in the repo root.

Tell Cursor: “Build the app described in mobile-app.md. Follow it exactly. Do not invent a second backend.”

## How it works

The app is a new client. It does not host products, stock, prices, or payments.

- Phone → HTTPS `EXPO_PUBLIC_API_URL` (`https://www.rappisportshub.com`) for browse, search, product, live stock, start payment, register push, teams quote
- Phone → HTTPS `EXPO_PUBLIC_SUPABASE_URL` for sign in, session, and reading my orders

There is no separate app API and no Supabase Edge Function in v1.

Bag and wishlist live on the phone only (AsyncStorage). Checkout is `POST /api/payments/dpo/create` with a Bearer token, then open the returned `paymentUrl`. The app never calls DPO or Resend. The website emails the invoice.

## Environment

Copy this block into `.env`. These three values are public. Do not add any other key.

```
EXPO_PUBLIC_API_URL=https://www.rappisportshub.com
EXPO_PUBLIC_SUPABASE_URL=https://wzmzwerzbyudcvoiiege.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Never put the service-role key, `DPO_COMPANY_TOKEN`, or `RESEND_API_KEY` in the app.

## Screens

Home photo tiles (`GET /api/catalog?cat=&pageSize=1`), Shop from `/api/catalog/nav`, folders from `/api/catalog/folders`, leaf products from `/api/catalog?cat=&group=&pageSize=24`, search, product + stock, bag, checkout + DPO browser + result, auth, account, orders, wishlist, teams quote, and push after the first paid order.

Package id: `com.rappisportshub.app`. URL scheme: `rappisport`.
