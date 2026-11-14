import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// searchFlightOffers / resolveBookingUrl against a mocked SerpAPI: no network,
// no quota spent. The session is mocked to a signed-in guest.
vi.mock("~/lib/server/session", () => ({
  requireGuest: async () => ({ guest: { id: "gberg", name: "Garrett", initials: "GB" }, email: "g@example.com", image: null }),
}));

const fetchMock = vi.fn<(url: string) => Promise<Response>>();
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

async function load() {
  vi.resetModules(); // fresh caches and budgets for each test
  return import("./amadeus");
}

const UNAVAILABLE = "Flight search isn't available right now. Try the links below.";

/** A SerpAPI offer: JFK 7:00 AM → PHX 9:30 AM local, non-stop, $412. */
const offer = (overrides: Record<string, unknown> = {}) => ({
  flights: [
    {
      departure_airport: { name: "John F. Kennedy International Airport", id: "JFK", time: "2027-04-08 07:00" },
      arrival_airport: { name: "Phoenix Sky Harbor International Airport", id: "PHX", time: "2027-04-08 09:30" },
      duration: 330,
      airline: "American",
      flight_number: "AA 1105",
    },
  ],
  total_duration: 330,
  price: 412,
  departure_token: "token-1",
  ...overrides,
});
const segment = offer().flights[0];

/** The card that offer becomes: each time carries its own airport's offset. */
const card = {
  id: "0",
  price: 412,
  airline: "American",
  airlineName: "American",
  flightNumber: "AA 1105",
  origin: "JFK",
  destination: "PHX",
  departsAt: "2027-04-08T07:00:00-04:00",
  arrivesAt: "2027-04-08T09:30:00-07:00",
  stops: 0,
  duration: "5h 30m",
  bookingToken: "token-1",
  bookingUrl: "https://www.kayak.com/flights/JFK-PHX/2027-04-08/2027-04-12",
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("SERP_API_KEY", "test-key");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("searchFlightOffers (FL-6)", () => {
  it("always searches to PHX for the trip dates, with only offered airlines, de-duplicated", async () => {
    const { searchFlightOffers } = await load();
    fetchMock.mockImplementation(() => json({ best_flights: [], other_flights: [] }));
    await searchFlightOffers("jfk", ["ua", "AA", "AA", "ZZ"]);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("departure_id")).toBe("JFK");
    expect(url.searchParams.get("arrival_id")).toBe("PHX");
    expect(url.searchParams.get("outbound_date")).toBe("2027-04-08");
    expect(url.searchParams.get("return_date")).toBe("2027-04-12");
    expect(url.searchParams.get("include_airlines")).toBe("AA,UA");

    // Same filter written differently: served from the cache, no second paid call.
    await searchFlightOffers("JFK", ["AA", "UA", "UA"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats SerpAPI's no-results error as an empty result and caches it", async () => {
    const { searchFlightOffers } = await load();
    fetchMock.mockImplementation(() =>
      json({ search_metadata: { status: "Success" }, error: "Google Flights hasn't returned any results for this query." }),
    );
    expect(await searchFlightOffers("FLG")).toEqual({ offers: [], insights: null });
    expect(await searchFlightOffers("FLG")).toEqual({ offers: [], insights: null });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never shows SerpAPI's own error text to guests", async () => {
    const { searchFlightOffers } = await load();
    const failures = [
      () => json({ error: "Your account has run out of searches." }, 429),
      () => json({ error: "Invalid API key. Your API key should be here: https://serpapi.com/manage-api-key" }, 401),
      () => json({ error: "Something went wrong." }),
      () => Promise.resolve(new Response("<html>Bad gateway</html>", { status: 502 })),
      () => Promise.reject(new TypeError("fetch failed")),
    ];
    for (const failure of failures) {
      fetchMock.mockImplementationOnce(failure);
      await expect(searchFlightOffers("JFK")).rejects.toThrow(
        "Flight search isn't available right now. Try the links below.",
      );
    }
    // Failures aren't cached: the next search tries again.
    fetchMock.mockImplementationOnce(() => json({ best_flights: [] }));
    await expect(searchFlightOffers("JFK")).resolves.toEqual({ offers: [], insights: null });
  });

  it("rejects bad origins without a paid call", async () => {
    const { searchFlightOffers } = await load();
    await expect(searchFlightOffers("JF")).rejects.toThrow("Enter a 3-letter airport code, like JFK.");
    await expect(searchFlightOffers("phx")).rejects.toThrow("not PHX");
    // Mesa Gateway and Tucson are a drive from PHX.
    await expect(searchFlightOffers("AZA")).rejects.toThrow("AZA is close enough to drive to PHX");
    await expect(searchFlightOffers("TUS")).rejects.toThrow("TUS is close enough to drive to PHX");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("caps paid calls per guest, shared with booking links", async () => {
    const { searchFlightOffers, resolveBookingUrl } = await load();
    fetchMock.mockImplementation(() => json({ error: "Something went wrong." })); // never cached
    for (let i = 0; i < 19; i++) await searchFlightOffers("JFK").catch(() => {});
    fetchMock.mockImplementation(() => json({ booking_options: [] }));
    expect(await resolveBookingUrl("token-1")).toBeNull(); // 20th paid call
    expect(fetchMock).toHaveBeenCalledTimes(20);

    await expect(searchFlightOffers("LAX")).rejects.toThrow("That's a lot of searches");
    expect(await resolveBookingUrl("token-2")).toBeNull(); // falls back to the search link
    expect(fetchMock).toHaveBeenCalledTimes(20);
  });
});

describe("searchFlightOffers with unexpected results", () => {
  it("turns an offer into a card with local times at each airport", async () => {
    const { searchFlightOffers } = await load();
    fetchMock.mockImplementation(() => json({ best_flights: [offer()] }));
    expect(await searchFlightOffers("JFK")).toEqual({ offers: [card], insights: null });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it.each([
    ["no departure airport code", { flights: [{ ...segment, departure_airport: { time: "2027-04-08 07:00" } }] }],
    ["no departure time", { flights: [{ ...segment, departure_airport: { id: "JFK" } }] }],
    ["no arrival airport", { flights: [{ ...segment, arrival_airport: undefined }] }],
    ["no flights", { flights: [] }],
    ["a price that isn't a number", { price: "$412" }],
    ["no total duration", { total_duration: undefined }],
  ])("skips an offer with %s and keeps the good one", async (_, broken) => {
    const { searchFlightOffers } = await load();
    fetchMock.mockImplementation(() => json({ best_flights: [offer(broken)], other_flights: [offer()] }));
    expect(await searchFlightOffers("JFK")).toEqual({ offers: [card], insights: null });
    // How many were skipped goes to the server log.
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("skipped 1 of 2 offers"));
  });

  it("shows the usual message for a body it can't read, and doesn't cache it", async () => {
    const { searchFlightOffers } = await load();
    // best_flights should be a list: reading this one throws a TypeError.
    fetchMock.mockImplementationOnce(() => json({ best_flights: { flights: [] } }));
    await expect(searchFlightOffers("JFK")).rejects.toThrow(new Error(UNAVAILABLE));
    // The reason is logged on the server, not shown to the guest.
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("[serpapi]"), expect.any(TypeError));

    // Not cached: the next search makes a fresh call.
    fetchMock.mockImplementationOnce(() => json({ best_flights: [offer()] }));
    expect(await searchFlightOffers("JFK")).toEqual({ offers: [card], insights: null });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("treats offers that are all unreadable as unavailable, not as no flights", async () => {
    const { searchFlightOffers } = await load();
    fetchMock.mockImplementationOnce(() => json({ best_flights: [offer({ price: null })], other_flights: [offer({ flights: [] })] }));
    await expect(searchFlightOffers("JFK")).rejects.toThrow(new Error(UNAVAILABLE));

    fetchMock.mockImplementationOnce(() => json({ best_flights: [offer()] }));
    expect(await searchFlightOffers("JFK")).toEqual({ offers: [card], insights: null });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps price insights in the shape the page reads", async () => {
    const { searchFlightOffers } = await load();
    fetchMock.mockImplementation(() =>
      json({
        best_flights: [offer()],
        price_insights: { price_level: 3, typical_price_range: [310, "lots"], lowest_price: 412 },
      }),
    );
    expect((await searchFlightOffers("JFK")).insights).toEqual({
      priceLevel: "typical",
      typicalRangeLow: 310,
      typicalRangeHigh: 310,
      lowestPrice: 412,
    });
  });
});

describe("findNearbyAirports", () => {
  it("lists the five nearest airports a guest would fly from", async () => {
    const { findNearbyAirports } = await load();
    // Midtown Manhattan.
    const nyc = await findNearbyAirports(40.7549, -73.984);
    expect(nyc).toHaveLength(5);
    expect(nyc.slice(0, 3).map((a) => a.code).sort()).toEqual(["EWR", "JFK", "LGA"]);
    expect(nyc[0].distanceKm).toBeLessThan(25);
  });

  it("leaves out airports within driving distance of PHX", async () => {
    const { findNearbyAirports } = await load();
    // Downtown Tucson and Gilbert, in the East Valley.
    for (const [lat, lng] of [[32.2226, -110.9747], [33.3528, -111.789]]) {
      const codes = (await findNearbyAirports(lat, lng)).map((a) => a.code);
      expect(codes).toHaveLength(5);
      expect(codes).not.toContain("PHX");
      expect(codes).not.toContain("AZA");
      expect(codes).not.toContain("TUS");
    }
  });

  it("returns nothing for a position that isn't a number", async () => {
    const { findNearbyAirports } = await load();
    expect(await findNearbyAirports(Number.NaN, -111.9)).toEqual([]);
  });
});
