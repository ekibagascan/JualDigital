"use client"

import { useState, useEffect } from "react"
import { Star, ThumbsUp, ThumbsDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"

interface ProductReviewsProps {
  productId: string
}

// Add Review and Profile types
interface ReviewProfile {
  name: string;
  avatar_url: string | null;
  verified?: boolean;
}

interface Review {
  id: string;
  rating: number;
  content: string;
  created_at: string;
  helpful_count: number;
  not_helpful_count: number;
  user_id: string;
  profiles: ReviewProfile;
}



export function ProductReviews({ productId }: ProductReviewsProps) {
  const [newReview, setNewReview] = useState("")
  const [newRating, setNewRating] = useState(0)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const { user } = useAuth()

  const fetchReviews = async () => {
    setLoading(true)

    try {
      const response = await fetch(`/api/reviews?productId=${productId}&page=${page}&t=${Date.now()}`)

      if (!response.ok) {
        await response.text()
        return
      }

      const result = await response.json()

      if (result.success && result.reviews) {
        if (page === 1) {
          setReviews(result.reviews)
        } else {
          setReviews(prev => [...prev, ...result.reviews])
        }
        setHasMore(result.reviews.length === 10) // Assuming 10 reviews per page
      } else {
        console.error('Error fetching reviews:', result.error)
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    }

    setLoading(false)
  }

  useEffect(() => {
    if (productId) fetchReviews()
  }, [productId, page])

  // Calculate rating distribution
  const ratingCounts = [0, 0, 0, 0, 0]
  reviews.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) ratingCounts[r.rating - 1]++
  })
  const totalReviews = reviews.length
  const averageRating = totalReviews > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) : 0
  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: ratingCounts[5 - stars],
    percentage: totalReviews > 0 ? Math.round((ratingCounts[5 - stars] / totalReviews) * 100) : 0
  }))

  const handleSubmitReview = async () => {
    if (!user) {
      toast({
        title: "Login diperlukan",
        description: "Silakan login terlebih dahulu untuk memberikan ulasan.",
        variant: "destructive",
      })
      return
    }

    if (newRating === 0 || newReview.trim() === "") {
      toast({
        title: "Data tidak lengkap",
        description: "Mohon berikan rating dan ulasan.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          rating: newRating,
          content: newReview.trim(),
          userId: user.id
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Ulasan berhasil",
          description: "Terima kasih atas ulasan Anda!",
        })

        // Reset form
        setNewReview("")
        setNewRating(0)

        // Refresh reviews
        setPage(1)
        setReviews([])
        setHasMore(true)
        fetchReviews()
      } else {
        toast({
          title: "Gagal mengirim ulasan",
          description: result.error || "Terjadi kesalahan saat mengirim ulasan.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error submitting review:', error)
      toast({
        title: "Gagal mengirim ulasan",
        description: "Terjadi kesalahan saat mengirim ulasan.",
        variant: "destructive",
      })
    }
  }

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return

    setLoadingMore(true)
    const nextPage = page + 1
    setPage(nextPage)

    try {
      const response = await fetch(`/api/reviews?productId=${productId}&page=${nextPage}`)
      const result = await response.json()

      if (result.success && result.reviews) {
        setReviews(prev => [...prev, ...result.reviews])
        setHasMore(result.reviews.length === 10) // Assuming 10 reviews per page
      }
    } catch (error) {
      console.error('Error loading more reviews:', error)
    }

    setLoadingMore(false)
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
                      className={`w-5 h-5 ${star <= Math.round(averageRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
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
                            className={`w-6 h-6 ${star <= newRating
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
          {loading ? (
            <p>Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p>No reviews yet for this product. Be the first to leave one!</p>
          ) : (
            reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarImage src={review.profiles.avatar_url || "/placeholder.svg"} alt={review.profiles.name} />
                      <AvatarFallback>{review.profiles.name.charAt(0)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{review.profiles.name}</span>
                        {review.profiles.verified && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Verified</span>
                        )}
                        <span className="text-sm text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                              }`}
                          />
                        ))}
                      </div>

                      <p className="text-muted-foreground mb-4">{review.content}</p>

                      <div className="flex items-center gap-4">
                        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                          <ThumbsUp className="w-4 h-4" />
                          Membantu
                        </button>
                        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                          <ThumbsDown className="w-4 h-4" />
                          Tidak membantu
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {hasMore && (
          <div className="text-center">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Memuat..." : "Muat Lebih Banyak Ulasan"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
