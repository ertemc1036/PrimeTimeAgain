# PrimeMe AI – Release-Übersicht

Nichts in diesem Repository veröffentlicht, berechnet oder reicht etwas von selbst ein.

| Thema | Dokument |
| --- | --- |
| Aktueller Stand, Blocker, nächste Schritte | [RELEASE_STATUS.md](RELEASE_STATUS.md) |
| TestFlight Schritt für Schritt, SMTP/Resend | [BETA_TESTFLIGHT.md](BETA_TESTFLIGHT.md) |
| Abos, RevenueCat, Modi A/B/C, Lebenszyklus | [SUBSCRIPTIONS.md](SUBSCRIPTIONS.md) |
| App-Store- und TestFlight-Texte | [APP_STORE_METADATA.md](APP_STORE_METADATA.md) |
| Checkliste für das echte iPhone | [IPHONE_TESTING.md](IPHONE_TESTING.md) |
| Website und Rechtstexte (Entwürfe) | [../website/README.md](../website/README.md) |

Prüfungen im Repository: `npm run release-check -- --profile beta|subscription-test|production`, Auth-Einstellungen: `node scripts/supabase-auth-config.mjs`.
