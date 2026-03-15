const WORLD_REGIONS = [
  { name: "Alaska", bbox: [-170.0, 51.0, -129.5, 71.0] },
  { name: "Canada West", bbox: [-139.0, 48.0, -113.0, 61.5] },
  { name: "Canada East", bbox: [-79.5, 43.0, -57.0, 55.5] },
  { name: "US Pacific", bbox: [-124.8, 32.0, -117.0, 49.0] },
  { name: "US Mountain", bbox: [-117.5, 32.0, -103.0, 49.0] },
  { name: "US Central", bbox: [-104.0, 29.0, -89.0, 49.0] },
  { name: "US Great Lakes", bbox: [-93.5, 40.0, -74.0, 49.5] },
  { name: "US Atlantic", bbox: [-83.5, 25.0, -66.9, 46.0] },
  { name: "Mexico North", bbox: [-117.5, 22.5, -97.0, 32.5] },
  { name: "Mexico South", bbox: [-104.5, 15.5, -86.5, 22.8] },
  { name: "Central America", bbox: [-92.5, 7.0, -77.0, 18.5] },
  { name: "Caribbean", bbox: [-85.5, 10.0, -60.0, 24.0] },
  { name: "South America North", bbox: [-79.5, -5.0, -48.0, 12.5] },
  { name: "Brazil North", bbox: [-67.5, -10.0, -46.0, 3.5] },
  { name: "Brazil South", bbox: [-60.5, -30.5, -40.0, -10.0] },
  { name: "Andes North", bbox: [-78.5, -8.0, -66.0, 5.0] },
  { name: "Andes South", bbox: [-75.0, -41.5, -66.0, -8.0] },
  { name: "Patagonia", bbox: [-74.5, -54.5, -62.0, -38.0] },
  { name: "UK and Ireland", bbox: [-10.8, 49.5, 1.8, 58.9] },
  { name: "Iberia", bbox: [-9.8, 36.0, 3.5, 43.9] },
  { name: "France and Benelux", bbox: [-5.5, 42.0, 8.5, 51.7] },
  { name: "Germany and Poland", bbox: [5.0, 47.0, 20.5, 55.2] },
  { name: "Alps", bbox: [5.5, 44.0, 16.5, 48.5] },
  { name: "Italy", bbox: [7.0, 37.0, 18.8, 47.2] },
  { name: "Scandinavia South", bbox: [5.0, 55.0, 20.0, 63.5] },
  { name: "Scandinavia North", bbox: [14.0, 63.0, 31.5, 71.0] },
  { name: "Southern Europe", bbox: [8.0, 36.0, 24.8, 45.5] },
  { name: "Balkans", bbox: [13.0, 39.0, 29.5, 47.8] },
  { name: "Eastern Europe", bbox: [18.0, 45.0, 41.5, 59.5] },
  { name: "Turkey", bbox: [25.5, 35.5, 45.5, 42.5] },
  { name: "North Africa West", bbox: [-10.5, 20.0, 11.0, 37.0] },
  { name: "North Africa East", bbox: [10.0, 20.0, 35.0, 37.0] },
  { name: "East Africa North", bbox: [28.0, -1.0, 44.5, 15.5] },
  { name: "East Africa South", bbox: [28.0, -12.0, 42.5, -1.0] },
  { name: "Southern Africa West", bbox: [16.0, -35.5, 27.0, -17.0] },
  { name: "Southern Africa East", bbox: [27.0, -35.5, 39.5, -17.0] },
  { name: "West Africa Coast", bbox: [-17.5, 4.0, 5.5, 16.5] },
  { name: "Middle East West", bbox: [34.0, 12.0, 48.0, 38.0] },
  { name: "Middle East East", bbox: [47.0, 18.0, 60.5, 35.0] },
  { name: "India North", bbox: [68.0, 20.0, 89.5, 31.5] },
  { name: "India South", bbox: [72.0, 8.0, 86.5, 20.0] },
  { name: "Himalaya Edge", bbox: [72.0, 26.0, 96.0, 35.0] },
  { name: "Southeast Asia Mainland", bbox: [95.0, 6.0, 108.5, 20.5] },
  { name: "Malaysia and Singapore", bbox: [99.0, 0.8, 104.5, 7.5] },
  { name: "Indonesia West", bbox: [95.0, -6.8, 114.5, 5.8] },
  { name: "Indonesia East", bbox: [114.0, -10.8, 141.5, 2.5] },
  { name: "Philippines", bbox: [116.5, 4.0, 127.5, 19.5] },
  { name: "Taiwan", bbox: [119.5, 21.5, 122.5, 25.5] },
  { name: "South Korea", bbox: [125.0, 33.0, 130.0, 39.0] },
  { name: "Japan South", bbox: [129.0, 31.0, 136.0, 35.5] },
  { name: "Japan Central", bbox: [135.0, 34.0, 141.0, 38.7] },
  { name: "Japan North", bbox: [139.0, 38.0, 146.5, 45.8] },
  { name: "Australia East", bbox: [145.0, -39.5, 154.0, -16.0] },
  { name: "Australia South", bbox: [132.0, -39.5, 145.5, -28.0] },
  { name: "Australia West", bbox: [113.0, -35.5, 129.5, -14.0] },
  { name: "New Zealand North", bbox: [172.0, -39.5, 179.5, -34.0] },
  { name: "New Zealand South", bbox: [166.0, -47.5, 174.5, -40.0] },
];

const MAPILLARY_GRAPH_URL = "https://graph.mapillary.com/images";
const SEARCH_PASSES = [
  { searches: 18, limit: 100, minWidth: 0.02, maxWidth: 0.08, maxArea: 0.0065 },
  { searches: 24, limit: 100, minWidth: 0.05, maxWidth: 0.16, maxArea: 0.02 },
  { searches: 24, limit: 100, minWidth: 0.12, maxWidth: 0.28, maxArea: 0.055 },
];
const MIN_CANDIDATES_BEFORE_STOP = 450;
const DEFAULT_ROUND_BATCH_SIZE = 60;
const MAX_ROUND_BATCH_SIZE = 120;

export async function onRequest(context) {
  if (context.request.method === "GET") {
    return handleOpenRoundRequest(context);
  }

  if (context.request.method === "POST") {
    return handleOpenRoundRequest(context);
  }

  return new Response("Method Not Allowed", {
    status: 405,
    headers: {
      Allow: "GET, POST",
    },
  });
}

export async function onRequestGet(context) {
  return handleOpenRoundRequest(context);
}

export async function onRequestPost(context) {
  return handleOpenRoundRequest(context);
}

async function handleOpenRoundRequest(context) {
  const token = context.env.MAPILLARY_ACCESS_TOKEN || "";
  const filters = await parseFilters(context.request);
  const excludeImageKeys = new Set(filters.excludeImageKeys);
  const excludeRegions = new Set(filters.excludeRegions);
  const requestedCount = clampNumber(filters.count, 1, MAX_ROUND_BATCH_SIZE, DEFAULT_ROUND_BATCH_SIZE);

  if (!token) {
    return Response.json({ round: null, source: "fallback", reason: "missing-token" }, { status: 200 });
  }

  const availableRegions = WORLD_REGIONS.filter((region) => !excludeRegions.has(region.name));
  const regionPool = shuffle((availableRegions.length ? availableRegions : WORLD_REGIONS).slice());
  const candidates = await collectCandidates(token, regionPool, excludeImageKeys);

  if (!candidates.length) {
    return Response.json({ round: null, source: "fallback", reason: "no-worldwide-round-found" }, { status: 200 });
  }

  const round = pickRandomItem(candidates);
  const rounds = shuffle(candidates.slice()).slice(0, requestedCount);
  return Response.json(
    {
      round,
      rounds,
      source: "mapillary",
      candidateCount: candidates.length,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

async function parseFilters(request) {
  if (request.method === "POST") {
    try {
      const payload = await request.json();
      return {
        excludeImageKeys: normalizeStringList(payload && payload.excludeImageKeys),
        excludeRegions: normalizeStringList(payload && payload.excludeRegions),
        count: payload && payload.count,
      };
    } catch (_error) {
      return {
        excludeImageKeys: [],
        excludeRegions: [],
        count: DEFAULT_ROUND_BATCH_SIZE,
      };
    }
  }

  const url = new URL(request.url);
  return {
    excludeImageKeys: normalizeCommaSeparated(url.searchParams.get("exclude")),
    excludeRegions: normalizeCommaSeparated(url.searchParams.get("excludeRegions")),
    count: url.searchParams.get("count"),
  };
}

async function collectCandidates(token, regionPool, excludeImageKeys) {
  const candidateMap = new Map();
  let regionOffset = 0;

  for (const pass of SEARCH_PASSES) {
    const searchPlans = [];

    for (let index = 0; index < pass.searches; index += 1) {
      const region = regionPool[(regionOffset + index) % regionPool.length];
      searchPlans.push({
        regionName: region.name,
        bbox: randomSubBox(region.bbox, pass),
        limit: pass.limit,
      });
    }

    regionOffset += pass.searches;

    const results = await Promise.all(
      searchPlans.map(function (plan) {
        return fetchCandidatesForPlan(token, plan, excludeImageKeys);
      })
    );

    results.forEach(function (items) {
      items.forEach(function (item) {
        candidateMap.set(item.imageKey, item);
      });
    });

    if (candidateMap.size >= MIN_CANDIDATES_BEFORE_STOP) {
      break;
    }
  }

  return dedupeByGeoCell(shuffle(Array.from(candidateMap.values())), 3);
}

async function fetchCandidatesForPlan(token, plan, excludeImageKeys) {
  const params = new URLSearchParams({
    access_token: token,
    bbox: plan.bbox.join(","),
    fields: "id,computed_geometry,captured_at",
    limit: String(plan.limit),
  });

  try {
    const response = await fetch(MAPILLARY_GRAPH_URL + "?" + params.toString(), {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    return shuffle(
      (payload.data || [])
        .map(function (item) {
          return mapToRound(item, plan.regionName);
        })
        .filter(function (item) {
          return item && !excludeImageKeys.has(item.imageKey);
        })
    );
  } catch (_error) {
    return [];
  }
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

function randomSubBox(bbox, config) {
  const west = bbox[0];
  const south = bbox[1];
  const east = bbox[2];
  const north = bbox[3];
  const width = config.minWidth + Math.random() * (config.maxWidth - config.minWidth);
  const height = Math.min(config.maxWidth, config.maxArea / width);
  const maxWest = east - width;
  const maxSouth = north - height;
  const subWest = randomBetween(west, maxWest);
  const subSouth = randomBetween(south, maxSouth);

  return [
    roundCoord(subWest),
    roundCoord(subSouth),
    roundCoord(subWest + width),
    roundCoord(subSouth + height),
  ];
}

function dedupeByGeoCell(items, decimals) {
  const seen = new Set();
  return items.filter(function (item) {
    const key = item.lat.toFixed(decimals) + ":" + item.lng.toFixed(decimals);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function normalizeStringList(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map(function (value) {
      return String(value || "").trim();
    })
    .filter(Boolean);
}

function normalizeCommaSeparated(value) {
  return String(value || "")
    .split(",")
    .map(function (entry) {
      return entry.trim();
    })
    .filter(Boolean);
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(parsed)));
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
