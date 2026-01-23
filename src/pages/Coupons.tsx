import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Tag, Percent, DollarSign, Calendar, Gift, Loader2, 
  CheckCircle, Clock, Sparkles 
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface AvailableCoupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_value: number | null;
  max_uses: number | null;
  current_uses: number;
  valid_until: string | null;
}

interface UserCoupon {
  id: string;
  coupon_id: string;
  is_used: boolean;
}

export default function Coupons() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCoupons();
  }, [user]);

  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      // Fetch all active public coupons
      const { data: couponsData, error: couponsError } = await supabase
        .from("coupons")
        .select("id, code, discount_type, discount_value, min_order_value, max_uses, current_uses, valid_until")
        .eq("is_active", true)
        .or("valid_until.is.null,valid_until.gt.now()");

      if (couponsError) throw couponsError;

      // Filter out coupons that have reached max uses
      const validCoupons = (couponsData || []).filter(c => 
        c.max_uses === null || c.current_uses < c.max_uses
      );

      setAvailableCoupons(validCoupons);

      // If user is logged in, fetch their claimed coupons
      if (user) {
        const { data: userCouponsData, error: userCouponsError } = await supabase
          .from("user_coupons")
          .select("id, coupon_id, is_used")
          .eq("user_id", user.id);

        if (!userCouponsError && userCouponsData) {
          setUserCoupons(userCouponsData);
        }
      }
    } catch (error) {
      console.error("Error fetching coupons:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimCoupon = async (coupon: AvailableCoupon) => {
    if (!user) {
      toast.error("Please login to claim coupons");
      navigate("/login");
      return;
    }

    setClaimingId(coupon.id);
    try {
      const { error } = await supabase
        .from("user_coupons")
        .insert({
          user_id: user.id,
          coupon_id: coupon.id,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("You already have this coupon!");
        } else {
          throw error;
        }
      } else {
        toast.success(`Coupon ${coupon.code} added to your wallet!`);
        // Redirect to dashboard coupons tab
        navigate("/dashboard?tab=coupons");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to claim coupon");
    } finally {
      setClaimingId(null);
    }
  };

  const getUserCoupon = (couponId: string) => {
    return userCoupons.find((uc) => uc.coupon_id === couponId);
  };

  const isExpiringSoon = (validUntil: string | null) => {
    if (!validUntil) return false;
    const expiryDate = new Date(validUntil);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
              <Gift className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-4xl font-bold mb-4">Available Coupons</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Grab exclusive discounts for your 3D printing orders. 
              {!user && " Login to claim coupons and save on your next order!"}
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : availableCoupons.length === 0 ? (
            <Card className="max-w-md mx-auto text-center">
              <CardContent className="py-12">
                <Tag className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Coupons Available</h3>
                <p className="text-muted-foreground">
                  Check back later for new discounts and offers!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
              {availableCoupons.map((coupon) => {
                const userCoupon = getUserCoupon(coupon.id);
                const claimed = !!userCoupon;
                const used = !!userCoupon?.is_used;
                const expiringSoon = isExpiringSoon(coupon.valid_until);

                return (
                    <Card 
                    key={coupon.id} 
                    className={`relative overflow-hidden transition-all hover:shadow-lg ${
                        claimed
                          ? used
                            ? "border-border bg-muted/30"
                            : "border-green-500/50 bg-green-500/5"
                          : "border-primary/20 hover:border-primary/50"
                    }`}
                  >
                    {/* Decorative gradient */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/50" />
                    
                    {/* Expiring soon badge */}
                    {expiringSoon && !claimed && (
                      <Badge 
                        variant="destructive" 
                        className="absolute top-3 right-3 gap-1"
                      >
                        <Clock className="w-3 h-3" />
                        Expiring Soon
                      </Badge>
                    )}

                    {/* Claimed/Used badge */}
                    {claimed && (
                      <Badge 
                        className={`absolute top-3 right-3 gap-1 ${
                          used ? "bg-muted text-foreground" : "bg-green-500"
                        }`}
                      >
                        <CheckCircle className="w-3 h-3" />
                        {used ? "Used" : "In Wallet"}
                      </Badge>
                    )}

                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2 text-primary">
                        {coupon.discount_type === "percentage" ? (
                          <Percent className="w-5 h-5" />
                        ) : (
                          <DollarSign className="w-5 h-5" />
                        )}
                        <span className="font-mono text-lg font-bold tracking-wider">
                          {coupon.code}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Discount value */}
                      <div className="text-center py-4 bg-primary/5 rounded-lg">
                        <p className="text-4xl font-bold text-primary">
                          {coupon.discount_type === "percentage" 
                            ? `${coupon.discount_value}%`
                            : `LKR ${coupon.discount_value}`
                          }
                        </p>
                        <p className="text-sm text-muted-foreground uppercase tracking-wider">
                          Off Your Order
                        </p>
                      </div>

                      {/* Details */}
                      <div className="space-y-2 text-sm">
                        {coupon.min_order_value && coupon.min_order_value > 0 && (
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Min. Order</span>
                            <span className="font-medium">LKR {coupon.min_order_value.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Valid Until
                          </span>
                          <span className="font-medium">
                            {coupon.valid_until 
                              ? new Date(coupon.valid_until).toLocaleDateString()
                              : "No Expiry"
                            }
                          </span>
                        </div>
                        {coupon.max_uses && (
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Remaining</span>
                            <span className="font-medium">
                              {coupon.max_uses - coupon.current_uses} left
                            </span>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Action button */}
                      {claimed ? (
                        <Button 
                          variant="outline" 
                          className={
                            used
                              ? "w-full"
                              : "w-full border-green-500 text-green-600 hover:bg-green-500/10"
                          }
                          onClick={() => navigate("/dashboard")}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {used ? "View Used Coupon" : "View in Wallet"}
                        </Button>
                      ) : (
                        <Button 
                          className="w-full bg-primary-gradient"
                          onClick={() => handleClaimCoupon(coupon)}
                          disabled={claimingId === coupon.id}
                        >
                          {claimingId === coupon.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                          )}
                          Grab This Coupon
                        </Button>
                      )}
                    </CardContent>

                    {/* Decorative dashed circles */}
                    <div className="absolute left-0 top-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 bg-background rounded-full border" />
                    <div className="absolute right-0 top-1/2 w-4 h-4 translate-x-1/2 -translate-y-1/2 bg-background rounded-full border" />
                  </Card>
                );
              })}
            </div>
          )}

          {/* Call to action */}
          {!user && availableCoupons.length > 0 && (
            <div className="text-center mt-12">
              <Card className="max-w-md mx-auto bg-primary/5 border-primary/20">
                <CardContent className="py-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    Login or create an account to claim coupons and use them on your orders
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button variant="outline" onClick={() => navigate("/login")}>
                      Login
                    </Button>
                    <Button onClick={() => navigate("/register")}>
                      Create Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
