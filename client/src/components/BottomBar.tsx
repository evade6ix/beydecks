import { FaDiscord, FaCoffee } from "react-icons/fa"

export default function BottomBar() {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-gray-900 text-white py-2 px-4 flex justify-center items-center gap-6 shadow-md z-50">
      <a
        href="https://discord.gg/xmrb4EW739"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 hover:text-indigo-400 transition"
      >
        <FaDiscord size={20} />
        <span>Join our Discord</span>
      </a>

      <a
        href="https://buymeacoffee.com/metabeys"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 hover:text-yellow-400 transition"
      >
        <FaCoffee size={20} />
        <span>Support MetaBeys</span>
      </a>
    </div>
  )
}
