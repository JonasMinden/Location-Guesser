import json
import random
import time
import urllib.request
from pathlib import Path

import mercantile
from vt2geojson.tools import vt_bytes_to_geojson


TILE_ACCESS_TOKEN = "MLY|4223665974375089|d62822dd792b6a823d0794ef26450398"
TILE_URL_TEMPLATE = "https://tiles.mapillary.com/maps/vtp/mly1/2/{z}/{x}/{y}?access_token={token}"
LIMIT = 12000
SAMPLES_PER_REGION = 8
ZOOM_LEVELS = [14, 13]

WORLD_REGIONS = [
    {"name": "Alaska", "bbox": [-170.0, 51.0, -129.5, 71.0]},
    {"name": "Canada West", "bbox": [-139.0, 48.0, -113.0, 61.5]},
    {"name": "Canada East", "bbox": [-79.5, 43.0, -57.0, 55.5]},
    {"name": "US Pacific", "bbox": [-124.8, 32.0, -117.0, 49.0]},
    {"name": "US Mountain", "bbox": [-117.5, 32.0, -103.0, 49.0]},
    {"name": "US Central", "bbox": [-104.0, 29.0, -89.0, 49.0]},
    {"name": "US Atlantic", "bbox": [-83.5, 25.0, -66.9, 46.0]},
    {"name": "Mexico", "bbox": [-117.5, 15.5, -86.5, 32.5]},
    {"name": "South America North", "bbox": [-79.5, -5.0, -48.0, 12.5]},
    {"name": "South America South", "bbox": [-74.5, -41.5, -53.0, -12.0]},
    {"name": "Brazil", "bbox": [-60.5, -30.5, -34.5, 5.5]},
    {"name": "UK and Ireland", "bbox": [-10.8, 49.5, 1.8, 58.9]},
    {"name": "Iberia", "bbox": [-9.8, 36.0, 3.5, 43.9]},
    {"name": "France and Benelux", "bbox": [-5.5, 42.0, 8.5, 51.7]},
    {"name": "Germany and Poland", "bbox": [5.0, 47.0, 20.5, 55.2]},
    {"name": "Alps", "bbox": [5.5, 44.0, 16.5, 48.5]},
    {"name": "Italy", "bbox": [7.0, 37.0, 18.8, 47.2]},
    {"name": "Scandinavia", "bbox": [5.0, 55.0, 31.5, 71.0]},
    {"name": "Southern Europe", "bbox": [8.0, 36.0, 24.8, 45.5]},
    {"name": "Eastern Europe", "bbox": [18.0, 45.0, 41.5, 59.5]},
    {"name": "Turkey", "bbox": [25.5, 35.5, 45.5, 42.5]},
    {"name": "North Africa", "bbox": [-10.5, 20.0, 35.0, 37.0]},
    {"name": "East Africa", "bbox": [28.0, -12.0, 44.5, 15.5]},
    {"name": "Southern Africa", "bbox": [16.0, -35.5, 39.5, -17.0]},
    {"name": "Middle East", "bbox": [34.0, 12.0, 60.5, 38.0]},
    {"name": "India", "bbox": [68.0, 8.0, 89.5, 31.5]},
    {"name": "Southeast Asia", "bbox": [95.0, -10.5, 125.0, 20.5]},
    {"name": "Indonesia", "bbox": [95.0, -10.8, 141.5, 5.8]},
    {"name": "Philippines", "bbox": [116.5, 4.0, 127.5, 19.5]},
    {"name": "Taiwan", "bbox": [119.5, 21.5, 122.5, 25.5]},
    {"name": "South Korea", "bbox": [125.0, 33.0, 130.0, 39.0]},
    {"name": "Japan", "bbox": [129.0, 31.0, 146.5, 45.8]},
    {"name": "Australia East", "bbox": [145.0, -39.5, 154.0, -16.0]},
    {"name": "Australia South", "bbox": [132.0, -39.5, 145.5, -28.0]},
    {"name": "Australia West", "bbox": [113.0, -35.5, 129.5, -14.0]},
    {"name": "New Zealand", "bbox": [166.0, -47.5, 179.5, -34.0]},
]

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "mapillary_image_pool.json"
TXT_PATH = ROOT / "mapillary_image_urls.txt"
CSV_PATH = ROOT / "mapillary_image_urls.csv"


def main() -> None:
    random.seed()
    rows = []
    seen_ids = set()
    planned_tiles = build_tile_plan()

    for region_name, z, x, y in planned_tiles:
        if len(rows) >= LIMIT:
            break

        try:
            features = fetch_tile_features(z, x, y)
        except Exception:
            continue

        random.shuffle(features)
        for feature in features:
            props = feature.get("properties") or {}
            image_id = str(props.get("id") or "").strip()
            if not image_id or image_id in seen_ids:
                continue

            geometry = feature.get("geometry") or {}
            coordinates = geometry.get("coordinates") or []
            if len(coordinates) < 2:
                continue

            lng, lat = coordinates[0], coordinates[1]
            rows.append(
                {
                    "name": region_name,
                    "lat": lat,
                    "lng": lng,
                    "imageKey": image_id,
                    "imageUrl": f"https://www.mapillary.com/embed?image_key={image_id}",
                    "sourceUrl": f"https://www.mapillary.com/app/?pKey={image_id}&focus=photo",
                    "attribution": "Mapillary imagery",
                    "license": "CC BY-SA",
                    "region": region_name,
                }
            )
            seen_ids.add(image_id)

            if len(rows) >= LIMIT:
                break

        time.sleep(0.08)

    write_outputs(rows)
    print(f"Fertig: {len(rows)} URLs gespeichert.")
    print("Dateien: mapillary_image_pool.json, mapillary_image_urls.csv, mapillary_image_urls.txt")


def build_tile_plan():
    plan = []
    for zoom in ZOOM_LEVELS:
        for region in WORLD_REGIONS:
            tiles = list(mercantile.tiles(*region["bbox"], zoom))
            if not tiles:
                continue
            random.shuffle(tiles)
            for tile in tiles[:SAMPLES_PER_REGION]:
                plan.append((region["name"], tile.z, tile.x, tile.y))

    random.shuffle(plan)
    return plan


def fetch_tile_features(z, x, y):
    url = TILE_URL_TEMPLATE.format(z=z, x=x, y=y, token=TILE_ACCESS_TOKEN)
    request = urllib.request.Request(url, headers={"User-Agent": "LocationGuesserImporter/1.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        content = response.read()
    geojson = vt_bytes_to_geojson(content, x, y, z, layer="image")
    return geojson.get("features", [])


def write_outputs(rows):
    JSON_PATH.write_text(json.dumps(rows, ensure_ascii=True), encoding="utf-8")

    with CSV_PATH.open("w", newline="", encoding="utf-8") as csv_file:
        csv_file.write("image_id,image_url,lat,lng,source_url,region\n")
        for row in rows:
            csv_file.write(
                f'{row["imageKey"]},{row["imageUrl"]},{row["lat"]},{row["lng"]},{row["sourceUrl"]},{row["region"]}\n'
            )

    with TXT_PATH.open("w", encoding="utf-8") as txt_file:
        for row in rows:
            txt_file.write(row["sourceUrl"] + "\n")


if __name__ == "__main__":
    main()
