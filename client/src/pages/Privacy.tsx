import type { ReactNode } from "react"
import { Helmet } from "react-helmet-async"
import { Link } from "react-router-dom"
import {
  ArrowLeft,
  Check,
  Cookie,
  Database,
  Eye,
  FileText,
  Globe2,
  LockKeyhole,
  Mail,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react"

const LAST_UPDATED = "August 20, 2026"
const CONTACT_EMAIL = "info@game3.ca"

const sections = [
  ["scope", "1. Scope"],
  ["collect", "2. Information we collect"],
  ["use", "3. How we use information"],
  ["legal", "4. Consent and legal bases"],
  ["share", "5. How we disclose information"],
  ["public", "6. Public information"],
  ["cookies", "7. Cookies and local storage"],
  ["retention", "8. Retention"],
  ["security", "9. Security"],
  ["rights", "10. Your choices and rights"],
  ["children", "11. Children and young users"],
  ["transfers", "12. International transfers"],
  ["third-parties", "13. Third-party services"],
  ["changes", "14. Changes to this policy"],
  ["contact", "15. Contact us"],
] as const

function PolicySection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-white/10 py-8 last:border-0">
      <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-slate-300 sm:text-base">{children}</div>
    </section>
  )
}

function Bullets({ children }: { children: ReactNode }) {
  return <ul className="space-y-3 pl-1">{children}</ul>
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <Check className="mt-1.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
      <span>{children}</span>
    </li>
  )
}

function SummaryCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-cyan-200">{icon}</div>
        <h2 className="font-semibold text-white">{title}</h2>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{children}</p>
    </div>
  )
}

export default function Privacy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | MetaBeys</title>
        <meta
          name="description"
          content="Learn how MetaBeys collects, uses, stores, and protects account, profile, tournament, event, forum, and technical information."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.metabeys.com/privacy" />
        <meta property="og:title" content="Privacy Policy | MetaBeys" />
        <meta property="og:description" content="How MetaBeys handles and protects your information." />
        <meta property="og:url" content="https://www.metabeys.com/privacy" />
      </Helmet>

      <main className="relative min-h-[100dvh] overflow-hidden bg-slate-950 pb-28 text-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(70%_45%_at_50%_-5%,rgba(79,70,229,0.32),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(45%_35%_at_95%_30%,rgba(34,211,238,0.12),transparent_75%)]" />
          <div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:36px_36px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <Link
            to="/home"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to MetaBeys
          </Link>

          <header className="mt-8 max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Your privacy matters
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">Privacy Policy</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
              This policy explains what information MetaBeys collects, why we use it, when it may be shared,
              and the choices available to you when you use our website, accounts, community tools, and related services.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
              <span>Effective: {LAST_UPDATED}</span>
              <span>Last updated: {LAST_UPDATED}</span>
            </div>
          </header>

          <section aria-label="Privacy summary" className="mt-10 grid gap-4 md:grid-cols-3">
            <SummaryCard icon={<Database className="h-5 w-5" />} title="We collect what powers the platform">
              This includes account details, profile and competitive data, community submissions, and basic technical information.
            </SummaryCard>
            <SummaryCard icon={<Eye className="h-5 w-5" />} title="You control what you publish">
              Profiles, tournament records, forum posts, chat messages, and event submissions may be visible to other users.
            </SummaryCard>
            <SummaryCard icon={<LockKeyhole className="h-5 w-5" />} title="We do not sell personal information">
              We do not sell your personal information or share it for cross-context behavioural advertising.
            </SummaryCard>
          </section>

          <div className="mt-10 grid items-start gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
            <aside className="hidden lg:sticky lg:top-6 lg:block">
              <nav aria-label="Privacy policy sections" className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur-xl">
                <div className="mb-3 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                  <FileText className="h-4 w-4" aria-hidden="true" /> On this page
                </div>
                <ul className="space-y-0.5">
                  {sections.map(([id, label]) => (
                    <li key={id}>
                      <a href={`#${id}`} className="block rounded-lg px-2 py-1.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white">
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            <article className="rounded-3xl border border-white/10 bg-slate-900/70 px-5 backdrop-blur-xl sm:px-8 lg:px-10">
              <PolicySection id="scope" title="1. Scope">
                <p>
                  This Privacy Policy applies to MetaBeys websites and services that link to it, including metabeys.com
                  (collectively, the “Services”). In this policy, “MetaBeys,” “we,” “us,” and “our” refer to the operator of the Services.
                </p>
                <p>
                  This policy does not govern third-party websites, stores, tournament platforms, social networks, or payment services
                  that you may visit through a link on MetaBeys. Those services apply their own privacy policies.
                </p>
              </PolicySection>

              <PolicySection id="collect" title="2. Information we collect">
                <p>Depending on how you use MetaBeys, we may collect the following categories of information:</p>
                <Bullets>
                  <Bullet>
                    <strong className="text-white">Account and authentication information:</strong> username, email address,
                    password in hashed form, account identifiers, authentication tokens, and password-reset information.
                  </Bullet>
                  <Bullet>
                    <strong className="text-white">Profile information:</strong> display name, profile URL or slug, avatar,
                    biography, home store, owned Beyblade parts, VIP or community status, and other details you choose to add.
                  </Bullet>
                  <Bullet>
                    <strong className="text-white">Competitive and event information:</strong> tournament attendance,
                    placements, match results, combinations, notes, statistics, event details, store information, ticket links,
                    images, participant information, and event submissions or corrections.
                  </Bullet>
                  <Bullet>
                    <strong className="text-white">Community content:</strong> forum posts, live-chat messages, uploaded images,
                    usernames displayed with content, timestamps, and reports or moderation records.
                  </Bullet>
                  <Bullet>
                    <strong className="text-white">Communications:</strong> information you include when you email us,
                    contact us through Discord, request support, report an issue, or otherwise communicate with MetaBeys.
                  </Bullet>
                  <Bullet>
                    <strong className="text-white">Technical information:</strong> IP address, browser and device information,
                    operating system, referring pages, pages requested, dates and times, approximate region inferred from an IP address,
                    and security or diagnostic logs generated by our servers and hosting providers.
                  </Bullet>
                  <Bullet>
                    <strong className="text-white">Privacy-focused analytics:</strong> MetaBeys uses Umami Analytics to collect
                    anonymous usage metrics such as page paths and titles, referrers, browser, operating system, device type, screen size,
                    language, general location, and visit timestamps. Umami uses an IP address to derive location and an anonymous session,
                    but states that the IP address itself is not stored.
                  </Bullet>
                </Bullets>
                <p>
                  We collect information directly from you, automatically when you use the Services, from event organizers or stores,
                  and from publicly available tournament or community sources. If you submit information about another person, you are
                  responsible for having permission to provide it.
                </p>
              </PolicySection>

              <PolicySection id="use" title="3. How we use information">
                <p>We may use information to:</p>
                <Bullets>
                  <Bullet>create, authenticate, maintain, and secure user accounts;</Bullet>
                  <Bullet>operate public profiles, leaderboards, tournament records, statistics, matchup tools, forums, and chat;</Bullet>
                  <Bullet>review, publish, correct, and moderate events, results, stores, profiles, and user-generated content;</Bullet>
                  <Bullet>personalize features and remember functional preferences;</Bullet>
                  <Bullet>respond to support requests and communicate about the Services;</Bullet>
                  <Bullet>detect spam, abuse, fraud, security incidents, and violations of our rules;</Bullet>
                  <Bullet>debug, maintain, analyze, and improve performance, accessibility, and reliability; and</Bullet>
                  <Bullet>comply with law, enforce our agreements, and protect MetaBeys, our users, and the public.</Bullet>
                </Bullets>
              </PolicySection>

              <PolicySection id="legal" title="4. Consent and legal bases">
                <p>
                  We process personal information with your consent, to provide Services you request, for legitimate purposes such as
                  operating and securing the platform, and where necessary to meet legal obligations. Where consent is the appropriate
                  basis, you may withdraw it subject to reasonable notice and any legal or contractual restrictions.
                </p>
                <p>
                  Withdrawing consent may prevent us from providing account-based or community features that require the information.
                  We will explain the consequences of withdrawal when they are not obvious.
                </p>
              </PolicySection>

              <PolicySection id="share" title="5. How we disclose information">
                <p>We may disclose information in the following circumstances:</p>
                <Bullets>
                  <Bullet>
                    <strong className="text-white">Public features.</strong> Information you publish through a profile, event,
                    leaderboard, forum, or chat may be visible to anyone and may be indexed or copied by others.
                  </Bullet>
                  <Bullet>
                    <strong className="text-white">Service providers.</strong> Vendors that provide hosting, databases, security,
                    communications, privacy-focused analytics (including Umami Analytics), error monitoring, or other infrastructure may process
                    information for us under appropriate restrictions.
                  </Bullet>
                  <Bullet>
                    <strong className="text-white">Event and store operations.</strong> We may share relevant submissions with stores,
                    organizers, or platform administrators to verify listings, results, and community records.
                  </Bullet>
                  <Bullet>
                    <strong className="text-white">Legal and safety reasons.</strong> We may disclose information when reasonably necessary
                    to comply with law or valid legal process, investigate abuse, enforce rules, or protect rights, safety, and security.
                  </Bullet>
                  <Bullet>
                    <strong className="text-white">Business changes.</strong> Information may be transferred as part of a merger,
                    financing, reorganization, sale of assets, or similar transaction, subject to applicable law.
                  </Bullet>
                  <Bullet>
                    <strong className="text-white">With your direction or consent.</strong> We may disclose information when you ask us to
                    or when we clearly explain the disclosure and obtain permission where required.
                  </Bullet>
                </Bullets>
                <p>MetaBeys does not sell personal information or share it for cross-context behavioural advertising.</p>
              </PolicySection>

              <PolicySection id="public" title="6. Public information and user content">
                <p>
                  MetaBeys is a competitive community platform. Usernames, display names, avatars, bios, home stores, owned parts,
                  tournament history, placements, matchups, statistics, forum posts, chat messages, and submitted event information may be public.
                  Do not publish information you want to keep private.
                </p>
                <p>
                  Removing an account or post may not remove copies previously saved by other people, included in event history,
                  cached by search engines, or retained where required for security, legal compliance, record integrity, or dispute resolution.
                  We will consider reasonable removal and correction requests in context.
                </p>
              </PolicySection>

              <PolicySection id="cookies" title="7. Cookies, local storage, and similar technologies">
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <Cookie className="mt-1 h-5 w-5 shrink-0 text-cyan-200" aria-hidden="true" />
                  <p>
                    MetaBeys uses browser storage for essential functions. For example, authentication tokens and account information may be
                    stored in local storage so you remain signed in, and session storage may be used for temporary administrative sessions.
                  </p>
                </div>
                <p>
                  Our hosting and security providers may use essential cookies or similar technologies and may create standard request logs.
                  Third-party pages or embeds you open, such as Discord, Challonge, retailer links, or Buy Me a Coffee, may use their own cookies.
                </p>
                <p>
                  We use Umami Analytics to understand anonymous website traffic and improve the Services. Umami states that its standard tracker
                  does not use cookies, collect personally identifiable information, fingerprint visitors, or track people across websites.
                  MetaBeys does not use advertising cookies. If we introduce advertising or materially different analytics technologies, we will
                  update this policy and provide consent choices where required.
                </p>
                <p>
                  You can clear MetaBeys local storage through your browser, but doing so may sign you out or reset preferences. You can exclude
                  your browser from Umami analytics on MetaBeys by setting <code className="rounded bg-black/30 px-1.5 py-0.5 text-sm text-cyan-100">umami.disabled</code>
                  to <code className="rounded bg-black/30 px-1.5 py-0.5 text-sm text-cyan-100">1</code> in this site’s local storage.
                </p>
              </PolicySection>

              <PolicySection id="retention" title="8. How long we retain information">
                <p>
                  We keep personal information only as long as reasonably necessary for the purposes described in this policy. Account information
                  is generally retained while an account remains active and for a reasonable period afterward. Public event results and competitive
                  history may be retained longer because they form part of the platform’s historical record.
                </p>
                <p>
                  Retention periods vary based on the type of information, whether it remains necessary to provide the Services, community record
                  integrity, security and abuse prevention, backup cycles, legal requirements, and the establishment or defence of legal claims.
                  When information is no longer required, we delete or anonymize it where reasonably practicable.
                </p>
              </PolicySection>

              <PolicySection id="security" title="9. Security">
                <p>
                  We use reasonable administrative, technical, and organizational safeguards designed to protect personal information. These may
                  include hashed passwords, access controls, encrypted network connections, restricted database access, security headers, monitoring,
                  and backups. No online system is completely secure, and we cannot guarantee absolute security.
                </p>
                <p>
                  Use a unique password, keep your device and authentication information secure, and contact us promptly if you believe your account
                  or information has been compromised.
                </p>
              </PolicySection>

              <PolicySection id="rights" title="10. Your choices and privacy rights">
                <p>Subject to applicable law, you may ask us to:</p>
                <Bullets>
                  <Bullet>confirm whether we hold personal information about you and provide access to it;</Bullet>
                  <Bullet>correct inaccurate or incomplete personal information;</Bullet>
                  <Bullet>delete your account or certain personal information;</Bullet>
                  <Bullet>withdraw consent or object to certain processing;</Bullet>
                  <Bullet>provide information about how we use and disclose your personal information; or</Bullet>
                  <Bullet>review a decision or concern relating to our privacy practices.</Bullet>
                </Bullets>
                <p>
                  Some information can be updated or removed directly from your profile. For other requests, email us using the address below.
                  We may need to verify your identity before completing a request. Rights are not absolute, and we may retain information where
                  permitted or required by law or where necessary to preserve legitimate public event records.
                </p>
                <p>
                  You may also complain to the privacy regulator that applies where you live, including the Office of the Privacy Commissioner of Canada.
                </p>
              </PolicySection>

              <PolicySection id="children" title="11. Children and young users">
                <p>
                  MetaBeys serves a hobby community that may include younger users, but the Services are not intended for anyone who cannot legally
                  consent to the collection and use of their information without a parent or guardian. Where parental or guardian consent is required,
                  a young user should not create an account or submit personal information without that consent.
                </p>
                <p>
                  Parents or guardians who believe a child provided personal information without appropriate consent should contact us. We will review
                  the request and take reasonable steps, including deletion where required by applicable law.
                </p>
              </PolicySection>

              <PolicySection id="transfers" title="12. International data transfers">
                <p>
                  MetaBeys and its service providers may process or store information in Canada, the United States, or other countries. As a result,
                  information may be subject to the laws of the jurisdiction where it is processed and may be accessible to courts, law enforcement,
                  or national-security authorities in accordance with local law. We use reasonable contractual and technical measures where appropriate.
                </p>
              </PolicySection>

              <PolicySection id="third-parties" title="13. Third-party services and links">
                <p>
                  The Services may link to or display content from third parties, including Discord, Challonge, stores and ticket sellers,
                  Buy Me a Coffee, and other event or community services. Purchases and donations completed on third-party sites are processed by
                  those third parties; MetaBeys does not receive full payment-card details from those transactions unless expressly stated at checkout.
                </p>
                <p>
                  We are not responsible for the privacy, security, or content practices of third-party services. Review their terms and privacy
                  policies before providing information to them.
                </p>
              </PolicySection>

              <PolicySection id="changes" title="14. Changes to this policy">
                <p>
                  We may update this Privacy Policy as the Services, our practices, or legal requirements change. We will post the revised version here
                  and update the “Last updated” date. If a change is material, we may provide additional notice through the Services or another reasonable
                  channel. Your continued use after an update is subject to the revised policy, to the extent permitted by law.
                </p>
              </PolicySection>

              <PolicySection id="contact" title="15. Contact us">
                <p>
                  For privacy questions, access or correction requests, account deletion, or complaints, contact the MetaBeys privacy contact at:
                </p>
                <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-50">
                  <div className="font-semibold">MetaBeys Privacy Contact</div>
                  <div className="mt-2">1011 Upper Middle Road East, Unit C15</div>
                  <div>Oakville, Ontario L6H 4L3, Canada</div>
                  <a
                    href={`mailto:${CONTACT_EMAIL}?subject=MetaBeys%20Privacy%20Request`}
                    className="mt-3 inline-flex items-center gap-2 font-semibold text-cyan-100 underline decoration-cyan-200/50 underline-offset-4 hover:text-white"
                  >
                    <Mail className="h-5 w-5" aria-hidden="true" />
                    {CONTACT_EMAIL}
                  </a>
                </div>
                <p>
                  Please use the subject line “MetaBeys Privacy Request” and describe your request. Do not send passwords or sensitive authentication
                  information by email. We will respond within a reasonable period and within any timeline required by applicable law.
                </p>
              </PolicySection>

              <div className="my-8 flex flex-col gap-4 rounded-2xl border border-indigo-300/20 bg-indigo-300/10 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <MessageSquareText className="mt-0.5 h-5 w-5 shrink-0 text-indigo-200" aria-hidden="true" />
                  <div>
                    <div className="font-semibold text-white">Have a privacy question?</div>
                    <div className="mt-1 text-sm text-slate-300">We’ll help you understand or exercise your choices.</div>
                  </div>
                </div>
                <Link to="/contact" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400">
                  Contact MetaBeys
                </Link>
              </div>
            </article>
          </div>

          <footer className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/45 sm:flex-row">
            <div>© {new Date().getFullYear()} MetaBeys. All rights reserved.</div>
            <div className="flex items-center gap-2">
              <Globe2 className="h-4 w-4" aria-hidden="true" />
              <span>Privacy information for the MetaBeys community</span>
            </div>
          </footer>
        </div>
      </main>
    </>
  )
}
