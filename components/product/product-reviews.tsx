"use client"

import { useState } from "react"
import { Star, ThumbsUp, ThumbsDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/hooks/use-auth"

// Mock reviews data
const reviews = [
  {
    id: "1",
    user: {
      name: "Budi Santoso",
      avatar: "/placeholder.svg?height=40&width=40",
      verified: true,
    },
    rating: 5,
    date: "2024-01-10",
    content:
      "E-book yang sangat lengkap dan mudah dipahami. Materinya up-to-date dan banyak contoh praktis yang bisa langsung diterapkan. Sangat recommended!",
    helpful: 12,
    notHelpful: 1,
  },
  {
    id: "2",
    user: {
      name: "Sari Dewi",
      avatar: "/placeholder.svg?height=40&width=40",
      verified: true,
    },
    rating: 4,
    date: "2024-01-08",
    content:
      "Konten bagus dan informatif. Hanya saja beberapa bagian terlalu teknis untuk pemula. Overall tetap worth it untuk dibeli.",
    helpful: 8,
    notHelpful: 2,
  },
  {
    id: "3",
    user: {
      name: "Ahmad Rahman",
      avatar: "/placeholder.svg?height=40&width=40",
      verified: false,
    },
    rating: 5,
    date: "2024-01-05",
    content:
      "Excellent! Setelah baca e-book ini, traffic website saya naik 200%. Template dan checklist yang disediakan sangat membantu.",
    helpful: 15,
    notHelpful: 0,
  },
]

const ratingDistribution = [
  { stars: 5, count: 156, percentage: 67 },
  { stars: 4, count: 52, percentage: 22 },
  { stars: 3, count: 18, percentage: 8 },
  { stars: 2, count: 5, percentage: 2 },
  { stars: 1, count: 3, percentage: 1 },
]

interface ProductReviewsProps {
  productId: string
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const [newReview, setNewReview] = useState("")
  const [newRating, setNewRating] = useState(0)
  const { user } = useAuth()

  const totalReviews = ratingDistribution.reduce((sum, item) => sum + item.count, 0)
  const averageRating = ratingDistribution.reduce((sum, item) => sum + item.stars * item.count, 0) / totalReviews

  const handleSubmitReview = () => {
    if (!user) {
      alert("Silakan login untuk memberikan ulasan")
      return
    }

    if (newRating === 0 || newReview.trim() === "") {
      alert("Mohon berikan rating dan ulasan")
      return
    }

    // Submit review logic here
    console.log("Submitting review:", { rating: newRating, content: newReview })
    setNewReview("")
    setNewRating(0)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-6">Ulasan & Rating</h2>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Rating Summary */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold mb-2">{averageRating.toFixed(1)}</div>
                <div className="flex justify-center mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.round(averageRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-muted-foreground">Berdasarkan {totalReviews} ulasan</p>
              </div>

              <div className="space-y-2">
                {ratingDistribution.map((item) => (
                  <div key={item.stars} className="flex items-center gap-3">
                    <span className="text-sm w-8">{item.stars}★</span>
                    <Progress value={item.percentage} className="flex-1" />
                    <span className="text-sm text-muted-foreground w-12">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Write Review */}
          <Card>
            <CardHeader>
              <CardTitle>Tulis Ulasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user ? (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Rating</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} onClick={() => setNewRating(star)} className="p-1">
                          <Star
                            className={`w-6 h-6 ${
                              star <= newRating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300 hover:text-yellow-400"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Ulasan</label>
                    <Textarea
                      placeholder="Bagikan pengalaman Anda dengan produk ini..."
                      value={newReview}
                      onChange={(e) => setNewReview(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <Button onClick={handleSubmitReview} className="w-full">
                    Kirim Ulasan
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Silakan login untuk memberikan ulasan</p>
                  <Button asChild>
                    <a href="/login">Login</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold">Semua Ulasan</h3>

        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarImage src={review.user.avatar || "/placeholder.svg"} alt={review.user.name} />
                    <AvatarFallback>{review.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{review.user.name}</span>
                      {review.user.verified && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Verified</span>
                      )}
                      <span className="text-sm text-muted-foreground">{review.date}</span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>

                    <p className="text-muted-foreground mb-4">{review.content}</p>

                    <div className="flex items-center gap-4">
                      <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                        <ThumbsUp className="w-4 h-4" />
                        Membantu ({review.helpful})
                      </button>
                      <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                        <ThumbsDown className="w-4 h-4" />
                        Tidak membantu ({review.notHelpful})
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button variant="outline">Muat Lebih Banyak Ulasan</Button>
        </div>
      </div>
    </div>
  )
}
