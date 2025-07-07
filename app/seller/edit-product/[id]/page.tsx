import { EditProductForm } from "@/components/seller/edit-product-form"

interface EditProductPageProps {
  params: {
    id: string
  }
}

export default function EditProductPage({ params }: EditProductPageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Edit Produk</h1>
          <p className="text-muted-foreground mt-2">Perbarui informasi produk digital Anda</p>
        </div>
        <EditProductForm productId={params.id} />
      </div>
    </div>
  )
}
