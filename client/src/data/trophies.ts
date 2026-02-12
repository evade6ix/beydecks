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
    date: "2025-05-01", // change if you want exact date
    placement: "Champion",
    username: "nxk",
    image: "/animenorth24.webp",
    note: "Anime North",
  },
]
