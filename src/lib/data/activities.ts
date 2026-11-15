import "server-only";
import type { Activity } from "~/lib/types";

// The itinerary, hand-edited (TL-8). Times are Arizona wall times ("HH:MM").
// `location` powers the "Open in Maps" link (TL-4); `poolId` links an activity
// to the funding pool that pays for it (TL-5). `image` is the square art on
// the timeline card: public-domain vintage posters and prints from Wikimedia
// Commons, linked rather than copied (credits next to each).

export const activityData: Activity[] = [
  // Thursday Apr 8 — Arrival
  {
    id: "thu-arrival",
    // "Greetings from Phoenix, Arizona" large-letter postcard, Curt Teich & Co., 1939 (Newberry Library, Curt Teich Postcard Archives). Public domain, via Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Untitled_-_Large_Letters_(NBY_10382).jpg
    image: "https://upload.wikimedia.org/wikipedia/commons/3/34/Untitled_-_Large_Letters_%28NBY_10382%29.jpg",
    day: "2027-04-08",
    title: "Arrive & Check In",
    description: "Flights land, grab the keys to the Airbnb, and get settled in.",
    startTime: "15:00",
    // Add the Dos Palms address here once booked (Airbnb shares it after booking).
    poolId: "accommodation",
  },
  {
    id: "thu-welcome",
    // Pan Am Clipper poster. Public domain, via Wikimedia Commons: https://commons.wikimedia.org/wiki/File:PanAm_Clipper_Poster_(19291812519).jpg
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/PanAm_Clipper_Poster_%2819291812519%29.jpg/960px-PanAm_Clipper_Poster_%2819291812519%29.jpg",
    day: "2027-04-08",
    title: "Welcome Drinks",
    description: "First round together. The trip starts here.",
    startTime: "19:00",
  },

  // Friday Apr 9
  {
    id: "fri-secret",
    // "Giant Cactus" linen postcard, Newberry Library (NBY 21853): https://commons.wikimedia.org/wiki/File:Giant_Cactus_(NBY_21853).jpg. Public domain, via Wikimedia Commons
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/69/Giant_Cactus_%28NBY_21853%29.jpg/500px-Giant_Cactus_%28NBY_21853%29.jpg",
    day: "2027-04-09",
    title: "Secret Activity",
    description: "The whole day is planned. Details stay secret until Friday morning.",
    startTime: "07:00",
    endTime: "17:00",
  },
  {
    id: "fri-dinner",
    // Hiroshige woodblock print, Bowl of Sushi. Public domain, via Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Hiroshige_Bowl_of_Sushi.jpg
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/Hiroshige_Bowl_of_Sushi.jpg/960px-Hiroshige_Bowl_of_Sushi.jpg",
    day: "2027-04-09",
    title: "Omakase Night",
    description: "Private dining at Roka Akor for the whole crew. Food, drinks, tax and tip are covered by the Omakase Night pool.",
    startTime: "19:00",
    location: "Roka Akor, Scottsdale, AZ",
    poolId: "omakase",
  },

  // Saturday Apr 10
  {
    id: "sat-golf",
    // Golf de la Soukra poster by Roger Broders. Public domain, via Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Golf_de_la_Soukra,_Tunis._P._L._M._F%C3%A9d%C3%A9ration_des_syndicats_d%27initiative_de_Tunisie_-_affiche_-_Roger_Broders_-_btv1b90039522.jpg
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8b/Golf_de_la_Soukra%2C_Tunis._P._L._M._F%C3%A9d%C3%A9ration_des_syndicats_d%27initiative_de_Tunisie_-_affiche_-_Roger_Broders_-_btv1b90039522.jpg/960px-Golf_de_la_Soukra%2C_Tunis._P._L._M._F%C3%A9d%C3%A9ration_des_syndicats_d%27initiative_de_Tunisie_-_affiche_-_Roger_Broders_-_btv1b90039522.jpg",
    day: "2027-04-10",
    title: "Golf Day",
    description: "Two groups, two courses: Cholla at We-Ko-Pa or Desert Canyon Golf Club. The party bus drops everyone off; after your round, meet at the We-Ko-Pa Casino Resort for the bus home.",
    startTime: "08:00",
    poolId: "golf",
  },
  {
    id: "sat-night",
    // WPA Variety Theatre vaudeville poster. Public domain, via Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Federal_WPA_Variety_Theatre_presents_vaudeville_LCCN98516047.jpg
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b0/Federal_WPA_Variety_Theatre_presents_vaudeville_LCCN98516047.jpg/960px-Federal_WPA_Variety_Theatre_presents_vaudeville_LCCN98516047.jpg",
    day: "2027-04-10",
    title: "Old Town Scottsdale",
    description: "Night out in Old Town. The party bus picks everyone up from the house.",
    startTime: "21:00",
    location: "Old Town Scottsdale, AZ",
    poolId: "party-bus",
  },

  // Sunday Apr 11
  {
    id: "sun-pool",
    // WPA "Swim for health" poster. Public domain, via Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Swim_for_health_in_safe_and_pure_pools_LCCN98518824.jpg
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/Swim_for_health_in_safe_and_pure_pools_LCCN98518824.jpg/960px-Swim_for_health_in_safe_and_pure_pools_LCCN98518824.jpg",
    day: "2027-04-11",
    title: "Recovery Day",
    description: "Pool, food, good vibes.",
    startTime: "10:00",
  },
  {
    id: "sun-dinner",
    // "Hip, Hip, Hurrah!" by P. S. Krøyer, 1888: friends toasting at a long table. Public domain, via Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Hipp_hipp_hurra!_Konstn%C3%A4rsfest_p%C3%A5_Skagen_-_Peder_Severin_Kr%C3%B8yer.jpg
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/28/Hipp_hipp_hurra%21_Konstn%C3%A4rsfest_p%C3%A5_Skagen_-_Peder_Severin_Kr%C3%B8yer.jpg/960px-Hipp_hipp_hurra%21_Konstn%C3%A4rsfest_p%C3%A5_Skagen_-_Peder_Severin_Kr%C3%B8yer.jpg",
    day: "2027-04-11",
    title: "Last Supper",
    description: "One long table, good food and the whole crew. Raise a glass to the groom and swap the best stories of the weekend before everyone heads home.",
    startTime: "19:00",
  },

  // Monday Apr 12 — Departure
  {
    id: "mon-checkout",
    // Jokake Inn, Phoenix, linen postcard, Newberry Library (NBY 3049): https://commons.wikimedia.org/wiki/File:Jokake_Inn_(NBY_3049).jpg. Public domain, via Wikimedia Commons
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ee/Jokake_Inn_%28NBY_3049%29.jpg/960px-Jokake_Inn_%28NBY_3049%29.jpg",
    day: "2027-04-12",
    title: "Check Out & Depart",
    description: "Pack up, clean up, say the goodbyes.",
    startTime: "11:00",
  },
];
