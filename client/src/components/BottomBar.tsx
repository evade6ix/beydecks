import { Link } from "react-router-dom"
import { ShieldCheck } from "lucide-react"
import { FaDiscord, FaCoffee } from "react-icons/fa"

export default function BottomBar() {
  return (
    <div className="fixed bottom-0 left-0 z-50 flex w-full flex-wrap items-center justify-center gap-x-5 gap-y-1 border-t border-white/10 bg-gray-900/95 px-4 py-2 text-sm text-white shadow-md backdrop-blur-md sm:gap-x-7">
      <a
        href="https://discord.gg/xmrb4EW739"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 transition hover:text-indigo-400"
      >
        <FaDiscord size={20} />
        <span>Join our Discord</span>
      </a>

      <a
        href="https://buymeacoffee.com/metabeys"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 transition hover:text-yellow-400"
      >
        <FaCoffee size={20} />
        <span>Support MetaBeys</span>
      </a>

      <Link to="/privacy" className="flex items-center gap-2 text-white/75 transition hover:text-cyan-300">
        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        <span>Privacy</span>
      </Link>
    </div>
  )
}
