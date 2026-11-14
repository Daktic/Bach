// US airports guests are likely to fly from, plus the other Arizona airports
// they might fly into instead of PHX (AZA, TUS), with their IANA time zone.
// Used for "Locate me" (nearest airports), and to attach the right UTC offset
// to flight times when the flight data doesn't include one.

export interface Airport {
  code: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  timeZone: string;
}

export const AIRPORTS: Airport[] = [
  { code: "ATL", name: "Hartsfield-Jackson",        city: "Atlanta",         lat: 33.6407, lng: -84.4277,  timeZone: "America/New_York" },
  { code: "LAX", name: "Los Angeles Intl",          city: "Los Angeles",     lat: 33.9425, lng: -118.4081, timeZone: "America/Los_Angeles" },
  { code: "ORD", name: "O'Hare Intl",               city: "Chicago",         lat: 41.9742, lng: -87.9073,  timeZone: "America/Chicago" },
  { code: "DFW", name: "Dallas/Fort Worth Intl",    city: "Dallas",          lat: 32.8998, lng: -97.0403,  timeZone: "America/Chicago" },
  { code: "DEN", name: "Denver Intl",               city: "Denver",          lat: 39.8561, lng: -104.6737, timeZone: "America/Denver" },
  { code: "JFK", name: "John F. Kennedy Intl",      city: "New York",        lat: 40.6413, lng: -73.7781,  timeZone: "America/New_York" },
  { code: "SFO", name: "San Francisco Intl",        city: "San Francisco",   lat: 37.6213, lng: -122.379,  timeZone: "America/Los_Angeles" },
  { code: "SEA", name: "Seattle-Tacoma Intl",       city: "Seattle",         lat: 47.4502, lng: -122.3088, timeZone: "America/Los_Angeles" },
  { code: "LAS", name: "Harry Reid Intl",           city: "Las Vegas",       lat: 36.084,  lng: -115.1537, timeZone: "America/Los_Angeles" },
  { code: "MCO", name: "Orlando Intl",              city: "Orlando",         lat: 28.4312, lng: -81.3081,  timeZone: "America/New_York" },
  { code: "CLT", name: "Charlotte Douglas Intl",    city: "Charlotte",       lat: 35.214,  lng: -80.9431,  timeZone: "America/New_York" },
  { code: "PHX", name: "Phoenix Sky Harbor Intl",   city: "Phoenix",         lat: 33.4373, lng: -112.0078, timeZone: "America/Phoenix" },
  { code: "AZA", name: "Phoenix-Mesa Gateway",      city: "Mesa",            lat: 33.3078, lng: -111.6556, timeZone: "America/Phoenix" },
  { code: "TUS", name: "Tucson Intl",               city: "Tucson",          lat: 32.1161, lng: -110.9411, timeZone: "America/Phoenix" },
  { code: "MIA", name: "Miami Intl",                city: "Miami",           lat: 25.7959, lng: -80.287,   timeZone: "America/New_York" },
  { code: "IAH", name: "George Bush Intercont.",    city: "Houston",         lat: 29.9902, lng: -95.3368,  timeZone: "America/Chicago" },
  { code: "BOS", name: "Logan Intl",                city: "Boston",          lat: 42.3656, lng: -71.0096,  timeZone: "America/New_York" },
  { code: "MSP", name: "Minneapolis-Saint Paul",    city: "Minneapolis",     lat: 44.8848, lng: -93.2223,  timeZone: "America/Chicago" },
  { code: "DTW", name: "Detroit Metro Wayne Co.",   city: "Detroit",         lat: 42.2124, lng: -83.3534,  timeZone: "America/Detroit" },
  { code: "PHL", name: "Philadelphia Intl",         city: "Philadelphia",    lat: 39.8721, lng: -75.2411,  timeZone: "America/New_York" },
  { code: "LGA", name: "LaGuardia",                 city: "New York",        lat: 40.7772, lng: -73.8726,  timeZone: "America/New_York" },
  { code: "EWR", name: "Newark Liberty Intl",       city: "Newark",          lat: 40.6895, lng: -74.1745,  timeZone: "America/New_York" },
  { code: "FLL", name: "Fort Lauderdale-Hollywood", city: "Fort Lauderdale", lat: 26.0742, lng: -80.1506,  timeZone: "America/New_York" },
  { code: "BWI", name: "Baltimore/Washington",      city: "Baltimore",       lat: 39.1754, lng: -76.6683,  timeZone: "America/New_York" },
  { code: "IAD", name: "Washington Dulles Intl",    city: "Washington DC",   lat: 38.9531, lng: -77.4565,  timeZone: "America/New_York" },
  { code: "DCA", name: "Reagan National",           city: "Washington DC",   lat: 38.8512, lng: -77.0402,  timeZone: "America/New_York" },
  { code: "MDW", name: "Chicago Midway Intl",       city: "Chicago",         lat: 41.7868, lng: -87.7522,  timeZone: "America/Chicago" },
  { code: "SLC", name: "Salt Lake City Intl",       city: "Salt Lake City",  lat: 40.7884, lng: -111.9778, timeZone: "America/Denver" },
  { code: "HOU", name: "William P. Hobby",          city: "Houston",         lat: 29.6454, lng: -95.2789,  timeZone: "America/Chicago" },
  { code: "SAN", name: "San Diego Intl",            city: "San Diego",       lat: 32.7338, lng: -117.1933, timeZone: "America/Los_Angeles" },
  { code: "TPA", name: "Tampa Intl",                city: "Tampa",           lat: 27.9755, lng: -82.5332,  timeZone: "America/New_York" },
  { code: "PDX", name: "Portland Intl",             city: "Portland",        lat: 45.5898, lng: -122.5951, timeZone: "America/Los_Angeles" },
  { code: "STL", name: "St. Louis Lambert Intl",    city: "St. Louis",       lat: 38.7487, lng: -90.37,    timeZone: "America/Chicago" },
  { code: "BNA", name: "Nashville Intl",            city: "Nashville",       lat: 36.1245, lng: -86.6782,  timeZone: "America/Chicago" },
  { code: "AUS", name: "Austin-Bergstrom Intl",     city: "Austin",          lat: 30.1975, lng: -97.6664,  timeZone: "America/Chicago" },
  { code: "MCI", name: "Kansas City Intl",          city: "Kansas City",     lat: 39.2976, lng: -94.7139,  timeZone: "America/Chicago" },
  { code: "OAK", name: "Oakland Intl",              city: "Oakland",         lat: 37.7213, lng: -122.2208, timeZone: "America/Los_Angeles" },
  { code: "RDU", name: "Raleigh-Durham Intl",       city: "Raleigh",         lat: 35.8776, lng: -78.7875,  timeZone: "America/New_York" },
  { code: "SMF", name: "Sacramento Intl",           city: "Sacramento",      lat: 38.6954, lng: -121.5908, timeZone: "America/Los_Angeles" },
  { code: "MSY", name: "Louis Armstrong Intl",      city: "New Orleans",     lat: 29.9934, lng: -90.258,   timeZone: "America/Chicago" },
  { code: "CLE", name: "Cleveland Hopkins Intl",    city: "Cleveland",       lat: 41.4117, lng: -81.8498,  timeZone: "America/New_York" },
  { code: "PIT", name: "Pittsburgh Intl",           city: "Pittsburgh",      lat: 40.4915, lng: -80.2329,  timeZone: "America/New_York" },
  { code: "IND", name: "Indianapolis Intl",         city: "Indianapolis",    lat: 39.7173, lng: -86.2944,  timeZone: "America/Indiana/Indianapolis" },
  { code: "CVG", name: "Cincinnati/N. Kentucky",    city: "Cincinnati",      lat: 39.0488, lng: -84.6678,  timeZone: "America/New_York" },
  { code: "CMH", name: "John Glenn Intl",           city: "Columbus",        lat: 39.998,  lng: -82.8919,  timeZone: "America/New_York" },
  { code: "MEM", name: "Memphis Intl",              city: "Memphis",         lat: 35.0424, lng: -89.9767,  timeZone: "America/Chicago" },
  { code: "MKE", name: "Milwaukee Mitchell Intl",   city: "Milwaukee",       lat: 42.9472, lng: -87.8966,  timeZone: "America/Chicago" },
  { code: "ABQ", name: "Albuquerque Intl Sunport",  city: "Albuquerque",     lat: 35.0402, lng: -106.609,  timeZone: "America/Denver" },
  { code: "OKC", name: "Will Rogers World",         city: "Oklahoma City",   lat: 35.3931, lng: -97.6007,  timeZone: "America/Chicago" },
  { code: "SAT", name: "San Antonio Intl",          city: "San Antonio",     lat: 29.5337, lng: -98.4698,  timeZone: "America/Chicago" },
  { code: "ONT", name: "Ontario Intl",              city: "Ontario",         lat: 34.056,  lng: -117.6012, timeZone: "America/Los_Angeles" },
  { code: "BUR", name: "Hollywood Burbank",         city: "Burbank",         lat: 34.2007, lng: -118.3585, timeZone: "America/Los_Angeles" },
  { code: "SNA", name: "John Wayne",                city: "Orange County",   lat: 33.6762, lng: -117.8674, timeZone: "America/Los_Angeles" },
  { code: "SJC", name: "San Jose Intl",             city: "San Jose",        lat: 37.3626, lng: -121.929,  timeZone: "America/Los_Angeles" },
  { code: "SJU", name: "Luis Muñoz Marín Intl",     city: "San Juan",        lat: 18.4394, lng: -66.0018,  timeZone: "America/Puerto_Rico" },
  { code: "ANC", name: "Ted Stevens Intl",          city: "Anchorage",       lat: 61.1743, lng: -149.996,  timeZone: "America/Anchorage" },
  { code: "HNL", name: "Daniel K. Inouye Intl",     city: "Honolulu",        lat: 21.3187, lng: -157.9224, timeZone: "Pacific/Honolulu" },
  { code: "ELP", name: "El Paso Intl",              city: "El Paso",         lat: 31.8072, lng: -106.3779, timeZone: "America/Denver" },
  { code: "TUL", name: "Tulsa Intl",                city: "Tulsa",           lat: 36.1984, lng: -95.8881,  timeZone: "America/Chicago" },
  { code: "OMA", name: "Eppley Airfield",           city: "Omaha",           lat: 41.3032, lng: -95.8941,  timeZone: "America/Chicago" },
  { code: "GRR", name: "Gerald R. Ford Intl",       city: "Grand Rapids",    lat: 42.8808, lng: -85.5228,  timeZone: "America/Detroit" },
  { code: "BDL", name: "Bradley Intl",              city: "Hartford",        lat: 41.9389, lng: -72.6832,  timeZone: "America/New_York" },
  { code: "ALB", name: "Albany Intl",               city: "Albany",          lat: 42.7483, lng: -73.8017,  timeZone: "America/New_York" },
  { code: "BUF", name: "Buffalo Niagara Intl",      city: "Buffalo",         lat: 42.9405, lng: -78.7322,  timeZone: "America/New_York" },
  { code: "ROC", name: "Greater Rochester Intl",    city: "Rochester",       lat: 43.1189, lng: -77.6724,  timeZone: "America/New_York" },
  { code: "SYR", name: "Syracuse Hancock Intl",     city: "Syracuse",        lat: 43.1112, lng: -76.1063,  timeZone: "America/New_York" },
];

const byCode = new Map(AIRPORTS.map((a) => [a.code, a]));

export function findAirport(code: string | null | undefined): Airport | null {
  if (!code) return null;
  return byCode.get(code.trim().toUpperCase()) ?? null;
}

/** IANA time zone for an IATA code we know, else null. */
export function airportTimeZone(code: string | null | undefined): string | null {
  return findAirport(code)?.timeZone ?? null;
}

/** Common US zones, for manual flight entry when the airport isn't listed. */
export const US_TIME_ZONES: { id: string; label: string }[] = [
  { id: "America/New_York",    label: "Eastern" },
  { id: "America/Chicago",     label: "Central" },
  { id: "America/Denver",      label: "Mountain" },
  { id: "America/Phoenix",     label: "Arizona" },
  { id: "America/Los_Angeles", label: "Pacific" },
  { id: "America/Anchorage",   label: "Alaska" },
  { id: "Pacific/Honolulu",    label: "Hawaii" },
];
