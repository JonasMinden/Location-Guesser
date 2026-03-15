export async function onRequestGet(context) {
  const apiKey = context.env.GOOGLE_MAPS_API_KEY || "";
  const mapId = context.env.GOOGLE_MAPS_MAP_ID || "";
  const provider = context.env.LOCATION_GUESSER_PROVIDER || "";
  const hasMapillaryAccessToken = Boolean(context.env.MAPILLARY_ACCESS_TOKEN);

  return Response.json(
    {
      googleMapsApiKey: apiKey,
      mapId,
      provider,
      hasMapillaryAccessToken,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
