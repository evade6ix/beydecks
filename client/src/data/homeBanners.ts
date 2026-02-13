// File: src/data/homeBanners.ts

export type HomeBanner = {
  id: string
  image: string          // path inside /public
  link: string           // where clicking goes
  external?: boolean     // opens in new tab if true
  title?: string         // optional overlay text
}

export const HOME_BANNERS: HomeBanner[] = [
  {
    id: "precx",
    image: "/banners/cximprve.jpg", // make sure this exists in /public/banners
    link: "https://game3.ca/collections/beyblade-x-all-products",
    external: true,
  },
]