// File: src/data/homeBanners.ts

export type BannerButton = {
  label: string
  link?: string
  external?: boolean
  disabled?: boolean
}

export type HomeBanner = {
  id: string
  image: string
  title?: string
  buttons?: BannerButton[]
}

export const HOME_BANNERS: HomeBanner[] = [
  {
    id: "precx",
    image: "/banners/evangelion.png",
    title: "Beyblade X Pre-Orders",
    buttons: [
      {
        label: "Buy Canada",
        link: "https://game3.ca/products/beyblade-x-cx-00-evangelion-deck-set",
        external: true,
      },
    ],
  },
]