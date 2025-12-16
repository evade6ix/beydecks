// src/main.tsx
import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import { BrowserRouter } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import { HelmetProvider } from "react-helmet-async"
import { Toaster } from "react-hot-toast"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <App />

          {/* ✅ Global toast container */}
          <Toaster
            position="top-center"
            containerStyle={{ top: 80 }} // avoids navbar overlap
            toastOptions={{
              duration: 4000,
              style: {
                background: "#111827",
                color: "#ffffff",
                borderRadius: "12px",
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
)
