"use client"

import { useState, useEffect } from "react"
import { Star, ThumbsUp, ThumbsDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase-client"

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

// Add type for raw review from Supabase
interface RawReview extends Omit<Review, 'profiles'> {
  profiles: ReviewProfile[] | ReviewProfile | null;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const [newReview, setNewReview] = useState("")
  const [newRating, setNewRating] = useState(0)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('reviews')
        .select(`id, rating, content, created_at, helpful_count, not_helpful_count, user_id, profiles(name, avatar_url)`) // profiles is an array
        .eq('product_id', productId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (!error && data) {
        setReviews(
          (data as RawReview[]).map((r) => ({
            ...r,
            profiles: Array.isArray(r.profiles) ? (r.profiles[0] || { name: 'User', avatar_url: null }) : (r.profiles || { name: 'User', avatar_url: null })
          }))
        )
      }
      setLoading(false)
    }
    if (productId) fetchReviews()
  }, [productId])

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
                          Membantu ({review.helpful_count})
                        </button>
                        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                          <ThumbsDown className="w-4 h-4" />
                          Tidak membantu ({review.not_helpful_count})
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="text-center">
          <Button variant="outline">Muat Lebih Banyak Ulasan</Button>
        </div>
      </div>
    </div>
  )
}
