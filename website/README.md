# PrimeMe AI – Website

Statische Seiten (Startseite, Datenschutz, Nutzungsbedingungen, Abonnementbedingungen, Gesundheit, Impressum, Support).

- Inhalte: `content/*.html` · Design: `style.css` (Schwarz/Weiß/Grau, Hell- und Dunkelmodus)
- Betreiberangaben: `operator.example.json` nach `operator.json` kopieren und ausfüllen (nicht eingecheckt)
- Bauen: `python3 website/build.py` → `website/public/`
- Fehlende Angaben erscheinen gelb markiert. Jede Seite hat `noindex`, bis du mit `PUBLISH=1 python3 website/build.py` baust.

**Nicht veröffentlichen, bevor die Rechtstexte geprüft und alle gelben Stellen ersetzt sind.**

Hosting (eine Möglichkeit genügt): Vercel, Netlify, Cloudflare Pages oder GitHub Pages – jeweils den Ordner `website/public` als statische Seite hochladen und die eigene Domain verbinden.

Danach in `eas.json` (Profile `beta`, `subscription-test`, `production`) eintragen:

```
EXPO_PUBLIC_PRIVACY_URL=https://<domain>/datenschutz.html
EXPO_PUBLIC_TERMS_URL=https://<domain>/nutzungsbedingungen.html
EXPO_PUBLIC_SUPPORT_EMAIL=support@<domain>
```

In App Store Connect: Datenschutz-URL = `/datenschutz.html`, Support-URL = `/support.html`, Marketing-URL = `/`.
