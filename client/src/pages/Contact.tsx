import { motion } from "framer-motion"
import { Helmet } from "react-helmet-async"
import {
  Mail,
  Headset,
  ShieldCheck,
  Building2,
  Clock,
  CheckCircle2,
  ArrowRight,
  Globe,
  Lock,
  LifeBuoy,
  MessageSquare,
  HelpCircle,
  Target,
} from "lucide-react"

// --- Lightweight UI primitives (kept inline so this file is drop-in) ---
function Section({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <section className={`max-w-6xl mx-auto px-4 sm:px-6 ${className}`} {...props} />
}

function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl ${className}`}
      {...props}
    />
  )
}

function Button({ className = "", as: As = "button", ...props }: any) {
  return (
    <As
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 ${className}`}
      {...props}
    />
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
      {children}
    </span>
  )
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-white/10 p-2"><Icon className="h-5 w-5" /></div>
      <div>
        <div className="text-sm text-white/70">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </div>
  )
}

function Divider() {
  return <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
}

function LogoMark({ label = "ACME" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition">
      <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-white/30 to-white/10" />
      <span className="text-sm tracking-wide">{label}</span>
    </div>
  )
}

export default function Contact() {
  const email = "info@game3.ca"
  const discord = "https://discord.com/invite/xmrb4EW739"

  return (
    <>
      <Helmet>
        <title>Contact Meta Beys | Email & Discord Support</title>
        <meta
          name="description"
          content="Contact Meta Beys via email or Discord. Fast daytime responses (≤2 hours). North America coverage for stores, organizers, and communities."
        />
        <meta property="og:title" content="Contact Meta Beys" />
        <meta
          property="og:description"
          content="Join Meta Beys or ask questions. Email & Discord support with fast daytime responses. North America coverage."
        />
        <meta property="og:url" content="https://www.metabeys.com/contact" />
        <meta name="robots" content="index, follow" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Meta Beys',
            url: 'https://www.metabeys.com',
            contactPoint: [
              { '@type': 'ContactPoint', email: 'info@game3.ca', contactType: 'customer support' },
              { '@type': 'ContactPoint', email: 'info@game3.ca', contactType: 'sales' },
            ],
            areaServed: 'North America',
          })}
        </script>
      </Helmet>

      {/* Background */}
      <div className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {/* radial glows */}
          <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-40 right-1/3 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/10 blur-3xl" />
          {/* grid */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        </div>

        {/* HERO */}
        <Section className="pt-20 sm:pt-28">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="mx-auto max-w-3xl text-center">
              <Pill>
                <CheckCircle2 className="h-4 w-4" />
                <span>Beta access for stores — all features free during beta</span>
              </Pill>
              <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
                Contact the Meta Beys team
              </h1>
              <p className="mt-4 text-lg text-white/80">
                Onboard your store, submit events, or ask questions. We respond quickly during the day via email or Discord.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button as="a" href={`mailto:${email}`} className="bg-indigo-600 hover:bg-indigo-500">
                  <Mail className="h-5 w-5" /> Email us
                </Button>
                <Button as="a" href={discord} className="bg-white/10 hover:bg-white/20">
                  <MessageSquare className="h-5 w-5" /> Join our Discord
                </Button>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
                <Stat label="Combos Tracked" value="1500+" icon={Target} />
                <Stat label="Avg. first reply" value="≤ 2 hrs (daytime)" icon={Headset} />
                <Stat label="Coverage" value="North America" icon={Globe} />
                <Stat label="Security" value="HTTPS + JWT" icon={Lock} />
              </div>
            </div>
          </motion.div>
        </Section>

        {/* TRUST BAR */}
        <Section className="mt-16">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-white/60">Trusted by organizers, stores, and communities</p>
              <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
                <LogoMark label="Game 3" />
                <LogoMark label="NRG" />
                <LogoMark label="J00d" />
                <LogoMark label="Mancala Monk" />
              </div>
            </div>
          </div>
        </Section>

        {/* MAIN SECTIONS */}
        <Section className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* For Stores */}
          <Card className="lg:col-span-2">
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Building2 className="h-4 w-4" /> For Stores
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">White-glove onboarding during beta</h2>
                  <p className="mt-2 text-white/80">
                    Get listed in the <strong className="font-semibold">Store Finder</strong>, publish events, and link your
                    products to the <strong className="font-semibold">Shop</strong>. Our team helps migrate data and ensure your first events shine.
                  </p>
                </div>
                <Button as="a" href={`mailto:${email}?subject=Store%20Onboarding`} className="bg-indigo-600 hover:bg-indigo-500 whitespace-nowrap">
                  Get onboarded <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <Divider />

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-base font-semibold">Included (Beta — Free)</h3>
                  <ul className="mt-3 space-y-2 text-sm text-white/80">
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" /> Store Finder profile: logo, description, location, website, Google Maps</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" /> Products eligible for Shop linking & discovery</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" /> Events shown in Upcoming & Completed with rich details</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-base font-semibold">What we’ll need from you</h3>
                  <ul className="mt-3 space-y-2 text-sm text-white/80">
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-indigo-400" /> Upcoming events: Name, date, time, ticket link, capacity</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-indigo-400" /> Completed events: turnout, Top Cut, decklists per top cut player</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-indigo-400" /> Decklist example: <em>Phoenix Wing 5-60 Point</em> (+ other combos)</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Stat label="Priority onboarding" value="< 48 hrs" icon={ArrowRight} />
                <Stat label="Coverage" value="North America" icon={Globe} />
                <Stat label="Support channels" value="Email & Discord" icon={Headset} />
              </div>
            </div>
          </Card>

          {/* Quick Contacts */}
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold">Quick contacts</h3>
                <div className="mt-4 grid grid-cols-1 gap-3">
                  <Button as="a" href={`mailto:${email}?subject=Hello%20Meta%20Beys`} className="bg-white/10 hover:bg-white/20 justify-between">
                    <span className="flex items-center gap-2"><Mail className="h-5 w-5" /> Email: {email}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button as="a" href={discord} className="bg-white/10 hover:bg-white/20 justify-between">
                    <span className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Join our Discord</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold">Support availability</h3>
                <div className="mt-4 space-y-3 text-sm text-white/80">
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> Support via email</div>
                  <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Support via Discord</div>
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> Typical first reply: ≤ 2 hours (daytime)</div>
                  <div className="flex items-center gap-2"><LifeBuoy className="h-4 w-4" /> No overnight responses</div>
                </div>
              </div>
            </Card>
          </div>
        </Section>

        {/* SECURITY */}
        <Section className="mt-10">
          <Card>
            <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-3 sm:p-8">
              <div>
                <div className="flex items-center gap-2 text-sm text-white/70"><ShieldCheck className="h-4 w-4" /> Security</div>
                <h3 className="mt-2 text-xl font-semibold"> Safe & Secure for Every Player</h3>
                <p className="mt-2 text-white/80 text-sm">
                  We protect your data with encrypted connections, secure authentication, and strict access controls - ensuring your information stays safe at all times.
                </p>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">HTTPS everywhere</div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">Secure JWT-based sessions</div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">Salted & hashed passwords</div>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">Least-privilege database access</div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">Regular backups</div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">Access logging</div>
              </div>
            </div>
          </Card>
        </Section>

        {/* FAQ */}
        <Section className="mt-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <h3 className="text-2xl font-semibold">Frequently asked</h3>
              <p className="mt-2 text-white/80">A few quick answers while you wait on our reply.</p>
            </div>
            <div className="lg:col-span-2 space-y-3">
              {[
                {
                  q: "How long does store onboarding take?",
                  a: "Most stores go live within 24–48 hours during beta. We help format your first events and listings.",
                },
                {
                  q: "Do you charge during beta?",
                  a: "No. All features are free during beta for participating stores.",
                },
                {
                  q: "What data do you need for event results?",
                  a: "Total turnout, Top Cut list, and decklists per top-cut player. If you have sheets, we can import them.",
                },
                {
                  q: "Do you support regions outside North America?",
                  a: "Not yet. We currently focus on North America.",
                },
              ].map((item, i) => (
                <Card key={i}>
                  <details className="group">
                    <summary className="cursor-pointer list-none p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2 text-left text-base font-medium">
                          <HelpCircle className="h-5 w-5 text-white/70" /> {item.q}
                        </div>
                        <ArrowRight className="h-4 w-4 transition group-open:rotate-90" />
                      </div>
                    </summary>
                    <Divider />
                    <div className="p-4 pt-0 sm:p-5 sm:pt-0 text-white/80">{item.a}</div>
                  </details>
                </Card>
              ))}
            </div>
          </div>
        </Section>

        {/* FINAL CTA */}
        <Section className="my-16">
          <Card className="overflow-hidden">
            <div className="relative">
              <div className="absolute right-0 top-0 -z-10 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />
              <div className="p-6 sm:p-8 lg:p-10">
                <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
                  <div>
                    <h3 className="text-2xl font-semibold">Ready to join Meta Beys?</h3>
                    <p className="mt-2 max-w-2xl text-white/80">
                      Send us your first event or product feed — we’ll get you live and share best practices from the community.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button as="a" href={`mailto:${email}?subject=Get%20Started`} className="bg-indigo-600 hover:bg-indigo-500">
                      Get started <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Section>

        <footer className="pb-16 pt-8 text-center text-xs text-white/50">© {new Date().getFullYear()} Meta Beys. All rights reserved.</footer>
      </div>
    </>
  )
}
