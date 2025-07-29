import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

interface NavbarProps {
  isAdmin: boolean
  user: any | null
  loading: boolean
}

export default function Navbar({ isAdmin, user, loading }: NavbarProps) {
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark")
  }

  const logout = () => {
    sessionStorage.removeItem("admin")
    navigate("/")
    window.location.reload()
  }

  const closeMenu = () => setDropdownOpen(false)

  const accountLinkText = loading ? "..." : user?.username || "Account"
  const accountLinkPath = loading ? "#" : user ? "/profile" : "/user-auth"

  return (
    <div className="navbar bg-base-200 px-4 shadow-md">
      <div className="navbar-start">
        <div className="relative lg:hidden">
          <button
            className="btn btn-ghost"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {dropdownOpen && (
            <ul className="absolute left-0 mt-2 z-50 p-4 bg-base-200 rounded-box w-64 space-y-2 shadow-lg">
              <li className="py-2"><Link to="/home" onClick={closeMenu}>Home</Link></li>
              <li className="py-2"><Link to={accountLinkPath} onClick={closeMenu}>{accountLinkText}</Link></li>
              <li className="py-2"><Link to="/Contact" onClick={closeMenu}>Contact</Link></li>
              <li className="py-2"><Link to="/Shop" onClick={closeMenu}>Shop</Link></li>
              <li className="py-2"><Link to="/events" onClick={closeMenu}>Upcoming Events</Link></li>
              <li className="py-2"><Link to="/events/completed" onClick={closeMenu}>Completed Events</Link></li>
              <li className="py-2"><Link to="/stores" onClick={closeMenu}>Store Finder</Link></li>
              <li className="py-2"><Link to="/leaderboard" onClick={closeMenu}>Beyblade Meta</Link></li>
              {isAdmin && (
                <>
                  <li className="py-2"><Link to="/admin" onClick={closeMenu}>Admin</Link></li>
                  <li className="py-2"><button onClick={() => { closeMenu(); logout(); }}>Logout</button></li>
                </>
              )}
            </ul>
          )}
        </div>

        {/* ✅ LOGO + DISCORD ICON */}
        <div className="flex items-center space-x-3 overflow-hidden shrink-0 z-10 relative">
          <Link to="/home">
            <img
              src="/newhoriz.png"
              alt="Meta Beys Logo"
              className="h-12 w-auto max-w-[180px] object-contain"
            />
          </Link>
          <a
            href="https://discord.gg/xmrb4EW739"
            target="_blank"
            rel="noopener noreferrer"
            title="Join our Discord"
          >
            <img
              src="https://i.imgur.com/3NtUyB7.png"
              alt="Discord"
              className="h-6 w-auto flex-shrink-0 hover:scale-105 transition-transform"
            />
          </a>
        </div>
      </div>

      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1 gap-2">
          <li><Link to="/home">Home</Link></li>
          <li><Link to={accountLinkPath}>{accountLinkText}</Link></li>
          <li><Link to="/Contact">Contact</Link></li>
          <li><Link to="/Shop">Shop</Link></li>
          <li><Link to="/events">Upcoming Events</Link></li>
          <li><Link to="/events/completed">Completed Events</Link></li>
          <li><Link to="/stores">Store Finder</Link></li>
          <li><Link to="/leaderboard">Beyblade Meta</Link></li>
          {isAdmin && (
            <>
              <li><Link to="/admin">Admin</Link></li>
              <li><button onClick={logout}>Logout</button></li>
            </>
          )}
        </ul>
      </div>

      <div className="navbar-end">
        <label className="swap swap-rotate ml-2">
          <input type="checkbox" onChange={toggleTheme} />
          <svg className="swap-on fill-current w-6 h-6" viewBox="0 0 24 24">
            <path d="M5.64 17.66..." />
          </svg>
          <svg className="swap-off fill-current w-6 h-6" viewBox="0 0 24 24">
            <path d="M12 4V2..." />
          </svg>
        </label>
      </div>
    </div>
  )
}
