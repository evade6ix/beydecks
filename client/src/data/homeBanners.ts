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
    image: "/banners/image.jpg",
    title: "Beyblade X Pre-Orders",
    buttons: [
      {
        label: "Buy Canada",
        link: "https://game3.ca/collections/beyblade-x-all-products",
        external: true,
      },
      {
        label: "Buy USA",
        link: "https://spincityimports.com/collections/beyblade-x-4th-generation",
        external: true,
      },
    ],
  },
]