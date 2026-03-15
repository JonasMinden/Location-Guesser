# Location Guesser

Location Guesser ist eine GeoGuessr-inspirierte Web-App mit zwei Modi:

- `open`: OpenStreetMap fuer die Guess-Karte und Mapillary-Embeds fuer die Spielansicht
- `google`: Google Maps + Street View als optionaler Fallback

## Was bereits umgesetzt ist

- Zufallsrunde im Open-Modus aus einer kuratierten offenen Bildbasis
- Google-Modus mit Street View als optionaler Zweitpfad
- Interaktive 2D-Karte fuer den Guess
- Distanzberechnung und Score pro Runde
- Statische Projektstruktur, geeignet fuer GitHub und Cloudflare Pages

## Empfohlener Standard: Open-Modus

Wenn du moeglichst offen und ohne Google aufsetzen willst, nutze den Open-Modus. Er verwendet:

- OpenStreetMap-Kacheln fuer die Guess-Karte
- eingebettete Mapillary-Captures fuer die Ortsansicht
- eine serverseitige Zufallsauswahl aus weltweit verteilten Regionen
- interaktiven Open-Viewer mit Zoom im Bild, wenn `MAPILLARY_ACCESS_TOKEN` gesetzt ist

Wichtige Einschraenkung: Es gibt aktuell keine vollwertige, globale, offene Street-View-Alternative mit derselben Abdeckung und Konsistenz wie Google Street View. Deshalb basiert der Open-Modus hier auf einer kuratierten Liste oeffentlich einbettbarer Mapillary-Captures statt auf einer komplett zufaelligen Weltabfrage.

## Setup

### Open-Modus ohne Google

1. Lasse in `config.js` den Wert `provider: "open"` gesetzt.
2. Starte einen lokalen Webserver.
3. Fuer wirklich globale Zufallsrunden setze in Cloudflare oder lokal mit Wrangler den Secret `MAPILLARY_ACCESS_TOKEN`.
4. Ohne Token faellt die App auf die lokale Fallback-Liste in `open-rounds.js` zurueck.

### Optionaler Google-Modus

1. Setze in `config.js` den Wert `provider: "google"`.
2. Erstelle in der Google Cloud ein Projekt.
3. Aktiviere die `Maps JavaScript API`.
4. Lege einen API-Key an.
5. Beschraenke den Key per HTTP-Referrer auf deine Domains.
6. Trage den API-Key lokal in `config.js` ein oder setze spaeter in Cloudflare `GOOGLE_MAPS_API_KEY`.

Lokales Beispiel:

```js
window.LOCATION_GUESSER_CONFIG = {
  provider: "open",
  googleMapsApiKey: "DEIN_KEY",
  mapId: "",
};
```

## Lokal starten

Empfohlener lokaler Port in diesem Projekt ist `4173`.

Mit einfachem Static Server:

```powershell
py -m http.server 4173
```

Mit Cloudflare Pages Functions lokal:

```powershell
npx wrangler pages dev .
```

Danach im Browser `http://localhost:4173` aufrufen.

Wenn `wrangler` meldet, dass das `compatibility_date` in der Zukunft liegt, ist deine lokale CLI aelter als das eingetragene Datum. In diesem Repo ist deshalb ein konservatives Datum in `wrangler.jsonc` gesetzt.

## Offene Datenquellen und Grenzen

- OpenStreetMap-Daten sind offen nutzbar, aber die Standard-Tileserver sind kein unbegrenztes Gratis-CDN fuer groessere Produktionen.
- Fuer kleine Tests funktioniert `tile.openstreetmap.org`, fuer groesseres oder kommerzielles Hosting solltest du einen geeigneten Tile-Provider oder eigene Tiles nutzen.
- Mapillary erlaubt das serverseitige Suchen nach Bildern ueber die Graph API. Die weltweite Zufallsauswahl in diesem Projekt nutzt dafuer eine Cloudflare Function und einen `MAPILLARY_ACCESS_TOKEN`.
- Weil die Abdeckung ungleichmaessig ist, wird nicht ueber den gesamten Ozean randomisiert, sondern ueber weltweit verteilte Land-Regionen. Das ist absichtlich so, damit du tatsaechlich spielbare Runden bekommst.
- Wenn die API nichts findet oder kein Token gesetzt ist, faellt die App auf `open-rounds.js` zurueck.

## Deployment mit GitHub und Cloudflare Pages

1. Erstelle ein GitHub-Repository und pushe dieses Projekt.
2. Gehe in Cloudflare zu `Workers & Pages` > `Create application` > `Pages`.
3. Verbinde dein GitHub-Repository.
4. Waehl diese Einstellungen:
   - Framework preset: `None`
   - Build command: leer lassen
   - Build output directory: `.`
5. Lege in Cloudflare unter `Settings > Variables and Secrets` diese Werte an:
    - `GOOGLE_MAPS_API_KEY`
    - optional `GOOGLE_MAPS_MAP_ID`
    - optional `LOCATION_GUESSER_PROVIDER` mit `google` oder `open`
    - fuer weltweite Open-Runden: `MAPILLARY_ACCESS_TOKEN`
6. Trigger danach ein Redeploy.
7. Wenn du nur den einfachen Open-Fallback nutzen willst, brauchst du kein Secret. Fuer echte weltweite Zufallsrunden im Open-Modus brauchst du `MAPILLARY_ACCESS_TOKEN`.

## Cloudflare-Projektdateien

- `wrangler.jsonc` - source of truth fuer lokale Entwicklung und Pages-Konfiguration
- `_headers` - setzt Sicherheits-Header fuer statische Assets
- `functions/api/runtime-config.js` - liefert Runtime-Konfiguration fuer Frontend und Viewer

## Empfohlene naechste Schritte

- echte Match-Historie und Highscores
- Timer und mehrere Spielmodi
- serverseitige Round-Generierung
- Login, Leaderboard und Multiplayer
- taegliche Challenge

## Projektstruktur

- `index.html` - UI-Struktur
- `styles.css` - Layout und Design
- `app.js` - Spielmechanik fuer Open- und Google-Modus
- `locations.js` - Start-Ortspool
- `open-rounds.js` - kuratierte offene Runden
- `config.template.js` - API-Key-Vorlage
