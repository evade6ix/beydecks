// src/data/trophies.ts

export type TrophyPlacement =
  | "Champion"
  | "Finalist"
  | "Top 3"
  | "Top Cut"
  | "MVP"
  | "Staff"
  | "Special"

export type TrophyAward = {
  id: string
  event: string
  date?: string // "2026-04-12"
  placement: TrophyPlacement
  username: string // exact match (same as VIP forcing)
  image: string // from /public, e.g. "/trophies/event-slug/champion.png"
  note?: string
}

// Keep adding forever
export const TROPHY_AWARDS: TrophyAward[] = [
  // Example (replace later)
  {
    id: "example_champion_Karl6ix",
    event: "Example Event",
    date: "2026-01-01",
    placement: "Champion",
    username: "kwfors1",
    image: "/hondatest.png",
    note: "Game 3 Oakville",
  },
]
