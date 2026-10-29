# Diet9 Pro — business model (Founders Edition live in code, purchases not live)

Status: the Founders Edition is implemented (migration `20261030000000_founder_seats.sql`, not yet
applied to the production project). Real purchases and friend invitations are not active.

## Plan

| Phase | What users get | How it works |
| --- | --- | --- |
| **Founders Edition** | The first 1,000 verified accounts get Diet9 Pro free, for good | Stored founder seat per account (`public.founder_seats`). Handed out by the database when an account is verified. Existing verified accounts were counted in the order they were verified. No subscription, no payment details. Shown as "Pro · Founder seat #N" |
| **Diet9 Duo** (from account 1,001) | €4.99 per month | Auto-renewable subscription `minus30_pro_monthly` through App Store / Google Play, verified by RevenueCat on the server. Purchases are not active yet |
| **Duo Guest** (planned) | A paying subscriber invites one friend, who gets Pro free while the subscription runs | Not built. Options and App Store rules below |

### Pro sources (all decided on the server)

| Source | Meaning | Where it comes from |
| --- | --- | --- |
| `store` – Paid Pro | Active store subscription | RevenueCat (webhook + REST check) |
| `test` – Test Pro | Authorised developer / App Review account | `PRO_TESTERS` secret (account ids) |
| `founder` – Founders Pro | Free founder seat | `public.founder_seats` |
| `duo_guest` – Duo Guest | Friend seat of a subscriber | Reserved name only; nothing grants it yet |

Order when several apply: Paid → Test → Founders. A founder who later subscribes would be shown as
Paid Pro; the founder seat stays stored.

### Founders Edition rules

- **Verified** = email confirmed and not an anonymous session. Turn on "Confirm email" in Supabase
  Auth; without it every sign-up counts as verified immediately.
- **Counter:** `founders` Edge Function (public, counts only) → the paywall shows
  "742 of 1,000 free Pro seats taken." straight from the database. When the server can't be
  reached, no number is shown.
- **Atomic:** one claim at a time (advisory lock), seat number = taken + 1, and unique constraints on
  seat number and account. Tested with 25 parallel sign-ups and 60 simultaneous confirmations.
- **Permanent:** a founder keeps Pro after all seats are taken. Seats are never handed out twice;
  a deleted founder account keeps its seat used (`user_id` becomes null).
- **Capacity** lives in `public.founder_settings` (1,000). Changing it is a deliberate database
  change (`update public.founder_settings set capacity = …`), never an app setting.
- From account 1,001 the paywall shows the subscription instead of the free sign-up.

## App Store rules that apply

From the App Review Guidelines (section 3.1):
- "Apps may not use their own mechanisms to unlock content or functionality, such as license keys,
  augmented reality markers, QR codes, cryptocurrencies and cryptocurrency wallets, etc." (3.1.1)
  → **No QR codes, no promo codes of our own, no unlock links.** Paid Pro only through in-app
  purchase.
- "Apps may enable gifting of items that are eligible for in-app purchase to others. Such gifts may
  only be refunded to the original purchaser and may not be exchanged." (3.1.1)
- "Subscriptions must work on all of the user's devices where the app is available." (3.1.2)
  → Pro is tied to the account, not the device (already the case).
- "Auto-renewable subscription apps may offer a free trial period … in App Store Connect." (3.1.2)

Also from 3.1.2(a): "If you are changing your existing app to a subscription-based business model,
you should not take away the primary functionality existing users have already paid for." → Founders
keep their access when the subscription starts; nothing they have is taken away.

From 3.1.2(c): "Before asking a customer to subscribe, you should clearly describe what the user will
get for the price." → The paywall lists the Pro features and the price; the Duo friend seat must not
be advertised until it actually exists.

**Assessment of the Founders Edition.** Founder seats are not something a user buys, enters or
unlocks: there is no code, link or QR code, and nothing is sold outside the store. The server simply
gives the first verified accounts Pro for free (similar to keeping early users on an older plan).
This should be compatible with 3.1.1, but it is our reading, not Apple's confirmation: describe it in
the App Review notes ("The first 1,000 verified accounts receive Pro free of charge; later accounts
can subscribe via in-app purchase. Test account: …") and ask App Review if in doubt. Developer test
access (`PRO_TESTERS`) is only for your own and App Review's test accounts.

## Friend seat — options

| Option | How | Fit | Notes |
| --- | --- | --- | --- |
| A. Apple Family Sharing | Turn on Family Sharing for the subscription in App Store Connect | Family only (up to 6 people in one Apple family), not friends. Google Play has no equivalent for subscriptions | **Can't be turned off** again for that subscription. RevenueCat supports it |
| B. Account-linked seat (recommended to check with App Review) | A subscriber invites one person by sharing a link (share sheet / universal link) or their email. The friend signs in to their own Diet9 account; the server gives them Pro while the subscriber's subscription is active | Matches "1 subscriber + 1 friend" | No QR codes and no payment outside the store. The seat ends when the subscription ends. Needs a new table (seats), server logic and UI → a production migration that needs approval. Ask App Review first whether a "subscription includes one additional account" model is acceptable |
| C. Apple offer codes | Create subscription offer codes in App Store Connect (for example one free month) and give the subscriber one to pass on | Time-limited only | Redeemed in the App Store, so compliant. Google Play has promo codes as a counterpart |

**Recommendation.** Start Diet9 Duo (€4.99) without the friend seat. Ask App Review about option B
early, using the exact wording of the offer, and build it only after a clear answer. The data model
is ready for it: a Duo Guest would be a further server-side source (`duo_guest`). Option C can
bridge the gap for promotions.

## What is ready in the code

- Founders Edition end to end: migration, trigger, counter function, `founders` Edge Function,
  entitlement source `founder`, paywall counter, "Pro · Founder seat #N" in the app.
- The paywall shows €4.99 per month as a provisional price once the founder seats are gone (until
  the store supplies the real, localized price). A yearly plan appears only if the store offers one.
- Purchases stay inactive until RevenueCat and the store products are set up
  ([RELEASE.md](RELEASE.md) blockers 4–6). Friend invitations are not built.

## Sources

- App Review Guidelines, section 3.1: https://developer.apple.com/app-store/review/guidelines/
- Family Sharing for in-app purchases and subscriptions:
  https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/turn-on-family-sharing-for-in-app-purchases
- RevenueCat and Apple Family Sharing: https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-family-sharing
