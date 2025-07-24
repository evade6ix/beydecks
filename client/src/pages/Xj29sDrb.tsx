import { useEffect, useState } from "react"

export default function MemeGallery() {
  const [images, setImages] = useState<string[]>([])
  const [password, setPassword] = useState("")
  const [accessGranted, setAccessGranted] = useState(false)

  const correctPassword = "letmein123" // ✅ change this to whatever you want

  useEffect(() => {
    if (accessGranted) {
      const memeImages = [
        "meme1.jpg",
        "meme2.png",
        "meme3.png",
        "meme4.png",
        "meme5.png",
        "meme6.jpg",
        "meme7.jpg",
        "meme8.png",
        "meme9.jpg",
        "meme10.png"
      ]
      setImages(memeImages)
    }
  }, [accessGranted])

  if (!accessGranted) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Enter Password</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={{ padding: "0.5rem", fontSize: "1rem", marginRight: "0.5rem" }}
        />
        <button
          onClick={() => {
            if (password === correctPassword) setAccessGranted(true)
            else alert("Wrong password")
          }}
          style={{ padding: "0.5rem 1rem", fontSize: "1rem", cursor: "pointer" }}
        >
          Submit
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Secret Meme Dump</h1>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "1rem"
      }}>
        {images.map((img, idx) => (
          <img
            key={idx}
            src={`/memes/${img}`}
            alt={`meme-${idx}`}
            style={{
              width: "100%",
              borderRadius: "8px",
              boxShadow: "0 0 10px rgba(0,0,0,0.2)"
            }}
          />
        ))}
      </div>
    </div>
  )
}
