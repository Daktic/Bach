import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// lookupFlight against a mocked Aviationstack: no network, no quota spent.
// The session is mocked to a signed-in guest.
vi.mock("~/lib/server/session", () => ({
  requireGuest: async () => ({ guest: { id: "gberg", name: "Garrett", initials: "GB" }, email: "g@example.com", image: null }),
}));

const fetchMock = vi.fn<(url: string) => Promise<Response>>();
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

const FLIGHT = {
  flight: { iata: "AA321" },
  airline: { name: "American Airlines", iata: "AA" },
  departure: { iata: "JFK", timezone: "America/New_York", scheduled: "2027-04-08T09:00:00+00:00" },
  arrival: { iata: "PHX", timezone: "America/Phoenix", scheduled: "2027-04-08T11:45:00+00:00" },
};

async function load() {
  vi.resetModules(); // fresh cache and budget for each test
  return import("./aviationstack");
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("AVIATIONSTACK_API_KEY", "test-key");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("lookupFlight (FL-1)", () => {
  it("returns the flight with each airport's UTC offset", async () => {
    const { lookupFlight } = await load();
    fetchMock.mockImplementation(() => json({ data: [FLIGHT] }));
    expect(await lookupFlight("aa 321", "2027-04-08")).toEqual({
      status: "found",
      leg: {
        flightNumber: "AA321",
        airline: "American Airlines",
        origin: "JFK",
        destination: "PHX",
        departsAt: "2027-04-08T09:00:00-04:00",
        arrivesAt: "2027-04-08T11:45:00-07:00",
      },
    });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("flight_iata")).toBe("AA321");
    expect(url.searchParams.get("flight_date")).toBe("2027-04-08");
  });

  it("says not_found only when the service answered with no flight", async () => {
    const { lookupFlight } = await load();
    fetchMock.mockImplementation(() => json({ data: [] }));
    expect(await lookupFlight("AA321", "2027-04-08")).toEqual({ status: "not_found" });
    expect(await lookupFlight("AA321", "2027-04-08")).toEqual({ status: "not_found" }); // cached
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("says unavailable, uncached, when the service can't answer", async () => {
    const { lookupFlight } = await load();
    const failures = [
      () => json({ error: { code: "function_access_restricted", info: "Your plan does not support this." } }, 403),
      () => json({ error: { code: "usage_limit_reached", info: "Monthly limit reached." } }),
      () => Promise.resolve(new Response("Bad gateway", { status: 502 })),
      () => Promise.reject(new TypeError("fetch failed")),
    ];
    for (const failure of failures) {
      fetchMock.mockImplementationOnce(failure);
      expect(await lookupFlight("AA321", "2027-04-08")).toEqual({ status: "unavailable" });
    }
    expect(fetchMock).toHaveBeenCalledTimes(failures.length);
  });

  it("says unavailable when no API key is set", async () => {
    vi.stubEnv("AVIATIONSTACK_API_KEY", "");
    vi.stubEnv("AVIATION_STACK_API_KEY", "");
    const { lookupFlight } = await load();
    expect(await lookupFlight("AA321", "2027-04-08")).toEqual({ status: "unavailable" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("only spends a paid call on flight numbers and dates around the trip", async () => {
    const { lookupFlight } = await load();
    expect(await lookupFlight("AA321", "2027-03-01")).toEqual({ status: "not_found" });
    expect(await lookupFlight("AA321", "2027-04-20")).toEqual({ status: "not_found" });
    expect(await lookupFlight("not a flight", "2027-04-08")).toEqual({ status: "not_found" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("caps paid lookups per guest", async () => {
    const { lookupFlight } = await load();
    fetchMock.mockImplementation(() => json({ data: [] }));
    for (let i = 1; i <= 10; i++) await lookupFlight(`AA${i}`, "2027-04-08");
    expect(fetchMock).toHaveBeenCalledTimes(10);
    expect(await lookupFlight("AA11", "2027-04-08")).toEqual({ status: "unavailable" });
    expect(fetchMock).toHaveBeenCalledTimes(10);
    // Cached answers are still free.
    expect(await lookupFlight("AA1", "2027-04-08")).toEqual({ status: "not_found" });
  });
});
