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

  {
    id: "g3anqualifier_champion_takedojcob",
    event: "G3 AN Qualifier",
    placement: "Champion",
    username: "takedojcob",
    image: "/g3anquali.jpg",
    note: "G3 AN Qualifier",
  },

  {
    id: "g3anqualifier_finalist_artizan",
    event: "G3 AN Qualifier",
    placement: "Finalist",
    username: "artizan",
    image: "/g3anquali.jpg",
    note: "G3 AN Qualifier",
  },

  {
    id: "g3anqualifier_topcut_jayjay",
    event: "G3 AN Qualifier",
    placement: "Top Cut",
    username: "jayjay",
    image: "/g3anquali.jpg",
    note: "G3 AN Qualifier",
  },
]