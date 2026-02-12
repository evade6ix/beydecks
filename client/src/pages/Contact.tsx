import { motion } from "framer-motion"
import { Helmet } from "react-helmet-async"
import {
  Mail,
  MessageSquare,
  MapPin,
  Clock,
  ArrowUpRight,
  Ticket,
  Store,
  Megaphone,
  Shield,
} from "lucide-react"

function Section({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <section className={`max-w-6xl mx-auto px-4 sm:px-6 ${className}`} {...props} />
}

function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md ${className}`}
      {...props}
    />
  )
}

function Button({ className = "", as: As = "a", ...props }: any) {
  return (
    <As
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold transition
      focus:outline-none focus:ring-2 focus:ring-indigo-500/60 ${className}`}
      {...props}
    />
  )
}

function Chip({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
      <Icon className="h-4 w-4 text-white/70" />
      {children}
    </div>
  )
}

function Note({
  title,
  desc,
  icon: Icon,
  href,
  cta,
}: {
  title: string
  desc: string
  icon: any
  href: string
  cta: string
}) {
  return (
    <motion.a
      href={href}
      className="group block rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10"
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2">
            <Icon className="h-5 w-5 text-white/80" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold">{title}</div>
            <div className="mt-1 text-sm text-white/70">{desc}</div>
          </div>
        </div>
        <ArrowUpRight className="h-5 w-5 text-white/40 transition group-hover:text-white/80" />
      </div>

      <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-300">
        {cta}
        <span className="opacity-60">→</span>
      </div>
    </motion.a>
  )
}

export default function Contact() {
  const email = "info@game3.ca"
  const discord = "https://discord.com/invite/xmrb4EW739"

  return (
    <>
      <Helmet>
        <title>Contact MetaBeys</title>
        <meta
          name="description"
          content="Contact MetaBeys via email or Discord. Stores can onboard, organizers can submit events, and players can get help."
        />
        <meta property="og:title" content="Contact MetaBeys" />
        <meta
          property="og:description"
          content="Email or Discord support for stores, organizers, and players."
        />
        <meta property="og:url" content="https://www.metabeys.com/contact" />
        <meta name="robots" content="index, follow" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "MetaBeys",
            url: "https://www.metabeys.com",
            contactPoint: [
              { "@type": "ContactPoint", email, contactType: "customer support" },
              { "@type": "ContactPoint", email, contactType: "sales" },
            ],
            areaServed: "North America",
          })}
        </script>
      </Helmet>

      <div className="relative min-h-[100dvh] bg-slate-950 text-white">
        {/* New background vibe: poster paper + tape + subtle noise */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_20%,rgba(99,102,241,0.25),transparent_65%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(50%_50%_at_80%_80%,rgba(236,72,153,0.14),transparent_65%)]" />
          <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:22px_22px]" />
        </div>

        <Section className="pt-16 sm:pt-20 pb-14">
          {/* Header block (not SaaS hero) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="grid grid-cols-1 lg:grid-cols-5 gap-6"
          >
            {/* Left: "poster" */}
            <div className="lg:col-span-3">
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
                {/* tape corners */}
                <div className="absolute -left-6 top-6 h-10 w-24 rotate-[-18deg] rounded-lg bg-white/10 blur-[0.2px]" />
                <div className="absolute -right-6 top-10 h-10 w-24 rotate-[14deg] rounded-lg bg-white/10 blur-[0.2px]" />

                <div className="flex flex-wrap gap-2">
                  <Chip icon={MapPin}>North America</Chip>
                  <Chip icon={Clock}>Daytime replies</Chip>
                  <Chip icon={Shield}>No spam — no forms</Chip>
                </div>

                <h1 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight">
                  Contact MetaBeys
                </h1>
                <p className="mt-3 text-base sm:text-lg text-white/75 max-w-2xl">
                  Stores, organizers, players — if you’re trying to get an event up, fix something,
                  or get listed properly, hit us directly.
                </p>

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Button
                    as="a"
                    href={`mailto:${email}?subject=MetaBeys%20Support`}
                    className="bg-indigo-600 hover:bg-indigo-500"
                  >
                    <Mail className="h-5 w-5" />
                    Email us
                  </Button>

                  <Button
                    as="a"
                    href={discord}
                    className="bg-white/10 hover:bg-white/20"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageSquare className="h-5 w-5" />
                    Join Discord
                  </Button>
                </div>

                <div className="mt-5 text-sm text-white/60">
                  Email: <span className="text-white/80">{email}</span>
                  <span className="mx-2 text-white/30">•</span>
=                </div>
              </div>
            </div>

            {/* Right: Bulletin "what to message us for" */}
            <div className="lg:col-span-2 space-y-3">
              <Note
                icon={Store}
                title="Store onboarding / edits"
                desc="Get listed, update your store page, fix location, links, logos, or sponsored placements."
                href={`mailto:${email}?subject=Store%20Onboarding%20/%20Edits`}
                cta="Email: Store request"
              />
              <Note
                icon={Ticket}
                title="Event submission / corrections"
                desc="Submit upcoming events or correct past results (attendance, top cut, placements, etc.)."
                href={`mailto:${email}?subject=Event%20Submission%20/%20Correction`}
                cta="Email: Event request"
              />
              <Note
                icon={Megaphone}
                title="General help"
                desc="Account issues, profile problems, trophies, or anything that looks broken."
                href={discord}
                cta="Discord: Ask in support"
              />
            </div>
          </motion.div>

          {/* Lower: simple split cards, not “SaaS sections” */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 sm:p-7">
              <div className="text-sm font-semibold mb-2">If you’re a store</div>
              <div className="text-white/75 text-sm leading-relaxed">
                Include your <span className="text-white/90 font-semibold">store name</span>,{" "}
                <span className="text-white/90 font-semibold">city</span>, and your{" "}
                <span className="text-white/90 font-semibold">website</span>. If you have events in a sheet,
                attach it — we can import.
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                <div className="font-semibold text-white/80 mb-2">Copy/paste template</div>
                <div className="space-y-1">
                  <div>Store name:</div>
                  <div>City / Province/State:</div>
                  <div>Website:</div>
                  <div>Ticket link (optional):</div>
                </div>
              </div>
            </Card>

            <Card className="p-6 sm:p-7">
              <div className="text-sm font-semibold mb-2">If you’re submitting results</div>
              <div className="text-white/75 text-sm leading-relaxed">
                Send the <span className="text-white/90 font-semibold">event link</span> (or store/date),
                total players, and placements. If you have top cut combos, include them — even rough is fine.
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                <div className="font-semibold text-white/80 mb-2">What we need</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Event name + date</li>
                  <li>Total players</li>
                  <li>Placements (Top 3 / Top Cut)</li>
                  <li>Top cut combos (optional)</li>
                </ul>
              </div>
            </Card>
          </div>

          <div className="mt-10 text-center text-xs text-white/45">
            © {new Date().getFullYear()} MetaBeys
          </div>
        </Section>
      </div>
    </>
  )
}
