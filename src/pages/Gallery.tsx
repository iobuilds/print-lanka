import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Star, MessageCircle, Loader2, Send, Lock } from "lucide-react";
import { toast } from "sonner";

interface GalleryPost {
  id: string;
  title: string | null;
  description: string | null;
  image_path: string;
  customer_name: string;
  user_id: string | null;
  created_at: string;
}

interface Review {
  id: string;
  gallery_post_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export default function Gallery() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<GalleryPost | null>(null);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("gallery_posts")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load gallery");
    } else {
      setPosts(data || []);
      if (data && data.length > 0) {
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("*")
          .in("gallery_post_id", data.map(p => p.id))
          .order("created_at", { ascending: false });

        if (reviewsData) {
          const groupedReviews: Record<string, Review[]> = {};
          reviewsData.forEach((review) => {
            if (!groupedReviews[review.gallery_post_id]) {
              groupedReviews[review.gallery_post_id] = [];
            }
            groupedReviews[review.gallery_post_id].push(review);
          });
          setReviews(groupedReviews);
        }
      }
    }
    setLoading(false);
  };

  const getImageUrl = (path: string) => {
    const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
    return data.publicUrl;
  };

  const getAverageRating = (postId: string) => {
    const postReviews = reviews[postId] || [];
    if (postReviews.length === 0) return 0;
    const sum = postReviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / postReviews.length).toFixed(1);
  };

  const canUserReview = (post: GalleryPost) => {
    // User can review only if they are the order owner
    return user && post.user_id === user.id;
  };

  const hasUserReviewed = (postId: string) => {
    if (!user) return false;
    const postReviews = reviews[postId] || [];
    return postReviews.some(r => r.user_id === user.id);
  };

  const handleSubmitReview = async () => {
    if (!user || !selectedPost) {
      toast.error("Please sign in to leave a review");
      return;
    }

    if (!canUserReview(selectedPost)) {
      toast.error("Only the order owner can leave a review");
      return;
    }

    if (hasUserReviewed(selectedPost.id)) {
      toast.error("You have already reviewed this item");
      return;
    }

    if (!newReview.comment.trim()) {
      toast.error("Please write a comment");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      gallery_post_id: selectedPost.id,
      user_id: user.id,
      rating: newReview.rating,
      comment: newReview.comment.trim(),
    });

    if (error) {
      if (error.code === "42501") {
        toast.error("Only the order owner can leave a review");
      } else {
        toast.error("Failed to submit review");
      }
    } else {
      toast.success("Review submitted!");
      setNewReview({ rating: 5, comment: "" });
      fetchPosts();
    }
    setSubmitting(false);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold mb-4">Our Work</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Browse through our previous 3D printing projects and see what our customers have created.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No gallery posts yet. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Card key={post.id} className="overflow-hidden group">
                <div className="relative aspect-square">
                  <img
                    src={getImageUrl(post.image_path)}
                    alt={post.title || "Gallery image"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <p className="text-white font-medium">By: {post.customer_name}</p>
                    {post.title && (
                      <p className="text-white/80 text-sm">{post.title}</p>
                    )}
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Number(getAverageRating(post.id))
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                      <span className="text-sm text-muted-foreground ml-1">
                        ({reviews[post.id]?.length || 0})
                      </span>
                    </div>
                  </div>

                  {post.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {post.description}
                    </p>
                  )}

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setSelectedPost(post)}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        View Reviews
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Reviews for {post.title || "This Project"}</DialogTitle>
                      </DialogHeader>

                      <div className="relative aspect-video rounded-lg overflow-hidden mb-4">
                        <img
                          src={getImageUrl(post.image_path)}
                          alt={post.title || "Gallery image"}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                          <p className="text-white text-sm">By: {post.customer_name}</p>
                        </div>
                      </div>

                      <div className="space-y-4 mb-4">
                        {(reviews[post.id] || []).length === 0 ? (
                          <p className="text-center text-muted-foreground py-4">
                            No reviews yet.
                          </p>
                        ) : (
                          (reviews[post.id] || []).map((review) => (
                            <div key={review.id} className="border-b pb-4">
                              <div className="flex items-center gap-1 mb-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 ${
                                      star <= review.rating
                                        ? "text-yellow-500 fill-yellow-500"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                ))}
                              </div>
                              <p className="text-sm">{review.comment}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(review.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Review form - only for order owner */}
                      {canUserReview(post) && !hasUserReviewed(post.id) ? (
                        <div className="border-t pt-4 space-y-3">
                          <p className="font-medium text-sm">Leave Your Review</p>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setNewReview({ ...newReview, rating: star })}
                              >
                                <Star
                                  className={`w-6 h-6 cursor-pointer transition-colors ${
                                    star <= newReview.rating
                                      ? "text-yellow-500 fill-yellow-500"
                                      : "text-muted-foreground hover:text-yellow-400"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          <Textarea
                            placeholder="Write your review..."
                            value={newReview.comment}
                            onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                            rows={3}
                          />
                          <Button
                            onClick={handleSubmitReview}
                            disabled={submitting}
                            className="w-full"
                          >
                            {submitting ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Send className="w-4 h-4 mr-2" />
                            )}
                            Submit Review
                          </Button>
                        </div>
                      ) : hasUserReviewed(post.id) ? (
                        <div className="border-t pt-4 text-center">
                          <p className="text-sm text-muted-foreground">
                            ✓ You have already reviewed this item
                          </p>
                        </div>
                      ) : user ? (
                        <div className="border-t pt-4 text-center">
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Lock className="w-4 h-4" />
                            <p className="text-sm">Only the customer who ordered this can add a review</p>
                          </div>
                        </div>
                      ) : (
                        <div className="border-t pt-4 text-center">
                          <p className="text-sm text-muted-foreground mb-2">
                            Sign in to view review options
                          </p>
                          <Button variant="outline" asChild>
                            <a href="/login">Sign In</a>
                          </Button>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
