import { Helmet } from "react-helmet-async"

export default function Landing() {
  return (
    <>
      <Helmet>
        <title>MetaBeys — Under Construction</title>
        <meta
          name="description"
          content="MetaBeys is currently under construction and will be live again soon."
        />
        <meta name="theme-color" content="#0b0d12" />
        <meta property="og:title" content="MetaBeys — Under Construction" />
        <meta
          property="og:description"
          content="MetaBeys is currently under construction and will be live again soon."
        />
        <meta property="og:url" content="https://www.metabeys.com/" />
        <meta name="twitter:card" content="summary" />
      </Helmet>

      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0d12] px-6 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(91,98,244,0.28),transparent_34%),radial-gradient(circle_at_80%_70%,rgba(0,194,255,0.18),transparent_32%)]"
        />

        <section className="relative z-10 mx-auto w-full max-w-3xl text-center">
          <img
            src="/logolargestsolo.png"
            alt="MetaBeys"
            className="mx-auto mb-8 w-36 max-w-[42vw] object-contain"
          />

          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white/65">
            Site Update
          </div>

          <h1 className="text-balance text-5xl font-black tracking-[-0.055em] sm:text-6xl md:text-7xl">
            MetaBeys is under construction.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/65 sm:text-xl">
            We&apos;re making some changes behind the scenes. MetaBeys will be live again soon.
          </p>

          <div className="mx-auto mt-10 h-px w-24 bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-white/35">
            Thank you for your patience
          </p>
        </section>
      </main>
    </>
  )
}
