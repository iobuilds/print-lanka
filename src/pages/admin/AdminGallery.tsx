import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, ImageIcon, Loader2, Star, Eye, EyeOff, Search } from "lucide-react";
import { toast } from "sonner";

interface GalleryPost {
  id: string;
  title: string | null;
  description: string | null;
  image_path: string;
  customer_name: string;
  is_published: boolean;
  created_at: string;
  order_id: string | null;
  user_id: string | null;
}

interface Review {
  id: string;
  gallery_post_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface OrderWithProfile {
  id: string;
  created_at: string;
  status: string;
  profile: {
    first_name: string;
    last_name: string;
  } | null;
  user_id: string;
}

export default function AdminGallery() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review[]>>({});
  const [orders, setOrders] = useState<OrderWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GalleryPost | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  
  const [newPost, setNewPost] = useState({
    title: "",
    description: "",
    customer_name: "",
    order_id: "",
    user_id: "",
    is_published: false,
  });
  const [orderIdInput, setOrderIdInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
    fetchOrders();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("gallery_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load gallery posts");
    } else {
      setPosts(data || []);
      
      if (data && data.length > 0) {
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("*")
          .in("gallery_post_id", data.map(p => p.id));

        if (reviewsData) {
          const grouped: Record<string, Review[]> = {};
          reviewsData.forEach((r) => {
            if (!grouped[r.gallery_post_id]) grouped[r.gallery_post_id] = [];
            grouped[r.gallery_post_id].push(r);
          });
          setReviews(grouped);
        }
      }
    }
    setLoading(false);
  };

  const fetchOrders = async () => {
    // Fetch completed orders with profiles
    const { data } = await supabase
      .from("orders")
      .select("id, created_at, status, user_id")
      .in("status", ["completed", "shipped", "ready_to_ship", "in_production", "payment_approved"])
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) {
      // Fetch profiles for these orders
      const userIds = [...new Set(data.map(o => o.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const ordersWithProfiles: OrderWithProfile[] = data.map(order => ({
        ...order,
        profile: profileMap.get(order.user_id) || null,
      }));
      
      setOrders(ordersWithProfiles);
    }
  };

  const getImageUrl = (path: string) => {
    const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleOrderSelect = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order && order.profile) {
      setNewPost({
        ...newPost,
        order_id: orderId,
        user_id: order.user_id,
        customer_name: `${order.profile.first_name} ${order.profile.last_name}`,
      });
    }
  };

  const handleOrderIdLookup = async () => {
    if (!orderIdInput.trim()) {
      toast.error("Please enter an order ID");
      return;
    }

    setLookupLoading(true);
    
    // Search for order by ID (partial match)
    const { data: orderData, error } = await supabase
      .from("orders")
      .select("id, user_id")
      .ilike("id", `%${orderIdInput.trim()}%`)
      .limit(1)
      .maybeSingle();

    if (error || !orderData) {
      toast.error("Order not found");
      setLookupLoading(false);
      return;
    }

    // Get profile for this order
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("user_id", orderData.user_id)
      .maybeSingle();

    if (profile) {
      setNewPost({
        ...newPost,
        order_id: orderData.id,
        user_id: orderData.user_id,
        customer_name: `${profile.first_name} ${profile.last_name}`,
      });
      toast.success(`Found: ${profile.first_name} ${profile.last_name}`);
    } else {
      toast.error("Customer profile not found");
    }
    
    setLookupLoading(false);
  };

  const handleAddPost = async () => {
    if (!selectedFile) {
      toast.error("Please select an image");
      return;
    }
    if (!newPost.customer_name.trim()) {
      toast.error("Please select an order or enter order ID");
      return;
    }

    setUploading(true);

    const fileExt = selectedFile.name.split(".").pop();
    const fileName = `gallery/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from("site-assets")
      .upload(fileName, selectedFile);

    if (uploadError) {
      toast.error("Failed to upload image");
      setUploading(false);
      return;
    }

    const { error } = await supabase.from("gallery_posts").insert({
      title: newPost.title.trim() || null,
      description: newPost.description.trim() || null,
      customer_name: newPost.customer_name.trim(),
      order_id: newPost.order_id || null,
      user_id: newPost.user_id || null,
      image_path: fileName,
      is_published: newPost.is_published,
      created_by: user?.id,
    });

    if (error) {
      toast.error("Failed to create post");
    } else {
      toast.success("Post created!");
      setAddDialogOpen(false);
      resetForm();
      fetchPosts();
    }
    setUploading(false);
  };

  const resetForm = () => {
    setNewPost({ title: "", description: "", customer_name: "", order_id: "", user_id: "", is_published: false });
    setOrderIdInput("");
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleTogglePublish = async (post: GalleryPost) => {
    const { error } = await supabase
      .from("gallery_posts")
      .update({ is_published: !post.is_published })
      .eq("id", post.id);

    if (error) {
      toast.error("Failed to update post");
    } else {
      toast.success(post.is_published ? "Post unpublished" : "Post published");
      fetchPosts();
    }
  };

  const handleDeletePost = async () => {
    if (!deleteTarget) return;

    await supabase.storage.from("site-assets").remove([deleteTarget.image_path]);

    const { error } = await supabase
      .from("gallery_posts")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      toast.error("Failed to delete post");
    } else {
      toast.success("Post deleted");
      setDeleteTarget(null);
      fetchPosts();
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
    if (error) {
      toast.error("Failed to delete review");
    } else {
      toast.success("Review deleted");
      fetchPosts();
    }
  };

  const getAverageRating = (postId: string) => {
    const postReviews = reviews[postId] || [];
    if (postReviews.length === 0) return 0;
    const sum = postReviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / postReviews.length).toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gallery</h1>
          <p className="text-muted-foreground">Manage your work showcase</p>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Gallery Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Image *</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="mt-1"
                />
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="mt-2 w-full aspect-square object-cover rounded-lg"
                  />
                )}
              </div>

              <div>
                <Label>Select Order</Label>
                <Select onValueChange={handleOrderSelect} value={newPost.order_id}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a completed order..." />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.profile ? `${order.profile.first_name} ${order.profile.last_name}` : "Unknown"} - #{order.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-center text-sm text-muted-foreground">— OR —</div>

              <div>
                <Label>Enter Order ID</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={orderIdInput}
                    onChange={(e) => setOrderIdInput(e.target.value)}
                    placeholder="Paste order ID..."
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleOrderIdLookup}
                    disabled={lookupLoading}
                  >
                    {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {newPost.customer_name && (
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{newPost.customer_name}</p>
                </div>
              )}

              <div>
                <Label>Title (Optional)</Label>
                <Input
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  placeholder="e.g., Custom Figurine"
                />
              </div>
              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  value={newPost.description}
                  onChange={(e) => setNewPost({ ...newPost, description: e.target.value })}
                  placeholder="Brief description of the project..."
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newPost.is_published}
                  onCheckedChange={(checked) => setNewPost({ ...newPost, is_published: checked })}
                />
                <Label>Publish immediately</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddPost} disabled={uploading}>
                {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Post
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No gallery posts yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              <div className="relative aspect-square">
                <img
                  src={getImageUrl(post.image_path)}
                  alt={post.title || "Gallery image"}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Button
                    size="sm"
                    variant={post.is_published ? "default" : "secondary"}
                    onClick={() => handleTogglePublish(post)}
                  >
                    {post.is_published ? (
                      <>
                        <Eye className="w-4 h-4 mr-1" />
                        Published
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4 mr-1" />
                        Draft
                      </>
                    )}
                  </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <p className="text-white font-medium">{post.customer_name}</p>
                  {post.title && <p className="text-white/80 text-sm">{post.title}</p>}
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-medium">{getAverageRating(post.id)}</span>
                    <span className="text-sm text-muted-foreground">
                      ({reviews[post.id]?.length || 0} reviews)
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(post)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {(reviews[post.id] || []).length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {(reviews[post.id] || []).slice(0, 3).map((review) => (
                      <div key={review.id} className="flex items-start justify-between text-sm border-b pb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-1 mb-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${
                                  s <= review.rating ? "text-yellow-500 fill-yellow-500" : "text-muted"
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-muted-foreground line-clamp-1">{review.comment}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleDeleteReview(review.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gallery Post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the post and all its reviews. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePost} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
