import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Minus, Plus, ArrowLeft, Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  main_image: string;
  stock: number;
}

interface ProductImage {
  id: string;
  image_path: string;
  sort_order: number;
}

export default function ShopProduct() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ["shop-product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_products")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data as Product;
    },
    enabled: !!id,
  });

  const { data: images } = useQuery({
    queryKey: ["shop-product-images", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_product_images")
        .select("*")
        .eq("product_id", id)
        .order("sort_order");
      if (error) throw error;
      return data as ProductImage[];
    },
    enabled: !!id,
  });

  const getImageUrl = (path: string) => {
    if (path.startsWith("http")) return path;
    const { data } = supabase.storage.from("shop-products").getPublicUrl(path);
    return data.publicUrl;
  };

  const addToCart = async () => {
    if (!user) {
      toast({ title: "Please login", description: "You need to login to add items to cart", variant: "destructive" });
      return;
    }

    // Check existing cart item
    const { data: existing } = await supabase
      .from("shop_cart_items")
      .select("quantity")
      .eq("user_id", user.id)
      .eq("product_id", id)
      .maybeSingle();

    const newQuantity = (existing?.quantity || 0) + quantity;

    const { error } = await supabase
      .from("shop_cart_items")
      .upsert(
        { user_id: user.id, product_id: id, quantity: newQuantity },
        { onConflict: "user_id,product_id" }
      );

    if (error) {
      toast({ title: "Error", description: "Failed to add to cart", variant: "destructive" });
    } else {
      toast({ title: "Added to cart", description: `${quantity} x ${product?.name} added to your cart` });
    }
  };

  const allImages = product
    ? [{ id: "main", image_path: product.main_image, sort_order: -1 }, ...(images || [])]
    : [];

  const displayImage = selectedImage || product?.main_image;

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse grid md:grid-cols-2 gap-8">
            <div className="aspect-square bg-muted rounded-lg" />
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="h-6 bg-muted rounded w-1/4" />
              <div className="h-24 bg-muted rounded" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Product not found</h2>
          <p className="text-muted-foreground mb-4">This product may have been removed or is unavailable.</p>
          <Button onClick={() => navigate("/shop")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Shop
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/shop")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Shop
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Images */}
          <div className="space-y-4">
            <Card className="overflow-hidden aspect-square">
              <img
                src={getImageUrl(displayImage || product.main_image)}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </Card>
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allImages.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(img.image_path)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      (selectedImage || product.main_image) === img.image_path
                        ? "border-primary"
                        : "border-transparent"
                    }`}
                  >
                    <img
                      src={getImageUrl(img.image_path)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-3xl font-bold mb-2">{product.name}</h1>
              {product.stock === 0 ? (
                <Badge variant="destructive">Out of Stock</Badge>
              ) : product.stock <= 5 ? (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                  Only {product.stock} left
                </Badge>
              ) : (
                <Badge variant="secondary">In Stock</Badge>
              )}
            </div>

            <p className="text-3xl font-bold text-primary">
              LKR {product.price.toLocaleString()}
            </p>

            {product.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>
              </div>
            )}

            {product.stock > 0 && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Quantity</label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-12 text-center font-semibold text-lg">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      disabled={quantity >= product.stock}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Button size="lg" className="w-full" onClick={addToCart}>
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart - LKR {(product.price * quantity).toLocaleString()}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
