import { useState } from "react"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

export default function AddProduct() {
  const navigate = useNavigate()
  const [title, setTitle] = useState("")
  const [imageUrl, setImageUrl] = useState("") // this will now be base64
  const [description, setDescription] = useState("")
  const [brand, setBrand] = useState("")
  const [productType, setProductType] = useState("")
  const [listings, setListings] = useState([{ storeName: "", buyLink: "", country: "Canada" }])

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
      reader.readAsDataURL(file)
    })
  }

  const handleImageSelect = async (file: File) => {
    try {
      const base64 = await convertToBase64(file)
      setImageUrl(base64)
      toast.success("Image converted to base64!")
    } catch {
      toast.error("Failed to convert image")
    }
  }

  const addProduct = async () => {
    if (!imageUrl) {
      toast.error("Please upload an image")
      return
    }

    const payload = {
      title,
      imageUrl, // this is base64 now
      description,
      brand,
      productType,
      listings
    }

    const res = await fetch(`${API}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })

    if (res.ok) {
      toast.success("Product added!")
      navigate("/shop")
    } else {
      toast.error("Failed to add product")
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Add a New Product</h1>

      <input
        className="input input-bordered w-full"
        placeholder="Product Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />

      <input
  type="file"
  accept="image/*"
  className="file-input file-input-bordered w-full"
  onChange={e => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageSelect(file)
    }
  }}
/>

      {imageUrl && <img src={imageUrl} alt="Preview" className="w-48 mx-auto rounded" />}

      <textarea
        className="textarea textarea-bordered w-full"
        placeholder="Product Description"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />

      <input
        className="input input-bordered w-full"
        placeholder="Brand"
        value={brand}
        onChange={e => setBrand(e.target.value)}
      />

      <input
        className="input input-bordered w-full"
        placeholder="Product Type"
        value={productType}
        onChange={e => setProductType(e.target.value)}
      />

      <h3 className="font-semibold mt-4">Buy Links</h3>
      {listings.map((s, i) => (
        <div key={i} className="grid md:grid-cols-3 gap-2">
          <input
            className="input input-sm"
            placeholder="Store Name"
            value={s.storeName}
            onChange={e => {
              const copy = [...listings]
              copy[i].storeName = e.target.value
              setListings(copy)
            }}
          />
          <input
            className="input input-sm"
            placeholder="Buy Link"
            value={s.buyLink}
            onChange={e => {
              const copy = [...listings]
              copy[i].buyLink = e.target.value
              setListings(copy)
            }}
          />
          <select
            className="select select-sm"
            value={s.country}
            onChange={e => {
              const copy = [...listings]
              copy[i].country = e.target.value
              setListings(copy)
            }}
          >
            <option value="Canada">Canada</option>
            <option value="United States">United States</option>
          </select>
        </div>
      ))}

      <button
        className="btn btn-outline btn-sm"
        onClick={() =>
          setListings([...listings, { storeName: "", buyLink: "", country: "Canada" }])
        }
      >
        + Add Another Store
      </button>

      <div>
        <button className="btn btn-success mt-4" onClick={addProduct}>
          Submit Product
        </button>
      </div>
    </div>
  )
}
