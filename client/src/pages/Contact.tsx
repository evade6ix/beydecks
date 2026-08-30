import { Helmet } from "react-helmet-async"
import { Mail, MessageSquare, ArrowUpRight } from "lucide-react"

export default function Contact() {
  const email = "info@game3.ca"
  const discord = "https://discord.com/invite/xmrb4EW739"

  return (
    <>
      <Helmet>
        <title>Contact MetaBeys</title>
        <meta
          name="description"
          content="Contact MetaBeys by email or Discord for store listings, event submissions, corrections, or general support."
        />
        <meta property="og:title" content="Contact MetaBeys" />
        <meta
          property="og:description"
          content="Get in touch with MetaBeys by email or Discord."
        />
        <meta property="og:url" content="https://www.metabeys.com/contact" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <main className="min-h-[calc(100vh-4rem)] bg-[#fbfbf8] px-5 py-16 text-[#121316] sm:px-8 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="border-b border-black/10 pb-10">
            <h1 className="text-4xl font-black tracking-[-0.045em] sm:text-5xl">
              Contact MetaBeys
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-black/60 sm:text-lg">
              Need help with a store listing, tournament result, account, or something on the site? Send us a message.
            </p>
          </div>

          <div className="divide-y divide-black/10">
            <a
              href={`mailto:${email}?subject=MetaBeys%20Support`}
              className="group flex items-center justify-between gap-6 py-7"
            >
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white">
                  <Mail className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="font-bold">Email</div>
                  <div className="mt-1 truncate text-sm text-black/55 sm:text-base">{email}</div>
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 shrink-0 text-black/35 transition group-hover:text-black" />
            </a>

            <a
              href={discord}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between gap-6 py-7"
            >
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white">
                  <MessageSquare className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-bold">Discord</div>
                  <div className="mt-1 text-sm text-black/55 sm:text-base">Chat with the MetaBeys community</div>
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 shrink-0 text-black/35 transition group-hover:text-black" />
            </a>
          </div>

          <div className="mt-10 rounded-2xl border border-black/10 bg-white p-6 sm:p-7">
            <h2 className="text-lg font-bold">Stores & tournament organizers</h2>
            <p className="mt-2 text-sm leading-6 text-black/55 sm:text-base sm:leading-7">
              For store listings or event submissions, include the store or event name, location, date, and any relevant links. For result corrections, include the event link and the information that needs to be updated.
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
