import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Search,
  Eye,
  Loader2,
  Trash2,
  Download,
  CheckCircle,
  XCircle,
  Truck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type ShopOrderStatus =
  | "pending_payment"
  | "payment_submitted"
  | "payment_approved"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

interface ShopOrder {
  id: string;
  user_id: string;
  status: ShopOrderStatus;
  subtotal: number;
  shipping_cost: number;
  total_price: number;
  shipping_address: string;
  phone: string;
  notes: string | null;
  tracking_number: string | null;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string | null;
  } | null;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price_at_purchase: number;
}

interface PaymentSlip {
  id: string;
  file_path: string;
  file_name: string;
  uploaded_at: string;
  verified: boolean;
}

const statusOptions: { value: ShopOrderStatus; label: string; color: string }[] = [
  { value: "pending_payment", label: "Pending Payment", color: "bg-gray-500" },
  { value: "payment_submitted", label: "Payment Submitted", color: "bg-amber-500" },
  { value: "payment_approved", label: "Payment Approved", color: "bg-green-500" },
  { value: "processing", label: "Processing", color: "bg-blue-500" },
  { value: "shipped", label: "Shipped", color: "bg-purple-500" },
  { value: "delivered", label: "Delivered", color: "bg-emerald-500" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-500" },
];

export default function AdminShopOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<ShopOrder | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [paymentSlips, setPaymentSlips] = useState<PaymentSlip[]>([]);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-shop-orders"],
    queryFn: async () => {
      const { data: ordersData, error } = await supabase
        .from("shop_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set(ordersData.map((o) => o.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", userIds);

      const profilesMap = new Map(profilesData?.map((p) => [p.user_id, p]));

      return ordersData.map((order) => ({
        ...order,
        profiles: profilesMap.get(order.user_id) || null,
      })) as ShopOrder[];
    },
  });

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("admin-shop-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shop_orders" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-shop-orders"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const openOrderDetails = async (order: ShopOrder) => {
    setSelectedOrder(order);
    setTrackingNumber(order.tracking_number || "");

    // Fetch order items
    const { data: items } = await supabase
      .from("shop_order_items")
      .select("*")
      .eq("order_id", order.id);
    setOrderItems(items || []);

    // Fetch payment slips
    const { data: slips } = await supabase
      .from("shop_payment_slips")
      .select("*")
      .eq("order_id", order.id);
    setPaymentSlips(slips || []);
  };

  const updateOrderStatus = async (newStatus: ShopOrderStatus) => {
    if (!selectedOrder) return;

    setIsUpdating(true);

    try {
      const updates: Record<string, unknown> = { status: newStatus };

      // If shipping, prompt for tracking number
      if (newStatus === "shipped" && !trackingNumber) {
        toast({
          title: "Tracking required",
          description: "Please enter a tracking number before marking as shipped",
          variant: "destructive",
        });
        setIsUpdating(false);
        return;
      }

      if (newStatus === "shipped") {
        updates.tracking_number = trackingNumber;
      }

      if (newStatus === "payment_approved") {
        updates.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("shop_orders")
        .update(updates)
        .eq("id", selectedOrder.id);

      if (error) throw error;

      // Send SMS notification
      const statusMessages: Record<string, string> = {
        payment_approved: `Your payment for Shop Order #${selectedOrder.id.slice(0, 8)} has been approved! We're now processing your order.`,
        processing: `Shop Order #${selectedOrder.id.slice(0, 8)} is now being processed!`,
        shipped: `Your Shop Order #${selectedOrder.id.slice(0, 8)} has been shipped! Tracking: ${trackingNumber}`,
        delivered: `Your Shop Order #${selectedOrder.id.slice(0, 8)} has been delivered. Thank you for shopping with us!`,
      };

      if (statusMessages[newStatus]) {
        await supabase.functions.invoke("send-sms", {
          body: {
            phone: selectedOrder.phone,
            message: statusMessages[newStatus],
            order_id: selectedOrder.id,
            user_id: selectedOrder.user_id,
          },
        });
      }

      toast({ title: "Success", description: "Order status updated" });
      queryClient.invalidateQueries({ queryKey: ["admin-shop-orders"] });
      setSelectedOrder({ ...selectedOrder, status: newStatus, tracking_number: trackingNumber });
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "Failed to update order", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteOrder = async (id: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;

    const { error } = await supabase.from("shop_orders").delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete order", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Order deleted" });
      queryClient.invalidateQueries({ queryKey: ["admin-shop-orders"] });
      setSelectedOrder(null);
    }
  };

  const downloadPaymentSlip = async (slip: PaymentSlip) => {
    const { data, error } = await supabase.storage
      .from("payment-slips")
      .download(slip.file_path);

    if (error) {
      toast({ title: "Error", description: "Failed to download", variant: "destructive" });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = slip.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredOrders = orders?.filter((order) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      order.id.toLowerCase().includes(searchLower) ||
      order.profiles?.first_name?.toLowerCase().includes(searchLower) ||
      order.profiles?.last_name?.toLowerCase().includes(searchLower) ||
      order.phone.includes(searchQuery)
    );
  });

  const getStatusBadge = (status: ShopOrderStatus) => {
    const option = statusOptions.find((s) => s.value === status);
    return (
      <Badge className={`${option?.color} text-white`}>
        {option?.label || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-3xl font-bold">Shop Orders</h1>
          <p className="text-muted-foreground">Manage product orders</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredOrders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">
                      {order.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {order.profiles
                        ? `${order.profiles.first_name} ${order.profiles.last_name}`
                        : "Unknown"}
                    </TableCell>
                    <TableCell>LKR {order.total_price.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{format(new Date(order.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openOrderDetails(order)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => deleteOrder(order.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Order ID</Label>
                  <p className="font-mono">{selectedOrder.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p>
                    {selectedOrder.profiles
                      ? `${selectedOrder.profiles.first_name} ${selectedOrder.profiles.last_name}`
                      : "Unknown"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p>{selectedOrder.phone}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p>{format(new Date(selectedOrder.created_at), "PPp")}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Shipping Address</Label>
                  <p>{selectedOrder.shipping_address}</p>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-muted-foreground mb-2 block">Order Items</Label>
                <div className="space-y-2">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>
                        {item.product_name} × {item.quantity}
                      </span>
                      <span>LKR {(item.price_at_purchase * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>LKR {selectedOrder.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>LKR {selectedOrder.shipping_cost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>LKR {selectedOrder.total_price.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {paymentSlips.length > 0 && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">Payment Slips</Label>
                  <div className="space-y-2">
                    {paymentSlips.map((slip) => (
                      <div key={slip.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{slip.file_name}</span>
                        <Button variant="ghost" size="sm" onClick={() => downloadPaymentSlip(slip)}>
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label>Update Status</Label>
                  <Select
                    value={selectedOrder.status}
                    onValueChange={(v) => updateOrderStatus(v as ShopOrderStatus)}
                    disabled={isUpdating}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tracking Number</Label>
                  <div className="flex gap-2">
                    <Input
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Enter tracking number"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        supabase
                          .from("shop_orders")
                          .update({ tracking_number: trackingNumber })
                          .eq("id", selectedOrder.id)
                          .then(() => {
                            toast({ title: "Saved", description: "Tracking number updated" });
                          });
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => updateOrderStatus("payment_approved")}
                    disabled={selectedOrder.status !== "payment_submitted" || isUpdating}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Payment
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => updateOrderStatus("shipped")}
                    disabled={!["payment_approved", "processing"].includes(selectedOrder.status) || isUpdating}
                  >
                    <Truck className="w-4 h-4 mr-2" />
                    Mark Shipped
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
