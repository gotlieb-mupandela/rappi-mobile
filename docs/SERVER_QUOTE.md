# Server quote checkout

`SERVER_QUOTE_CHECKOUT` is a build-time flag. It stays off unless the app is built with `SERVER_QUOTE_CHECKOUT=1` or `SERVER_QUOTE_CHECKOUT=true`. `app.config.ts` bakes that boolean into `extra.flags`, and `src/lib/flags.ts` reads it once. The app never reads this flag from the API, a link, a push notification, or anything the shopper types. A string such as `"true"` does not turn it on.

With the flag off, the bag and checkout behave as they do today. The signed-in bag still reads `products.price`, and checkout still adds shipping and VAT on the device.

## Screens that change when the flag is on

Signed-in bag (`app/(tabs)/bag.tsx`):

- Calls `POST /api/cart/prices`.
- Shows `items[].unitPrice`, `items[].lineTotal`, and `subtotal` from that response.
- Does not read `products.price` and does not multiply a unit price by quantity.

Checkout summary (`app/checkout/index.tsx`):

- Calls `POST /api/checkout/quote`.
- Shows `subtotal`, `shipping`, `vat.rate`, `vat.amount`, and `total` from that response.
- Quotes again when the bag, shipping method, or country changes, and again right before Pay can be enabled. Quantity, shipping, country, and bag-focus refreshes wait 400 ms so rapid taps send one request.
- Pay stays disabled while that quote is loading, waiting on the debounce, failed, or older than the latest bag, shipping method, or country.
- A failed quote shows a fixed plain-text message and Try again. HTTP 400 says an item changed or is out of stock and the bag needs a refresh. Server error text is not shown, and it is never rendered as HTML.

Guest bag prices are unchanged. Catalog prices on product screens are unchanged. With the flag on, payment start sends the same merged lines as the quote. Payment page host checks and the server-confirmed payment result are unchanged.

## What the app sends

Both routes receive `code`, `size`, and `qty` only. Checkout also sends `shippingMethod` (`standard`, `express`, or `pickup`) and `country`. No price, unit price, or line total is sent.

Before either call, duplicate rows with the same code and size are merged into one line. Quantities are summed. If a merged line would be over 99, the app does not send a smaller quantity: Pay stays off and a fixed message is shown. `qty` is sent only as an integer number, never as a string or a boolean. More than 50 lines is not sent. The same merged lines are sent to the quote and to payment start.

The payable amount is the quote `total` when `currency` is `NAD`. The checkout total, and the "You are charged" text on the smaller approx line, use `N$` with a thousands comma and two decimals (`N$600.00`). Subtotal, shipping, VAT, and bag prices keep the usual `N$` form (`N$600`, or `N$600.50` when there are cents). If a euro figure is shown, it is labelled `approx.` under the NAD total and is not the amount to pay. Any other currency is refused with a fixed message, and Pay stays off.

## Deploy the website first

`POST /api/cart/prices` and `POST /api/checkout/quote` come from the website change in web PR 91. They are not on production until that change is deployed. Do not ship a build with `SERVER_QUOTE_CHECKOUT` on before those routes are live. Release builds only call https on `www.rappisportshub.com` and `rappisportshub.com`.

## Rollback

Build again without `SERVER_QUOTE_CHECKOUT`, or set it to anything other than `1` or `true`. The flag defaults off. The app goes back to on-device bag prices and checkout totals. No server data migration is required.
