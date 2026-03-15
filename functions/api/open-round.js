const WORLD_REGIONS = [
  { name: "Alaska", bbox: [-170.0, 51.0, -129.5, 71.0] },
  { name: "North America West", bbox: [-124.8, 32.0, -117.0, 49.0] },
  { name: "North America Central", bbox: [-104.0, 29.0, -89.0, 49.0] },
  { name: "North America East", bbox: [-83.5, 25.0, -66.9, 46.0] },
  { name: "Canada", bbox: [-123.5, 43.0, -63.0, 57.0] },
  { name: "Quebec", bbox: [-79.5, 45.0, -57.0, 55.5] },
  { name: "Mexico", bbox: [-117.5, 15.5, -86.5, 32.5] },
  { name: "Central America", bbox: [-92.5, 7.0, -77.0, 18.5] },
  { name: "Caribbean", bbox: [-85.5, 10.0, -60.0, 24.0] },
  { name: "South America North", bbox: [-79.5, -5.0, -48.0, 12.5] },
  { name: "South America South", bbox: [-74.5, -41.5, -53.0, -12.0] },
  { name: "Brazil", bbox: [-60.5, -30.5, -34.5, 5.5] },
  { name: "Andes", bbox: [-78.5, -28.0, -66.0, 5.0] },
  { name: "UK and Ireland", bbox: [-10.8, 49.5, 1.8, 58.9] },
  { name: "Iberia", bbox: [-9.8, 36.0, 3.5, 43.9] },
  { name: "France and Benelux", bbox: [-5.5, 42.0, 8.5, 51.7] },
  { name: "Central Europe", bbox: [5.0, 47.0, 18.8, 54.8] },
  { name: "Alps", bbox: [5.5, 44.0, 16.5, 48.5] },
  { name: "Scandinavia", bbox: [5.0, 55.0, 31.5, 69.5] },
  { name: "Southern Europe", bbox: [8.0, 36.0, 24.8, 45.5] },
  { name: "Balkans", bbox: [13.0, 39.0, 29.5, 47.8] },
  { name: "Eastern Europe", bbox: [18.0, 45.0, 41.5, 59.5] },
  { name: "North Africa", bbox: [-10.5, 20.0, 35.0, 37.0] },
  { name: "East Africa", bbox: [28.0, -12.0, 44.5, 15.5] },
  { name: "Southern Africa", bbox: [16.0, -35.5, 35.5, -17.0] },
  { name: "West Africa Coast", bbox: [-17.5, 4.0, 5.5, 16.5] },
  { name: "Middle East", bbox: [34.0, 12.0, 60.5, 38.0] },
  { name: "India", bbox: [68.0, 8.0, 89.5, 29.5] },
  { name: "Himalaya Edge", bbox: [72.0, 26.0, 96.0, 35.0] },
  { name: "Southeast Asia", bbox: [95.0, -10.5, 125.0, 20.5] },
  { name: "Indonesia", bbox: [95.0, -10.8, 141.5, 5.8] },
  { name: "Japan", bbox: [129.0, 31.0, 146.5, 45.8] },
  { name: "South Korea", bbox: [125.0, 33.0, 130.0, 39.0] },
  { name: "Taiwan", bbox: [119.5, 21.5, 122.5, 25.5] },
  { name: "Philippines", bbox: [116.5, 4.0, 127.5, 19.5] },
  { name: "Australia East", bbox: [145.0, -39.5, 154.0, -16.0] },
  { name: "Australia South", bbox: [132.0, -39.5, 145.5, -28.0] },
  { name: "Australia West", bbox: [113.0, -35.5, 129.5, -14.0] },
  { name: "New Zealand", bbox: [166.0, -47.5, 179.5, -34.0] },
];

const MAPILLARY_GRAPH_URL = "https://graph.mapillary.com/images";

export async function onRequestGet(context) {
  const token = context.env.MAPILLARY_ACCESS_TOKEN || "";
  const url = new URL(context.request.url);
  const exclude = new Set(
    String(url.searchParams.get("exclude") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
  const excludeRegions = new Set(
    String(url.searchParams.get("excludeRegions") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );

  if (!token) {
    return Response.json({ round: null, source: "fallback", reason: "missing-token" }, { status: 200 });
  }

  const availableRegions = WORLD_REGIONS.filter((region) => !excludeRegions.has(region.name));
  const regionPool = shuffle(availableRegions.length ? availableRegions.slice() : WORLD_REGIONS.slice());

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const region = regionPool[attempt % regionPool.length];
    const bbox = randomSubBox(region.bbox);
    const params = new URLSearchParams({
      access_token: token,
      bbox: bbox.join(","),
      fields: "id,computed_geometry,captured_at",
      limit: "100",
    });

    const response = await fetch(MAPILLARY_GRAPH_URL + "?" + params.toString(), {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      continue;
    }

    const payload = await response.json();
    const candidates = (payload.data || [])
      .map((item) => mapToRound(item, region.name))
      .filter((item) => item && !exclude.has(item.imageKey));

    if (!candidates.length) {
      continue;
    }

    const round = pickRandomItem(candidates);
    return Response.json(
      {
        round,
        source: "mapillary",
        region: region.name,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return Response.json({ round: null, source: "fallback", reason: "no-worldwide-round-found" }, { status: 200 });
}

function mapToRound(item, regionName) {
  const coordinates = item && item.computed_geometry && item.computed_geometry.coordinates;
  if (!item || !item.id || !Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  return {
    name: regionName,
    lat: coordinates[1],
    lng: coordinates[0],
    imageKey: item.id,
    sourceUrl: "https://www.mapillary.com/app/?pKey=" + encodeURIComponent(item.id),
    imageUrl: "https://www.mapillary.com/embed?image_key=" + encodeURIComponent(item.id),
    attribution: "Mapillary imagery",
    license: "CC BY-SA",
    region: regionName,
  };
}

function randomSubBox(bbox) {
  const west = bbox[0];
  const south = bbox[1];
  const east = bbox[2];
  const north = bbox[3];
  const maxArea = 0.0095;
  const width = 0.04 + Math.random() * 0.07;
  const height = Math.min(0.11, maxArea / width);
  const minWest = west;
  const maxWest = east - width;
  const minSouth = south;
  const maxSouth = north - height;
  const subWest = randomBetween(minWest, maxWest);
  const subSouth = randomBetween(minSouth, maxSouth);

  return [
    roundCoord(subWest),
    roundCoord(subSouth),
    roundCoord(subWest + width),
    roundCoord(subSouth + height),
  ];
}

function randomBetween(min, max) {
  if (max <= min) {
    return min;
  }
  return min + Math.random() * (max - min);
}

function roundCoord(value) {
  return Number(value.toFixed(6));
}

function pickRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = items[index];
    items[index] = items[swapIndex];
    items[swapIndex] = current;
  }

  return items;
}
