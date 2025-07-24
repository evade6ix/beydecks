import { motion } from "framer-motion"
import { Helmet } from "react-helmet-async"

export default function Contact() {
  return (
    <>
      <Helmet>
        <title>Contact Meta Beys | Get in Touch</title>
        <meta
          name="description"
          content="Reach out to Meta Beys for store onboarding, event submissions, or general questions. We're here to help the Beyblade community grow."
        />
        <meta property="og:title" content="Contact Meta Beys" />
        <meta
          property="og:description"
          content="Join the Meta Beys platform or ask questions. Get in touch via email and learn how stores can participate."
        />
        <meta property="og:url" content="https://www.metabeys.com/contact" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <motion.div
        className="p-6 max-w-4xl mx-auto space-y-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Contact Meta Beys</h1>
          <p className="text-base text-neutral-content">
            Have questions, or looking to join the Meta Beys platform? We're here to help.
          </p>
        </div>

        {/* Stores Section */}
        <div className="bg-base-200 p-6 rounded-lg shadow space-y-4 border border-neutral">
          <h2 className="text-2xl font-semibold">For Stores</h2>
          <p className="text-base leading-relaxed">
            MetaBeys is currently in its beta phase, and we’re actively onboarding stores to help shape the platform. All features are included for free during beta.
          </p>

          <div className="bg-base-100 p-4 rounded border border-neutral space-y-2">
            <h3 className="text-xl font-semibold text-white">Free Plan (Beta Access)</h3>
            <p>
              - Your store will be listed in the <strong>Store Finder</strong> with support for: logo, event listings, description, location, Google Maps, and a website link.
              <br />
              - Your products will be eligible to appear in the <strong>Shop</strong> section (linked to matching items).
              <br />
              - Events will be shown in both <strong>Upcoming</strong> and <strong>Completed Events</strong> sections.
            </p>
            <p className="mt-2">
              You (or a representative) will be responsible for submitting:
            </p>
            <ul className="list-disc pl-6 text-sm">
              <li>Event Name, Date, Time, Buy Link, and Capacity (for upcoming events)</li>
              <li>Total turnout, Top Cut list, and Decklists per top cut player (for completed events)</li>
            </ul>
            <p className="text-sm italic">
              Decklist example: <br />
              Phoenix Wing 5-60 Point (and any other combos used by that player)
            </p>
          </div>

          <p className="mt-4 text-center text-base">
            Email us at{" "}
            <a href="mailto:info@game3.ca" className="link link-hover text-white">
              info@game3.ca
            </a>{" "}
            to get onboarded.
          </p>
        </div>

        {/* Non-Stores Section */}
        <div className="bg-base-200 p-6 rounded-lg shadow border border-neutral space-y-4">
          <h2 className="text-2xl font-semibold">General Inquiries</h2>
          <p className="text-base leading-relaxed">
            If you are a player, fan, or community organizer with questions or concerns, we’d love to hear from you.
          </p>
          <p className="text-base text-center">
            Reach out to{" "}
            <a href="mailto:info@game3.ca" className="link link-hover text-white">
              info@game3.ca
            </a>
          </p>
        </div>
      </motion.div>
    </>
  )
}
