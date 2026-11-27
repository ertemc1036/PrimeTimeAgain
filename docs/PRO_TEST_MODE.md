# Pro-Testmodus

Damit kannst du alle PrimeMe+-Funktionen testen, ohne ein Abo abzuschließen. RevenueCat, Produkt-IDs, Preise und Entitlements bleiben unverändert.

## Zwei Ebenen

| Ebene | Was sie tut | Wo | Wer sie einschalten kann |
| --- | --- | --- | --- |
| **App (UI)** | Öffnet alle Pro-Bereiche (KI-Scanner, Foto-Check-in, Prime Memory …) und blendet Paywalls und Upgrade-Hinweise aus | Schalter „Pro-Testmodus“ in Profil und auf der PrimeMe+-Seite | nur in Entwicklungs- und Test-Builds |
| **Server (Berechtigung)** | Gibt echten PrimeMe+-Zugang für alle KI-Funktionen (Prime-Chat mit Plus-Limits, Essensscanner, Foto-Check-in, Memory) | Secret `PRO_TESTERS` der Supabase Edge Functions | nur wer Zugriff auf die Supabase-Secrets hat |

Der App-Schalter gibt **niemals** KI-Zugang. Jede KI-Function prüft die Berechtigung serverseitig (`supabase/functions/_shared/guard.ts`). Ein manipulierter Client bekommt deshalb nichts.

## Wann der App-Schalter existiert (`src/config/testMode.ts`)

| Build | Testmodus |
| --- | --- |
| Expo Go / Dev-Client (`npx expo start`, `__DEV__`) | verfügbar, standardmäßig **an** |
| EAS-Profile `development` und `preview` (`EXPO_PUBLIC_PRO_TEST_MODE=1` in `eas.json`) | verfügbar, standardmäßig **an** |
| EAS-Profil `production` (`EXPO_PUBLIC_APP_ENV=production`) | **nie** verfügbar, auch nicht mit gesetztem Flag |

Der Schalter wird auf dem Gerät gespeichert. Zum Testen des normalen Free/Pro-Modells schaltest du ihn aus (Profil → Pro-Testmodus). Die Karte zeigt außerdem, ob der Server dein Konto als Tester kennt.

**Achtung bei OTA-Updates:** `eas update` für den Produktionskanal muss mit der Production-Umgebung gebaut werden, damit `EXPO_PUBLIC_APP_ENV=production` im Bundle steht.

## Dein Konto für die KI-Funktionen freischalten

1. In der App anmelden und unter **Profil → Konto** die Konto-ID kopieren (eine UUID).
2. Das Secret setzen (mehrere IDs mit Komma trennen; das ersetzt den bisherigen Wert):
   ```bash
   supabase secrets set PRO_TESTERS="<deine-konto-id>" --project-ref xbnzjpaqhdnlharchlis
   ```
3. In der App unter Profil die Pro-Testmodus-Karte prüfen: „Server: Testzugang für dieses Konto aktiv“.
   - Der Server erkennt das sofort.
   - In der App erscheint es nach dem nächsten Sync oder nach einem Neustart.

Zum Beenden entfernst du die ID wieder aus dem Secret. Ab der nächsten Anfrage gilt dann wieder Free bzw. das echte Abo. In der Datenbank wird dabei nichts geschrieben.

## Getestet

- `src/config/testMode.test.ts`: Der Testmodus ist in Dev- und Test-Builds verfügbar, aber nie in Production, auch nicht mit Flag.
- Die Serverlogik (`isTester`, `currentEntitlement`) ist unverändert. Ihre bestehenden Server-Tests habe ich in diesem Durchlauf nicht erneut ausgeführt.
