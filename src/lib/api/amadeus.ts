"use server";

const SERP_BASE = "https://serpapi.com/search.json";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NearbyAirport {
  code: string;
  name: string;
  city: string;
  distanceKm: number;
}

export interface FlightOffer {
  id: string;
  price: number;
  airline: string;
  airlineName: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departsAt: string;
  arrivesAt: string;
  stops: number;
  duration: string;
  bookingToken: string;
  bookingUrl: string; // Kayak RT fallback
}

export interface PriceInsights {
  priceLevel: "low" | "typical" | "high" | string;
  typicalRangeLow: number;
  typicalRangeHigh: number;
  lowestPrice: number;
}

export interface FlightSearchResult {
  offers: FlightOffer[];
  insights: PriceInsights | null;
}

// ─── Static airport list for geolocation ─────────────────────────────────────

const AIRPORTS = [
  { code: "ATL", name: "Hartsfield-Jackson",       city: "Atlanta",         lat: 33.6407,  lng: -84.4277  },
  { code: "LAX", name: "Los Angeles Intl",          city: "Los Angeles",     lat: 33.9425,  lng: -118.4081 },
  { code: "ORD", name: "O'Hare Intl",              city: "Chicago",         lat: 41.9742,  lng: -87.9073  },
  { code: "DFW", name: "Dallas/Fort Worth Intl",   city: "Dallas",          lat: 32.8998,  lng: -97.0403  },
  { code: "DEN", name: "Denver Intl",              city: "Denver",          lat: 39.8561,  lng: -104.6737 },
  { code: "JFK", name: "John F. Kennedy Intl",     city: "New York",        lat: 40.6413,  lng: -73.7781  },
  { code: "SFO", name: "San Francisco Intl",       city: "San Francisco",   lat: 37.6213,  lng: -122.3790 },
  { code: "SEA", name: "Seattle-Tacoma Intl",      city: "Seattle",         lat: 47.4502,  lng: -122.3088 },
  { code: "LAS", name: "Harry Reid Intl",          city: "Las Vegas",       lat: 36.0840,  lng: -115.1537 },
  { code: "MCO", name: "Orlando Intl",             city: "Orlando",         lat: 28.4312,  lng: -81.3081  },
  { code: "CLT", name: "Charlotte Douglas Intl",   city: "Charlotte",       lat: 35.2140,  lng: -80.9431  },
  { code: "PHX", name: "Phoenix Sky Harbor Intl",  city: "Phoenix",         lat: 33.4373,  lng: -112.0078 },
  { code: "MIA", name: "Miami Intl",               city: "Miami",           lat: 25.7959,  lng: -80.2870  },
  { code: "IAH", name: "George Bush Intercont.",   city: "Houston",         lat: 29.9902,  lng: -95.3368  },
  { code: "BOS", name: "Logan Intl",               city: "Boston",          lat: 42.3656,  lng: -71.0096  },
  { code: "MSP", name: "Minneapolis-Saint Paul",   city: "Minneapolis",     lat: 44.8848,  lng: -93.2223  },
  { code: "DTW", name: "Detroit Metro Wayne Co.",  city: "Detroit",         lat: 42.2124,  lng: -83.3534  },
  { code: "PHL", name: "Philadelphia Intl",        city: "Philadelphia",    lat: 39.8721,  lng: -75.2411  },
  { code: "LGA", name: "LaGuardia",                city: "New York",        lat: 40.7772,  lng: -73.8726  },
  { code: "EWR", name: "Newark Liberty Intl",      city: "Newark",          lat: 40.6895,  lng: -74.1745  },
  { code: "FLL", name: "Fort Lauderdale-Hollywood",city: "Fort Lauderdale", lat: 26.0742,  lng: -80.1506  },
  { code: "BWI", name: "Baltimore/Washington",     city: "Baltimore",       lat: 39.1754,  lng: -76.6683  },
  { code: "IAD", name: "Washington Dulles Intl",   city: "Washington DC",   lat: 38.9531,  lng: -77.4565  },
  { code: "DCA", name: "Reagan National",          city: "Washington DC",   lat: 38.8512,  lng: -77.0402  },
  { code: "MDW", name: "Chicago Midway Intl",      city: "Chicago",         lat: 41.7868,  lng: -87.7522  },
  { code: "SLC", name: "Salt Lake City Intl",      city: "Salt Lake City",  lat: 40.7884,  lng: -111.9778 },
  { code: "HOU", name: "William P. Hobby",         city: "Houston",         lat: 29.6454,  lng: -95.2789  },
  { code: "SAN", name: "San Diego Intl",           city: "San Diego",       lat: 32.7338,  lng: -117.1933 },
  { code: "TPA", name: "Tampa Intl",               city: "Tampa",           lat: 27.9755,  lng: -82.5332  },
  { code: "PDX", name: "Portland Intl",            city: "Portland",        lat: 45.5898,  lng: -122.5951 },
  { code: "STL", name: "St. Louis Lambert Intl",   city: "St. Louis",       lat: 38.7487,  lng: -90.3700  },
  { code: "BNA", name: "Nashville Intl",           city: "Nashville",       lat: 36.1245,  lng: -86.6782  },
  { code: "AUS", name: "Austin-Bergstrom Intl",    city: "Austin",          lat: 30.1975,  lng: -97.6664  },
  { code: "MCI", name: "Kansas City Intl",         city: "Kansas City",     lat: 39.2976,  lng: -94.7139  },
  { code: "OAK", name: "Oakland Intl",             city: "Oakland",         lat: 37.7213,  lng: -122.2208 },
  { code: "RDU", name: "Raleigh-Durham Intl",      city: "Raleigh",         lat: 35.8776,  lng: -78.7875  },
  { code: "SMF", name: "Sacramento Intl",          city: "Sacramento",      lat: 38.6954,  lng: -121.5908 },
  { code: "MSY", name: "Louis Armstrong Intl",     city: "New Orleans",     lat: 29.9934,  lng: -90.2580  },
  { code: "CLE", name: "Cleveland Hopkins Intl",   city: "Cleveland",       lat: 41.4117,  lng: -81.8498  },
  { code: "PIT", name: "Pittsburgh Intl",          city: "Pittsburgh",      lat: 40.4915,  lng: -80.2329  },
  { code: "IND", name: "Indianapolis Intl",        city: "Indianapolis",    lat: 39.7173,  lng: -86.2944  },
  { code: "CVG", name: "Cincinnati/N. Kentucky",   city: "Cincinnati",      lat: 39.0488,  lng: -84.6678  },
  { code: "CMH", name: "John Glenn Intl",          city: "Columbus",        lat: 39.9980,  lng: -82.8919  },
  { code: "MEM", name: "Memphis Intl",             city: "Memphis",         lat: 35.0424,  lng: -89.9767  },
  { code: "MKE", name: "Milwaukee Mitchell Intl",  city: "Milwaukee",       lat: 42.9472,  lng: -87.8966  },
  { code: "ABQ", name: "Albuquerque Intl Sunport", city: "Albuquerque",     lat: 35.0402,  lng: -106.6090 },
  { code: "OKC", name: "Will Rogers World",        city: "Oklahoma City",   lat: 35.3931,  lng: -97.6007  },
  { code: "SAT", name: "San Antonio Intl",         city: "San Antonio",     lat: 29.5337,  lng: -98.4698  },
  { code: "ONT", name: "Ontario Intl",             city: "Ontario",         lat: 34.0560,  lng: -117.6012 },
  { code: "BUR", name: "Hollywood Burbank",        city: "Burbank",         lat: 34.2007,  lng: -118.3585 },
  { code: "SNA", name: "John Wayne",               city: "Orange County",   lat: 33.6762,  lng: -117.8674 },
  { code: "SJC", name: "San Jose Intl",            city: "San Jose",        lat: 37.3626,  lng: -121.9290 },
  { code: "SJU", name: "Luis Muñoz Marín Intl",    city: "San Juan",        lat: 18.4394,  lng: -66.0018  },
  { code: "ANC", name: "Ted Stevens Intl",         city: "Anchorage",       lat: 61.1743,  lng: -149.9960 },
  { code: "HNL", name: "Daniel K. Inouye Intl",    city: "Honolulu",        lat: 21.3187,  lng: -157.9224 },
  { code: "ELP", name: "El Paso Intl",             city: "El Paso",         lat: 31.8072,  lng: -106.3779 },
  { code: "TUL", name: "Tulsa Intl",               city: "Tulsa",           lat: 36.1984,  lng: -95.8881  },
  { code: "OMA", name: "Eppley Airfield",          city: "Omaha",           lat: 41.3032,  lng: -95.8941  },
  { code: "GRR", name: "Gerald R. Ford Intl",      city: "Grand Rapids",    lat: 42.8808,  lng: -85.5228  },
  { code: "BDL", name: "Bradley Intl",             city: "Hartford",        lat: 41.9389,  lng: -72.6832  },
  { code: "ALB", name: "Albany Intl",              city: "Albany",          lat: 42.7483,  lng: -73.8017  },
  { code: "BUF", name: "Buffalo Niagara Intl",     city: "Buffalo",         lat: 42.9405,  lng: -78.7322  },
  { code: "ROC", name: "Greater Rochester Intl",   city: "Rochester",       lat: 43.1189,  lng: -77.6724  },
  { code: "SYR", name: "Syracuse Hancock Intl",    city: "Syracuse",        lat: 43.1112,  lng: -76.1063  },
];

// ─── Haversine distance ───────────────────────────────────────────────────────

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ─── Format duration from minutes ────────────────────────────────────────────

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(" ");
}

// ─── Server functions ─────────────────────────────────────────────────────────

export async function findNearbyAirports(
  lat: number,
  lng: number,
): Promise<NearbyAirport[]> {
  return AIRPORTS
    .map(ap => ({ ...ap, distanceKm: distanceKm(lat, lng, ap.lat, ap.lng) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 5)
    .map(({ code, name, city, distanceKm: d }) => ({ code, name, city, distanceKm: d }));
}

export async function searchFlightOffers(
  origin: string,
  date: string,
  returnDate = "2027-04-12",
  destination = "PHX",
  airlines: string[] = [],
): Promise<FlightSearchResult> {
  const url = new URL(SERP_BASE);
  url.searchParams.set("engine",        "google_flights");
  url.searchParams.set("departure_id",  origin);
  url.searchParams.set("arrival_id",    destination);
  url.searchParams.set("outbound_date", date);
  url.searchParams.set("return_date",   returnDate);
  url.searchParams.set("currency",      "USD");
  url.searchParams.set("hl",            "en");
  url.searchParams.set("type",          "1"); // round trip
  url.searchParams.set("api_key",       process.env.SERP_API_KEY!);
  if (airlines.length > 0) {
    url.searchParams.set("include_airlines", airlines.join(","));
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Flight search failed: ${res.status}`);
  }

  const data = await res.json();
  if (data.error) throw new Error(data.error);

  const all: any[] = [...(data.best_flights ?? []), ...(data.other_flights ?? [])];

  // Extract Google's price intelligence for this route
  const pi = data.price_insights ?? null;
  const insights: PriceInsights | null = pi
    ? {
        priceLevel:       pi.price_level ?? "typical",
        typicalRangeLow:  Array.isArray(pi.typical_price_range) ? pi.typical_price_range[0] : pi.typical_price_range ?? 0,
        typicalRangeHigh: Array.isArray(pi.typical_price_range) ? (pi.typical_price_range[1] ?? pi.typical_price_range[0]) : pi.typical_price_range ?? 0,
        lowestPrice:      pi.lowest_price ?? 0,
      }
    : null;

  if (!all.length) return { offers: [], insights };

  const offers = all
    .slice(0, 10)
    .map((offer, i) => {
      const first = offer.flights[0];
      const last  = offer.flights[offer.flights.length - 1];

      return {
        id:           String(i),
        price:        offer.price,
        airline:      first.airline,
        airlineName:  first.airline,
        flightNumber: first.flight_number ?? `${first.airline} flight`,
        origin:       first.departure_airport.id,
        destination:  last.arrival_airport.id,
        departsAt:    first.departure_airport.time.replace(" ", "T"),
        arrivesAt:    last.arrival_airport.time.replace(" ", "T"),
        stops:        offer.layovers?.length ?? 0,
        duration:     fmtDuration(offer.total_duration),
        bookingToken: offer.departure_token ?? offer.booking_token ?? "",
        bookingUrl:   `https://www.kayak.com/flights/${first.departure_airport.id}-${destination}/${date}/${returnDate}`,
      };
    })
    .sort((a, b) => a.price - b.price)
    .slice(0, 8);

  return { offers, insights };
}

// ─── Resolve a booking token → direct airline URL ─────────────────────────────

export async function resolveBookingUrl(token: string): Promise<string | null> {
  if (!token) return null;
  try {
    const url = new URL(SERP_BASE);
    url.searchParams.set("engine",          "google_flights_booking");
    url.searchParams.set("departure_token", token);
    url.searchParams.set("api_key",         process.env.SERP_API_KEY!);

    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();

    const options: any[] = data.booking_options ?? [];
    // Prefer the airline's own site over aggregators
    const direct = options.find(o =>
      o.url &&
      !o.book_with?.toLowerCase().includes("google") &&
      !o.book_with?.toLowerCase().includes("kayak") &&
      !o.book_with?.toLowerCase().includes("expedia"),
    );
    return direct?.url ?? options[0]?.url ?? null;
  } catch {
    return null;
  }
}
