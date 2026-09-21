"use server";

// Free tier is HTTP only — call is server-to-server so no mixed-content issue
const BASE = "http://api.aviationstack.com/v1";

export interface FlightLookupResult {
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  departsAt: string;
  arrivesAt: string;
}

export async function lookupFlight(
  rawInput: string,
  date: string,
): Promise<FlightLookupResult | null> {
  const normalized = rawInput.replace(/\s+/g, "").toUpperCase();
  const hasPrefix  = /^[A-Z]/.test(normalized);

  const url = new URL(`${BASE}/flights`);
  url.searchParams.set("access_key",  process.env.AVIATIONSTACK_API_KEY!);
  url.searchParams.set("flight_date", date);
  url.searchParams.set("limit",       "1");

  if (hasPrefix) {
    url.searchParams.set("flight_iata", normalized);
  } else {
    url.searchParams.set("flight_number", normalized);
  }

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = await res.json();
    if (data.error) throw new Error(data.error.info ?? "Aviationstack error");

    const flights: any[] = data.data ?? [];
    if (!flights.length) return null;

    const f = flights[0];
    return {
      flightNumber: f.flight?.iata ?? normalized,
      airline:      f.airline?.name ?? f.airline?.iata ?? "",
      origin:       f.departure?.iata ?? "",
      destination:  f.arrival?.iata ?? "",
      departsAt:    f.departure?.scheduled ?? "",
      arrivesAt:    f.arrival?.scheduled ?? "",
    };
  } catch {
    return null;
  }
}
