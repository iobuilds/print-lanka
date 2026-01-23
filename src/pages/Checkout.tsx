import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Box, Upload, Loader2, CheckCircle, ChevronRight, 
  Percent, AlertCircle, Trash2
} from "lucide-react";
import { formatPrice, MATERIALS, QUALITY_PRESETS } from "@/lib/constants";
import { toast } from "sonner";

interface ModelConfig {
  material: string;
  quality: string;
  color: string;
  infill: number;
  quantity: number;
  notes: string;
}

interface UploadedModel {
  file: File;
  name: string;
  config: ModelConfig;
}

interface CouponData {
  user_coupon_id: string;
  code: string;
  discount_type: string;
  discount_value: number;
}

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const models: UploadedModel[] = location.state?.models || [];
  const coupon: CouponData | null = location.state?.coupon || null;

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { redirect: "/checkout", models, coupon } });
    }
  }, [user, navigate, models, coupon]);

  useEffect(() => {
    if (models.length === 0 && !orderSubmitted) {
      navigate("/");
    }
  }, [models, navigate, orderSubmitted]);

  const handleSubmitOrder = async () => {
    if (!user || models.length === 0) return;

    setIsSubmitting(true);

    try {
      // 1. Create the order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          status: "pending_review",
          notes: coupon ? `Coupon: ${coupon.code}` : null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Upload files and create order items
      for (let i = 0; i < models.length; i++) {
        const model = models[i];
        setUploadProgress((prev) => ({ ...prev, [i]: 0 }));

        // Upload file to storage
        const fileExt = model.file.name.split(".").pop();
        const filePath = `${user.id}/${order.id}/${Date.now()}_${model.file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("models")
          .upload(filePath, model.file);

        if (uploadError) throw uploadError;

        setUploadProgress((prev) => ({ ...prev, [i]: 50 }));

        // Create order item
        const { error: itemError } = await supabase.from("order_items").insert({
          order_id: order.id,
          file_name: model.file.name,
          file_path: filePath,
          file_size: model.file.size,
          material: model.config.material as any,
          quality: model.config.quality as any,
          color: model.config.color,
          infill_percentage: model.config.infill,
          quantity: model.config.quantity,
          notes: model.config.notes || null,
        });

        if (itemError) throw itemError;

        setUploadProgress((prev) => ({ ...prev, [i]: 100 }));
      }

      // 3. Mark coupon as used if applicable
      if (coupon) {
        await supabase
          .from("user_coupons")
          .update({
            is_used: true,
            used_at: new Date().toISOString(),
            used_on_order_id: order.id,
          })
          .eq("id", coupon.user_coupon_id);
      }

      setOrderId(order.id);
      setOrderSubmitted(true);
      toast.success("Order submitted successfully!");
    } catch (error: any) {
      console.error("Order submission error:", error);
      toast.error(error.message || "Failed to submit order");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSubmitted && orderId) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-background py-12">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="pt-8 text-center">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">Order Submitted!</h2>
              <p className="text-muted-foreground mb-4">
                Your order has been received. We'll review and price your items soon.
              </p>
              <p className="text-sm font-mono bg-muted p-2 rounded mb-6">
                Order ID: #{orderId.slice(0, 8)}
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate("/")} className="flex-1">
                  Back Home
                </Button>
                <Button onClick={() => navigate("/dashboard")} className="flex-1 bg-primary-gradient">
                  View Orders
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold">Checkout</h1>
            <p className="text-muted-foreground">Review your order and submit</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Order Items */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Box className="w-5 h-5" />
                    Order Items ({models.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {models.map((model, index) => {
                    const progress = uploadProgress[index];
                    const material = MATERIALS[model.config.material as keyof typeof MATERIALS];
                    const quality = QUALITY_PRESETS[model.config.quality as keyof typeof QUALITY_PRESETS];

                    return (
                      <div
                        key={index}
                        className="flex items-start gap-4 p-4 rounded-lg border bg-card"
                      >
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: model.config.color }}
                        >
                          {progress !== undefined ? (
                            progress === 100 ? (
                              <CheckCircle className="w-6 h-6 text-white" />
                            ) : (
                              <Loader2 className="w-6 h-6 text-white animate-spin" />
                            )
                          ) : (
                            <Box className="w-6 h-6 text-white mix-blend-difference" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{model.name}</p>
                          <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
                            <span>{material?.name || model.config.material}</span>
                            <span>•</span>
                            <span>{quality?.name || model.config.quality}</span>
                            <span>•</span>
                            <span>{model.config.infill}% infill</span>
                          </div>
                          {model.config.notes && (
                            <p className="text-sm text-muted-foreground mt-1 italic">
                              "{model.config.notes}"
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="font-semibold">×{model.config.quantity}</span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Delivery Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">
                      {profile?.first_name} {profile?.last_name}
                    </p>
                    <p className="text-muted-foreground">{profile?.phone}</p>
                    <p className="text-muted-foreground">{profile?.address}</p>
                  </div>
                  <Button 
                    variant="link" 
                    className="px-0 mt-2"
                    onClick={() => navigate("/dashboard?tab=profile")}
                  >
                    Edit delivery address
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items</span>
                    <span>{models.length} model(s)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Quantity</span>
                    <span>{models.reduce((sum, m) => sum + m.config.quantity, 0)} piece(s)</span>
                  </div>

                  {coupon && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between text-sm bg-success/10 p-2 rounded">
                        <div className="flex items-center gap-2 text-success">
                          <Percent className="w-4 h-4" />
                          <span className="font-medium">{coupon.code}</span>
                        </div>
                        <span className="text-success font-medium">
                          {coupon.discount_type === "percentage"
                            ? `-${coupon.discount_value}%`
                            : `-${formatPrice(coupon.discount_value)}`}
                        </span>
                      </div>
                    </>
                  )}

                  <Separator />

                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      Price will be calculated after we review your models
                    </p>
                  </div>

                  <Button
                    size="lg"
                    disabled={isSubmitting || models.length === 0}
                    onClick={handleSubmitOrder}
                    className="w-full bg-primary-gradient shadow-glow"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        Submit Order
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By submitting, you agree to our terms of service
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
