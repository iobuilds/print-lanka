import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ShoppingBag,
  Loader2,
  ChevronRight,
  Clock,
  CreditCard,
  CheckCircle,
  Truck,
  Package,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

type ShopOrderStatus =
  | "pending_payment"
  | "payment_submitted"
  | "payment_approved"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

interface ShopOrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price_at_purchase: number;
}

interface ShopOrder {
  id: string;
  status: ShopOrderStatus;
  subtotal: number;
  shipping_cost: number;
  total_price: number;
  shipping_address: string;
  tracking_number: string | null;
  created_at: string;
  shop_order_items?: ShopOrderItem[];
}

const statusConfig: Record<ShopOrderStatus, { label: string; icon: React.ReactNode; color: string }> = {
  pending_payment: { label: "Pending Payment", icon: <Clock className="w-4 h-4" />, color: "text-gray-500" },
  payment_submitted: { label: "Payment Submitted", icon: <CreditCard className="w-4 h-4" />, color: "text-amber-500" },
  payment_approved: { label: "Payment Approved", icon: <CheckCircle className="w-4 h-4" />, color: "text-green-500" },
  processing: { label: "Processing", icon: <Package className="w-4 h-4" />, color: "text-blue-500" },
  shipped: { label: "Shipped", icon: <Truck className="w-4 h-4" />, color: "text-purple-500" },
  delivered: { label: "Delivered", icon: <CheckCircle className="w-4 h-4" />, color: "text-emerald-500" },
  cancelled: { label: "Cancelled", icon: <XCircle className="w-4 h-4" />, color: "text-red-500" },
};

export function UserShopOrders() {
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ["user-shop-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_orders")
        .select(`
          *,
          shop_order_items (id, product_name, quantity, price_at_purchase)
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ShopOrder[];
    },
    enabled: !!user,
  });

  // Real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("user-shop-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shop_orders",
          filter: `user_id=eq.${user.id}`,
        },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  const getStatusBadge = (status: ShopOrderStatus) => {
    const config = statusConfig[status];
    return (
      <Badge variant="outline" className={`gap-1 ${config.color}`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shop Orders</CardTitle>
          <CardDescription>Your product purchases</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground mb-4">No shop orders yet</p>
          <Button asChild>
            <Link to="/shop">Browse Shop</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shop Orders</CardTitle>
        <CardDescription>Your product purchases and their status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {orders.map((order) => (
          <Collapsible
            key={order.id}
            open={expandedId === order.id}
            onOpenChange={(open) => setExpandedId(open ? order.id : null)}
          >
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <ShoppingBag className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">
                        Order #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(order.created_at), "PPp")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(order.status)}
                    <span className="font-bold">
                      LKR {order.total_price.toLocaleString()}
                    </span>
                    <ChevronRight
                      className={`w-5 h-5 transition-transform ${
                        expandedId === order.id ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </CardContent>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <Separator />
                <CardContent className="p-4 space-y-4">
                  {/* Order Items */}
                  <div>
                    <p className="font-semibold mb-2">Items</p>
                    <div className="space-y-2">
                      {order.shop_order_items?.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>
                            {item.product_name} × {item.quantity}
                          </span>
                          <span>
                            LKR {(item.price_at_purchase * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Price Breakdown */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>LKR {order.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping</span>
                      <span>LKR {order.shipping_cost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>LKR {order.total_price.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Tracking */}
                  {order.tracking_number && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-primary" />
                        <span className="text-sm">
                          Tracking: <span className="font-mono">{order.tracking_number}</span>
                        </span>
                      </div>
                    </>
                  )}

                  {/* Shipping Address */}
                  <div>
                    <p className="text-sm text-muted-foreground">Shipping Address</p>
                    <p className="text-sm">{order.shipping_address}</p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}
