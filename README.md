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

Wichtige Einschraenkung: Es gibt aktuell keine vollwertige, globale, offene Street-View-Alternative mit derselben Abdeckung und Konsistenz wie Google Street View. Deshalb basiert der Open-Modus hier auf einer kuratierten Liste oeffentlich einbettbarer Mapillary-Captures statt auf einer komplett zufaelligen Weltabfrage.

## Setup

### Open-Modus ohne Google

1. Lasse in `config.js` den Wert `provider: "open"` gesetzt.
2. Starte einen lokalen Webserver.
3. Fertig.

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

## Offene Datenquellen und Grenzen

- OpenStreetMap-Daten sind offen nutzbar, aber die Standard-Tileserver sind kein unbegrenztes Gratis-CDN fuer groessere Produktionen.
- Fuer kleine Tests funktioniert `tile.openstreetmap.org`, fuer groesseres oder kommerzielles Hosting solltest du einen geeigneten Tile-Provider oder eigene Tiles nutzen.
- Mapillary erlaubt das Einbetten einzelner Captures. Der Open-Modus hier nutzt deshalb kuratierte, einbettbare Runden.
- Wenn du spaeter mehr offene Runden willst, erweitert man `open-rounds.js` um weitere Bild-Keys und Koordinaten.

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
6. Trigger danach ein Redeploy.
7. Wenn du nur den Open-Modus nutzt, brauchst du keine Cloudflare-Secrets.

## Cloudflare-Projektdateien

- `wrangler.jsonc` - source of truth fuer lokale Entwicklung und Pages-Konfiguration
- `_routes.json` - sorgt dafuer, dass nur `/api/*` die Pages Function aufruft
- `_headers` - setzt Sicherheits-Header fuer statische Assets

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
