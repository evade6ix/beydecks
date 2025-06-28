import express from "express"
const router = express.Router()

router.get("/sitemap.xml", async (req, res) => {
  const baseUrl = "https://www.metabeys.com"

  // Fetch dynamic data from DB or API
  const events = await fetch(`${baseUrl}/api/events`).then(r => r.json())
  const products = await fetch(`${baseUrl}/api/products`).then(r => r.json())
  const combos = await fetch(`${baseUrl}/api/combos`).then(r => r.json())
  const stores = await fetch(`${baseUrl}/api/stores`).then(r => r.json())

  // Build dynamic <url> entries
  const staticUrls = [
    { loc: "/", priority: 1.0 },
    { loc: "/events", priority: 0.8 },
    { loc: "/shop", priority: 0.8 },
    { loc: "/contact", priority: 0.6 },
  ]

  const dynamicUrls = [
    ...events.map(e => ({ loc: `/events/${e.id}`, priority: 0.7 })),
    ...products.map(p => ({ loc: `/shop/${p.id}`, priority: 0.7 })),
    ...combos.map(c => ({ loc: `/combo/${c.slug}`, priority: 0.6 })),
    ...stores.flatMap(s => ([
      { loc: `/stores/${s.id}`, priority: 0.6 },
      { loc: `/stores/${s.id}/upcoming`, priority: 0.5 }
    ])),
  ]

  const urls = [...staticUrls, ...dynamicUrls]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${baseUrl}${u.loc}</loc><priority>${u.priority}</priority></url>`).join("\n")}
</urlset>`

  res.header("Content-Type", "application/xml")
  res.send(xml)
})

export default router
