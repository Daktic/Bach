import type { TravelStatus } from "~/lib/status/types";

export interface CrewMember {
  id: string;
  name: string;
  initials: string;
  isMe?: boolean;
  initialStatus: TravelStatus;
}

export const crew: CrewMember[] = [
  { id: "gberg",  name: "Garrett", initials: "GB", isMe: true, initialStatus: "home"    },
  { id: "chris",  name: "Chris",   initials: "CL",              initialStatus: "plane"   },
  { id: "sarah",  name: "Sarah",   initials: "SM",              initialStatus: "plane"   },
  { id: "jake",   name: "Jake",    initials: "JK",              initialStatus: "arrived" },
  { id: "mike",   name: "Mike",    initials: "MR",              initialStatus: "car"     },
  { id: "ryan",   name: "Ryan",    initials: "RD",              initialStatus: "arrived" },
  { id: "tom",    name: "Tom",     initials: "TW",              initialStatus: "home"    },
  { id: "alex",   name: "Alex",    initials: "AC",              initialStatus: "plane"   },
  { id: "jordan", name: "Jordan",  initials: "JN",              initialStatus: "car"     },
  { id: "tyler",  name: "Tyler",   initials: "TP",              initialStatus: "home"    },
];
