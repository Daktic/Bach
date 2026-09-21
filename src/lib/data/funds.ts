import type { FundingPool } from "~/lib/types";

export const mockFundingPools: FundingPool[] = [
  {
    id: "accommodation",
    title: "Scottsdale House",
    description: "5BR Airbnb in Old Town with a pool, fire pit, and a putting green for all 4 nights.",
    placeholderGradient: "linear-gradient(145deg, #b8824a 0%, #d9a96e 45%, #f0d4a8 100%)",
    targetAmount: 3200,
    currentAmount: 2560,
    myShare: 320,
    myContribution: 320,
  },
  {
    id: "party-bus",
    title: "Party Bus",
    description: "Roundtrip from PHX + wheels on demand all weekend so nobody has to call an Uber.",
    placeholderGradient: "linear-gradient(145deg, #4a3a9e 0%, #7a66d4 45%, #b8abf0 100%)",
    targetAmount: 800,
    currentAmount: 320,
    myShare: 80,
    myContribution: 0,
  },
  {
    id: "golf",
    title: "Golf Day",
    description: "18 holes at TPC Scottsdale — cart, range balls, and the full 19th hole experience.",
    placeholderGradient: "linear-gradient(145deg, #2d6e28 0%, #57a852 45%, #9ed99a 100%)",
    targetAmount: 1500,
    currentAmount: 1500,
    myShare: 150,
    myContribution: 150,
  },
  {
    id: "dinner",
    title: "Steak Night",
    description: "Deposit on the private dining room at Bourbon Steak — Friday night, suits optional.",
    placeholderGradient: "linear-gradient(145deg, #7a2222 0%, #b84a4a 45%, #e09080 100%)",
    targetAmount: 600,
    currentAmount: 360,
    myShare: 60,
    myContribution: 60,
  },
];
