import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const sourcePath = new URL("../src/lib/google-places.ts", import.meta.url);
const asPlainData = (value) => JSON.parse(JSON.stringify(value));

async function loadPlaces(state) {
  const source = await readFile(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const compiledModule = { exports: {} };
  const sandboxRequire = (id) => id === "server-only" ? {} : require(id);
  vm.runInNewContext(compiled, {
    exports: compiledModule.exports,
    module: compiledModule,
    require: sandboxRequire,
    process: { env: state.env ?? {} },
    fetch: state.fetch,
    URL,
    AbortSignal,
  });
  return compiledModule.exports;
}

test("Places search sends a bounded text query with the required field mask and no-store caching", async () => {
  let request;
  const places = await loadPlaces({
    env: { GOOGLE_PLACES_API_KEY: "synthetic-google-key" },
    fetch: async (url, init) => {
      request = { url, ...init };
      return { ok: true, json: async () => ({ places: [] }) };
    },
  });

  assert.equal(places.isGooglePlacesConfigured(), true);
  assert.deepEqual(asPlainData(await places.searchGooglePlaces("dentists", "Cape Town")), []);
  assert.equal(request.url, "https://places.googleapis.com/v1/places:searchText");
  assert.equal(request.method, "POST");
  assert.equal(request.cache, "no-store");
  assert.equal(request.redirect, "error", "provider redirects are not followed");
  assert.equal(request.headers["X-Goog-Api-Key"], "synthetic-google-key");
  assert.match(request.headers["X-Goog-FieldMask"], /places\.googleMapsUri/);
  assert.deepEqual(JSON.parse(request.body), { textQuery: "dentists in Cape Town, South Africa", pageSize: 10, languageCode: "en", regionCode: "ZA" });
  assert.ok(request.signal instanceof AbortSignal);
});

test("Places search fails closed without an API key and does not call fetch", async () => {
  let fetchCalled = false;
  const places = await loadPlaces({ env: { GOOGLE_PLACES_API_KEY: "  " }, fetch: async () => { fetchCalled = true; } });

  assert.equal(places.isGooglePlacesConfigured(), false);
  await assert.rejects(places.searchGooglePlaces("salons"), /not configured/);
  assert.equal(fetchCalled, false);
});

test("malformed provider payloads are rejected, while missing or non-array place lists are empty", async () => {
  for (const payload of [null, [], "not an object"]) {
    const places = await loadPlaces({ env: { GOOGLE_PLACES_API_KEY: "synthetic-key" }, fetch: async () => ({ ok: true, json: async () => payload }) });
    await assert.rejects(places.searchGooglePlaces("cafes"), /invalid response/);
  }
  for (const payload of [{}, { places: null }, { places: "wrong-shape" }]) {
    const places = await loadPlaces({ env: { GOOGLE_PLACES_API_KEY: "synthetic-key" }, fetch: async () => ({ ok: true, json: async () => payload }) });
    assert.deepEqual(asPlainData(await places.searchGooglePlaces("cafes")), []);
  }
});

test("provider failures return a generic error", async () => {
  const places = await loadPlaces({ env: { GOOGLE_PLACES_API_KEY: "synthetic-key" }, fetch: async () => ({ ok: false, status: 403 }) });
  await assert.rejects(places.searchGooglePlaces("cafes"), /lookup failed/);
});

test("malformed results are dropped and website/maps URLs accept only safe schemes and hosts", async () => {
  const payload = {
    places: [
      {
        id: "place-safe",
        displayName: { text: "  Studio  " },
        formattedAddress: "  Cape Town  ",
        websiteUri: "https://studio.example/path",
        internationalPhoneNumber: "+27 21 555 0100",
        googleMapsUri: "https://maps.google.com/?q=studio",
        businessStatus: "OPERATIONAL",
        attributions: [{ displayName: "  Google Maps  " }, null, { displayName: "" }],
      },
      { id: "missing-name", displayName: {}, websiteUri: "https://safe.example" },
      { id: "unsafe-urls", displayName: { text: "Unsafe" }, websiteUri: "javascript:alert(1)", googleMapsUri: "https://google.com.attacker.example/maps" },
      { id: "credentials", displayName: { text: "Credentials" }, websiteUri: "https://user:pass@private.example", googleMapsUri: "https://user:pass@maps.google.com" },
      { id: "local", displayName: { text: "Local" }, websiteUri: "http://localhost:3000", googleMapsUri: "http://127.0.0.1/map" },
      { id: "data", displayName: { text: "Data" }, websiteUri: "data:text/html,hi", googleMapsUri: "javascript:alert(1)" },
      "not-a-place",
    ],
  };
  const places = await loadPlaces({ env: { GOOGLE_PLACES_API_KEY: "synthetic-key" }, fetch: async () => ({ ok: true, json: async () => payload }) });

  const results = asPlainData(await places.searchGooglePlaces("salons"));
  assert.equal(results.length, 5);
  assert.deepEqual(results[0], {
    placeId: "place-safe",
    name: "Studio",
    address: "Cape Town",
    website: "https://studio.example/path",
    phone: "+27 21 555 0100",
    mapsUrl: "https://maps.google.com/?q=studio",
    businessStatus: "OPERATIONAL",
    attributions: ["Google Maps"],
  });
  assert.equal(results[1].website, null);
  assert.equal(results[1].mapsUrl, null);
  assert.equal(results[2].website, null);
  assert.equal(results[2].mapsUrl, null);
  assert.equal(results[3].website, null);
  assert.equal(results[3].mapsUrl, null);
  assert.equal(results[4].website, null);
  assert.equal(results[4].mapsUrl, null);
});
