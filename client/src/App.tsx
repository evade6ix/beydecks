// File: src/App.tsx
import { useEffect, useState, Suspense, lazy } from "react"
import { Routes, Route, useLocation } from "react-router-dom" // <-- added useLocation
import Navbar from "./components/Navbar"
import { useAuth } from "./context/AuthContext"
import ForumThread from "./pages/ForumThread"
import Forum from "./pages/Forum"

// ✅ Lazy load each route
const Home = lazy(() => import("./pages/Home"))
const Events = lazy(() => import("./pages/Events"))
const CompletedEvents = lazy(() => import("./pages/CompletedEvents"))
const EventDetail = lazy(() => import("./pages/EventDetail"))
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"))
const Landing = lazy(() => import("./pages/Landing"))
const ResetPassword = lazy(() => import("./pages/ResetPassword"))
const StoreFinder = lazy(() => import("./pages/Storefinder"))
const TournamentLab = lazy(() => import("./pages/TournamentLab"))
const StoreDetail = lazy(() => import("./pages/StoreDetail"))
const Leaderboard = lazy(() => import("./pages/Leaderboard"))
const MatchupStats = lazy(() => import("./pages/MatchupStats"))
const Admin = lazy(() => import("./pages/Admin"))
const Contact = lazy(() => import("./pages/Contact"))
const UserAuth = lazy(() => import("./pages/UserAuth"))
const MemeGallery = lazy(() => import("./pages/Xj29sDrb"))
const Login = lazy(() => import("./pages/Login"))
const Register = lazy(() => import("./pages/Register"))
const Profile = lazy(() => import("./pages/Profile"))
const UserLogin = lazy(() => import("./pages/UserLogin"))
const BladeDetail = lazy(() => import("./pages/BladeDetail"))
const ComboDetail = lazy(() => import("./pages/ComboDetail"))
const StoreUpcomingEvents = lazy(() => import("./pages/StoreUpcomingEvents"))
const AddProduct = lazy(() => import("./pages/AddProduct"))
const Shop = lazy(() => import("./pages/Shop"))
const ProductDetail = lazy(() => import("./pages/ProductDetail"))
const EditProduct = lazy(() => import("./pages/EditProduct"))
const RatchetDetail = lazy(() => import("./pages/RatchetDetail"))
const BitDetail = lazy(() => import("./pages/BitDetail"))

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false)
  const { user, loading } = useAuth()
  const location = useLocation() // <-- added this

  useEffect(() => {
    const loggedIn = sessionStorage.getItem("admin") === "true"
    setIsAdmin(loggedIn)
    document.documentElement.setAttribute("data-theme", "dark")
  }, [])

  return (
    <>
      {/* ✅ Hide Navbar on landing page */}
      {location.pathname !== "/" && (
        <Navbar isAdmin={isAdmin} user={user} loading={loading} />
      )}

      <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/home" element={<Home />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/completed" element={<CompletedEvents />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/forum" element={<Forum />} />
          <Route path="/forum/:id" element={<ForumThread />} />
          <Route path="/user-auth" element={<UserAuth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/stores" element={<StoreFinder />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/stores/:id" element={<StoreDetail />} />
          <Route path="/blades/:name" element={<BladeDetail />} />
          <Route path="/Xj29sDrb" element={<MemeGallery />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/combo/:slug" element={<ComboDetail />} />
          <Route path="/tournament-lab" element={<TournamentLab />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile/matchup-stats" element={<MatchupStats />} />
          <Route path="/user-login" element={<UserLogin />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/edit-product/:id" element={<EditProduct />} />
          <Route path="/stores/:id/upcoming" element={<StoreUpcomingEvents />} />
          <Route path="/login" element={<Login onLogin={() => setIsAdmin(true)} />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/add-product" element={<AddProduct />} />
          <Route path="/ratchets/:name" element={<RatchetDetail />} />
          <Route path="/bits/:name" element={<BitDetail />} />
          {isAdmin && <Route path="/admin" element={<Admin />} />}
        </Routes>
      </Suspense>
    </>
  )
}
