import { Helmet } from "react-helmet-async"
import { Link } from "react-router-dom"
import { ArrowUpRight, ArrowLeft } from "lucide-react"

export default function GoNextHobbies() {
  return (
    <>
      <Helmet>
        <title>Introducing Go Next Hobbies | MetaBeys</title>
        <meta name="description" content="An online Beyblade store from the people behind MetaBeys. Go Next Hobbies is coming soon to Canada and the USA." />
        <link rel="canonical" href="https://www.metabeys.com/go-next-hobbies" />
        <meta property="og:title" content="Introducing Go Next Hobbies" />
        <meta property="og:description" content="From researching your next combo to finding your next Beyblade. A new store from MetaBeys, coming soon." />
        <meta property="og:url" content="https://www.metabeys.com/go-next-hobbies" />
      </Helmet>
      <main className="min-h-screen bg-[#f5f4f0] text-[#172126] pb-24">
        <div className="mx-auto max-w-6xl px-6 sm:px-10">
          <div className="flex items-center justify-between gap-4 border-b border-[#172126]/15 py-7">
            <Link to="/home" className="inline-flex items-center gap-2 text-sm font-semibold hover:underline"><ArrowLeft size={16} /> MetaBeys</Link>
            <span className="rounded-full border border-[#172126]/20 px-3 py-1 text-xs font-bold uppercase tracking-widest">Coming soon</span>
          </div>
          <section className="grid gap-10 py-16 sm:py-24 lg:grid-cols-[1.4fr_1fr] lg:items-end">
            <div>
              <p className="mb-7 text-xs font-bold uppercase tracking-[0.2em] text-[#456577]">A new chapter from MetaBeys</p>
              <h1 className="text-6xl font-black leading-[0.95] tracking-tight sm:text-8xl">Go Next<span className="block text-[#2465d7]">Hobbies.</span></h1>
              <p className="mt-8 max-w-lg text-xl leading-relaxed">Your next Beyblade starts here.</p>
            </div>
            <div className="max-w-md border-l-2 border-[#2465d7] pl-6">
              <p className="text-lg leading-8">We built MetaBeys to help players understand the game. Now we’re building an online Beyblade store to help you get the products and parts you’re looking for.</p>
              <p className="mt-4 text-sm leading-6 text-[#172126]/65">Go Next Hobbies is still getting ready. The store is not open for orders yet.</p>
            </div>
          </section>
          <section className="border-y border-[#172126]/20 py-10 sm:py-14">
            <div className="grid gap-10 md:grid-cols-2">
              <div><p className="text-xs font-bold uppercase tracking-widest text-[#456577]">The lineup</p><h2 className="mt-4 text-3xl font-bold tracking-tight">Hasbro. Takara Tomy.<br />A proper place for both.</h2></div>
              <div className="space-y-6">
                <p className="leading-7"><strong>Hasbro at MSRP.</strong> Straightforward pricing on the Beyblade X releases you know.</p>
                <p className="leading-7"><strong>Affordable Takara Tomy, with Japan codes.</strong> Japanese releases for players who want more options for their next deck.</p>
              </div>
            </div>
          </section>
          <section className="py-14 sm:py-20">
            <h2 className="text-3xl font-bold tracking-tight">Two storefronts. One community.</h2>
            <p className="mt-3 max-w-xl leading-7 text-[#172126]/70">Here’s what we’re planning for launch in Canada and the United States.</p>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <a href="https://gonexthobbies.ca" target="_blank" rel="noopener noreferrer" className="group flex flex-col border border-[#172126]/20 bg-white p-7 transition hover:border-[#2465d7] sm:p-9">
                <div className="flex justify-between"><h3 className="text-lg font-bold">Canada</h3><ArrowUpRight className="text-[#2465d7] transition group-hover:-translate-y-1 group-hover:translate-x-1" /></div>
                <p className="mt-8 text-4xl font-black tracking-tight">$99 <span className="text-base font-semibold">CAD</span></p>
                <p className="mt-2 leading-6">Free shipping on orders over $99 CAD.</p>
                <p className="mt-8 border-t border-[#172126]/10 pt-5 text-sm font-semibold text-[#2465d7]">gonexthobbies.ca · Coming soon</p>
              </a>
              <a href="https://gonexthobbies.com" target="_blank" rel="noopener noreferrer" className="group flex flex-col border border-[#172126]/20 bg-white p-7 transition hover:border-[#2465d7] sm:p-9">
                <div className="flex justify-between"><h3 className="text-lg font-bold">United States</h3><ArrowUpRight className="text-[#2465d7] transition group-hover:-translate-y-1 group-hover:translate-x-1" /></div>
                <p className="mt-8 text-4xl font-black tracking-tight">$75 <span className="text-base font-semibold">USD</span></p>
                <p className="mt-2 leading-6">Free shipping on orders over $75 USD.</p>
                <p className="mt-2 text-sm font-semibold">No tariffs to the USA.</p>
                <p className="mt-auto pt-8 text-sm font-semibold text-[#2465d7]"><span className="block border-t border-[#172126]/10 pt-5">gonexthobbies.com · Coming soon</span></p>
              </a>
            </div>
            <p className="mt-5 text-sm text-[#172126]/65">Outside Canada and the USA? International shipping is coming soon.</p>
          </section>
          <section className="mb-12 bg-[#172126] p-8 text-white sm:p-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a7c6ff]">For the community that started it</p>
            <div className="mt-5 grid gap-8 md:grid-cols-2">
              <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">MetaBeys members.<br />A little something extra.</h2>
              <div><p className="leading-7 text-white/80">We’re planning exclusive drops, discounts, and more for members of the MetaBeys Discord. Join the community for announcements as we get closer to opening.</p>
                <a href="https://discord.gg/xmrb4EW739" target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex items-center gap-3 border-b border-white pb-2 font-semibold hover:text-[#a7c6ff]">Join the MetaBeys Discord <ArrowUpRight size={18} /></a>
              </div>
            </div>
          </section>
          <div className="flex flex-wrap justify-between gap-4 border-t border-[#172126]/15 py-7 text-sm text-[#172126]/65"><span>Go Next Hobbies · From the people behind MetaBeys</span><span>Launch details to follow.</span></div>
        </div>
      </main>
    </>
  )
}
