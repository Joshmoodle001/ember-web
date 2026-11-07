import "server-only";

const placesEndpoint = "https://places.googleapis.com/v1/places:searchText";
const placesFieldMask = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.websiteUri",
  "places.internationalPhoneNumber",
  "places.googleMapsUri",
  "places.businessStatus",
  "places.attributions",
].join(",");

export type PlacesResult = {
  placeId: string;
  name: string;
  address: string;
  website: string | null;
  phone: string | null;
  mapsUrl: string | null;
  businessStatus: string | null;
  attributions: string[];
};

type GooglePlace = {
  id?: unknown;
  displayName?: { text?: unknown };
  formattedAddress?: unknown;
  websiteUri?: unknown;
  internationalPhoneNumber?: unknown;
  googleMapsUri?: unknown;
  businessStatus?: unknown;
  attributions?: unknown;
};

type GoogleSearchResponse = { places?: unknown };

function stringValue(value: unknown, maxLength = 2048): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim().slice(0, maxLength);
  return result || null;
}

function safeWebUrl(value: unknown, googleOnly = false): string | null {
  const raw = stringValue(value, 2048);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!(["https:", "http:"].includes(url.protocol)) || !url.hostname || url.username || url.password) return null;
    const hostname = url.hostname.toLowerCase();
    if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1" || hostname === "[::1]") return null;
    if (googleOnly && hostname !== "google.com" && !hostname.endsWith(".google.com")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function attributionNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).flatMap((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return [];
    const name = stringValue((item as Record<string, unknown>).displayName, 200);
    return name ? [name] : [];
  });
}

function parsePlace(value: unknown): PlacesResult | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const place = value as GooglePlace;
  const placeId = stringValue(place.id, 200);
  const name = stringValue(place.displayName?.text, 240);
  if (!placeId || !name) return null;
  const businessStatus = stringValue(place.businessStatus, 60);
  return {
    placeId,
    name,
    address: stringValue(place.formattedAddress, 500) ?? "",
    website: safeWebUrl(place.websiteUri),
    phone: stringValue(place.internationalPhoneNumber, 60),
    mapsUrl: safeWebUrl(place.googleMapsUri, true),
    businessStatus,
    attributions: attributionNames(place.attributions),
  };
}

export function isGooglePlacesConfigured() {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim());
}

export async function searchGooglePlaces(query: string, city?: string): Promise<PlacesResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) throw new Error("Google Places lookup is not configured.");

  const textQuery = city ? `${query} in ${city}, South Africa` : `${query}, South Africa`;
  const response = await fetch(placesEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": placesFieldMask,
    },
    body: JSON.stringify({ textQuery, pageSize: 10, languageCode: "en", regionCode: "ZA" }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) throw new Error("Google Places lookup failed.");
  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new Error("Google Places returned an invalid response.");
  }
  const places = (payload as GoogleSearchResponse).places;
  if (!Array.isArray(places)) return [];
  return places.slice(0, 10).flatMap((place) => {
    const parsed = parsePlace(place);
    return parsed ? [parsed] : [];
  });
}
