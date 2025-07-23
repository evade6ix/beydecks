import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"

const API = import.meta.env.VITE_API_URL || "http://localhost:3000"

interface Listing {
  storeName: string
  buyLink: string
  country: string
}

export default function EditProduct() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [description, setDescription] = useState("")
  const [brand, setBrand] = useState("")
  const [productType, setProductType] = useState("")
  const [listings, setListings] = useState<Listing[]>([])

  useEffect(() => {
    fetch(`${API}/products/${id}`)
      .then(res => res.json())
      .then(product => {
        setTitle(product.title)
        setImageUrl(product.imageUrl)
        setDescription(product.description)
        setBrand(product.brand || "")
        setProductType(product.productType || "")
        setListings(product.listings || [])
      })
      .catch(() => alert("Failed to load product."))
  }, [id])

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
      reader.readAsDataURL(file)
    })
  }

  const updateProduct = async () => {
    const updated = { title, imageUrl, description, brand, productType, listings }
    const res = await fetch(`${API}/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    })
    if (res.ok) {
      navigate("/shop")
    } else {
      alert("Failed to update product.")
    }
  }

  const updateListing = (index: number, field: keyof Listing, value: string) => {
    const updated = [...listings]
    updated[index][field] = value
    setListings(updated)
  }

  const addListing = () => {
    setListings([...listings, { storeName: "", buyLink: "", country: "Canada" }])
  }

  const removeListing = (index: number) => {
    const updated = [...listings]
    updated.splice(index, 1)
    setListings(updated)
  }

  const moveListing = (from: number, to: number) => {
    if (to < 0 || to >= listings.length) return
    const updated = [...listings]
    const [moved] = updated.splice(from, 1)
    updated.splice(to, 0, moved)
    setListings(updated)
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Edit Product</h1>

      <input
        className="input input-bordered w-full"
        placeholder="Product Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />

      {/* Base64 image preview */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Preview"
          className="w-32 h-32 object-contain mt-2 border rounded"
        />
      )}

      {/* Upload new image */}
      <input
        type="file"
        accept="image/*"
        className="file-input file-input-bordered w-full mt-2"
        onChange={async e => {
          const file = e.target.files?.[0]
          if (file) {
            const base64 = await convertToBase64(file)
            setImageUrl(base64)
          }
        }}
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

      <textarea
        className="textarea textarea-bordered w-full"
        placeholder="Product Description"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />

      <h2 className="font-semibold">Listings:</h2>
      {listings.map((listing, i) => (
        <div key={i} className="grid grid-cols-3 gap-2 items-center mb-2">
          <input
            className="input input-sm input-bordered"
            placeholder="Store Name"
            value={listing.storeName}
            onChange={e => updateListing(i, "storeName", e.target.value)}
          />
          <input
            className="input input-sm input-bordered"
            placeholder="Buy Link"
            value={listing.buyLink}
            onChange={e => updateListing(i, "buyLink", e.target.value)}
          />
          <input
            className="input input-sm input-bordered"
            placeholder="Country"
            value={listing.country}
            onChange={e => updateListing(i, "country", e.target.value)}
          />

          <div className="flex gap-1 col-span-3 justify-end">
            <button
              className="btn btn-xs btn-outline"
              disabled={i === 0}
              onClick={() => moveListing(i, i - 1)}
            >
              ↑
            </button>
            <button
              className="btn btn-xs btn-outline"
              disabled={i === listings.length - 1}
              onClick={() => moveListing(i, i + 1)}
            >
              ↓
            </button>
            <button
              className="btn btn-xs btn-error"
              onClick={() => removeListing(i)}
            >
              🗑️
            </button>
          </div>
        </div>
      ))}

      <button className="btn btn-outline btn-sm" onClick={addListing}>
        + Add Store
      </button>

      <div>
        <button className="btn btn-success mt-4" onClick={updateProduct}>
          Save Changes
        </button>
      </div>
    </div>
  )
}
