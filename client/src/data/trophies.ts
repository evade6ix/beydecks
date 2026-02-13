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

export const TROPHY_AWARDS: TrophyAward[] = [
  {
    id: "zankyesdog_champion_kwfors1",
    event: "Zankye's Dog",
    date: "2026-01-01",
    placement: "Champion",
    username: "kwfors1",
    image: "/hondatest.png",
    note: "Zankye Basement",
  },

  {
    id: "animenorth2025_champion_nxk",
    event: "Anime North 2025",
    date: "2025-05-01",
    placement: "Champion",
    username: "nxk",
    image: "/animenorth24.webp",
    note: "Anime North",
  },

  {
    id: "banana10k_champion_danielhanick2002",
    event: "Banana $10k Main Event",
    date: "2026-01-01", // update if needed
    placement: "Champion",
    username: "danielhanick2002",
    image: "/money.png",
    note: "Banana $10k Main Event",
  },

  {
    id: "banana10k_finalist_swift",
    event: "Banana $10k Main Event",
    date: "2026-01-01", // same event date
    placement: "Finalist",
    username: "swift",
    image: "/money.png",
    note: "Banana $10k Main Event",
  },
]