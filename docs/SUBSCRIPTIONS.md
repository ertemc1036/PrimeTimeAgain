# Diet9 Pro — subscription plan (draft, not live)

Status: preparation only. No real purchases are active. Prices, the launch phase and the friend
seat need the owner's decision and, where noted, confirmation from App Review before launch.

## Plan

| Phase | What users get | How it works |
| --- | --- | --- |
| Launch phase | Pro free for the first 1,000 registered accounts | Server-side option `INTRO_PRO_FIRST_USERS=1000` (optional end date `INTRO_PRO_UNTIL`). Off by default. Shown in the app as "Pro · Launch phase"; nothing is charged |
| After the launch phase | Diet9 Pro for €4.99 per month | Auto-renewable subscription `minus30_pro_monthly` through App Store / Google Play, verified by RevenueCat on the server |
| Friend seat | One paying subscriber can give one friend Pro for as long as the subscription runs | Not built yet. Options and App Store rules below |

**Open decision on the launch phase.** It can mean either of these:
1. **The first 1,000 accounts keep Pro free** (until `INTRO_PRO_UNTIL`, or for good). This is
   what the server option does now. The signup rank comes from `auth.users.created_at`.
2. **Everyone gets Pro free until there are 1,000 accounts**, then everyone needs a subscription.
   This would need a small change: compare the total number of accounts instead of the rank.

Before ending the launch phase for anyone, tell those users inside the app ahead of time.

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

The launch phase gives Pro to a group of accounts for free, chosen on the server; nothing is sold
or unlocked by the user. That should be fine, but describe it in the App Review notes and confirm
it with App Review before launch. Developer test access (`PRO_TESTERS`) works the same way and is
meant only for your own and App Review's test accounts.

## Friend seat — options

| Option | How | Fit | Notes |
| --- | --- | --- | --- |
| A. Apple Family Sharing | Turn on Family Sharing for the subscription in App Store Connect | Family only (up to 6 people in one Apple family), not friends. Google Play has no equivalent for subscriptions | **Can't be turned off** again for that subscription. RevenueCat supports it |
| B. Account-linked seat (recommended to check with App Review) | A subscriber invites one person by sharing a link (share sheet / universal link) or their email. The friend signs in to their own Diet9 account; the server gives them Pro while the subscriber's subscription is active | Matches "1 subscriber + 1 friend" | No QR codes and no payment outside the store. The seat ends when the subscription ends. Needs a new table (seats), server logic and UI → a production migration that needs approval. Ask App Review first whether a "subscription includes one additional account" model is acceptable |
| C. Apple offer codes | Create subscription offer codes in App Store Connect (for example one free month) and give the subscriber one to pass on | Time-limited only | Redeemed in the App Store, so compliant. Google Play has promo codes as a counterpart |

**Recommendation.** Launch with Pro (€4.99) and no friend seat. Ask App Review about option B
early, using the exact wording of the offer. Build it only after a clear answer. Option C can bridge
the gap for promotions.

## What is ready in the code

- The paywall shows €4.99 per month as a provisional price until the store supplies the real,
  localized price. A yearly plan appears only if the store offers one.
- Server-side Pro sources, in order: paid subscription (RevenueCat) → developer test access
  (`PRO_TESTERS`) → launch phase (`INTRO_PRO_*`). The app shows which one applies and never
  decides Pro on its own.
- Purchases stay inactive until RevenueCat and the store products are set up
  ([RELEASE.md](RELEASE.md) blockers 4–6).

## Sources

- App Review Guidelines, section 3.1: https://developer.apple.com/app-store/review/guidelines/
- Family Sharing for in-app purchases and subscriptions:
  https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/turn-on-family-sharing-for-in-app-purchases
- RevenueCat and Apple Family Sharing: https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-family-sharing
