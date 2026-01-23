import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, ChevronDown, ChevronUp, DollarSign, Save, Send, Eye, FileImage } from "lucide-react";
import { formatPrice, ORDER_STATUSES } from "@/lib/constants";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  file_name: string;
  file_path: string;
  quantity: number;
  color: string;
  material: string;
  quality: string;
  infill_percentage: number;
  price: number | null;
}

interface PaymentSlip {
  id: string;
  file_name: string;
  file_path: string;
  verified: boolean;
  uploaded_at: string;
}

interface Order {
  id: string;
  status: string;
  total_price: number | null;
  delivery_charge: number | null;
  created_at: string;
  notes: string | null;
  user_id: string;
  profile: {
    first_name: string;
    last_name: string;
    phone: string;
    address: string;
  } | null;
  order_items: OrderItem[];
  payment_slips: PaymentSlip[];
}

const statusOptions = Object.keys(ORDER_STATUSES);

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [pricingOrder, setPricingOrder] = useState<Order | null>(null);
  const [itemPrices, setItemPrices] = useState<Record<string, number>>({});
  const [deliveryCharge, setDeliveryCharge] = useState<number>(350);
  const [isSavingPrices, setIsSavingPrices] = useState(false);
  const [viewingSlip, setViewingSlip] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        profile:profiles!orders_user_id_fkey (
          first_name,
          last_name,
          phone,
          address
        ),
        order_items (
          id,
          file_name,
          file_path,
          quantity,
          color,
          material,
          quality,
          infill_percentage,
          price
        ),
        payment_slips (
          id,
          file_name,
          file_path,
          verified,
          uploaded_at
        )
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const mappedOrders = data.map((order: any) => ({
        ...order,
        profile: Array.isArray(order.profile) ? order.profile[0] : order.profile,
        payment_slips: order.payment_slips || []
      }));
      setOrders(mappedOrders);
    }
    setIsLoading(false);
  };

  const handleStatusChange = async (orderId: string, newStatus: string, order: Order) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus as any })
      .eq("id", orderId);

    if (!error) {
      // Send SMS notification for key status changes
      const notifyStatuses = [
        "priced_awaiting_payment",
        "payment_approved",
        "payment_rejected",
        "ready_to_ship",
        "shipped"
      ];

      if (notifyStatuses.includes(newStatus) && order.profile?.phone) {
        const messages: Record<string, string> = {
          priced_awaiting_payment: `Your order #${orderId.slice(0, 8)} has been priced at ${order.total_price ? formatPrice(order.total_price) : 'pending'}. Please upload your payment slip to proceed.`,
          payment_approved: `Payment approved for order #${orderId.slice(0, 8)}. Your order is now in production!`,
          payment_rejected: `Payment verification failed for order #${orderId.slice(0, 8)}. Please contact us or upload a new payment slip.`,
          ready_to_ship: `Great news! Your order #${orderId.slice(0, 8)} is ready to ship. Expect delivery soon!`,
          shipped: `Your order #${orderId.slice(0, 8)} has been shipped! Track your delivery for updates.`,
        };

        try {
          await supabase.functions.invoke("send-sms", {
            body: {
              phone: order.profile.phone,
              message: messages[newStatus],
              order_id: orderId,
              user_id: order.user_id,
            },
          });
        } catch (smsError) {
          console.error("SMS notification failed:", smsError);
        }
      }

      fetchOrders();
      toast.success("Order status updated");
    } else {
      toast.error("Failed to update status");
    }
  };

  const openPricingDialog = (order: Order) => {
    setPricingOrder(order);
    const prices: Record<string, number> = {};
    order.order_items.forEach(item => {
      prices[item.id] = item.price || 0;
    });
    setItemPrices(prices);
    setDeliveryCharge(order.delivery_charge || 350);
  };

  const calculateTotal = () => {
    const itemsTotal = Object.values(itemPrices).reduce((sum, price) => sum + (price || 0), 0);
    return itemsTotal + deliveryCharge;
  };

  const handleSavePrices = async () => {
    if (!pricingOrder) return;

    setIsSavingPrices(true);
    try {
      // Update each order item price
      for (const [itemId, price] of Object.entries(itemPrices)) {
        const { error } = await supabase
          .from("order_items")
          .update({ price })
          .eq("id", itemId);

        if (error) throw error;
      }

      // Update order total and status
      const total = calculateTotal();
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          total_price: total,
          delivery_charge: deliveryCharge,
          status: "priced_awaiting_payment",
          priced_at: new Date().toISOString(),
        })
        .eq("id", pricingOrder.id);

      if (orderError) throw orderError;

      // Send SMS notification
      if (pricingOrder.profile?.phone) {
        try {
          await supabase.functions.invoke("send-sms", {
            body: {
              phone: pricingOrder.profile.phone,
              message: `Your order #${pricingOrder.id.slice(0, 8)} has been priced at ${formatPrice(total)}. Please upload your bank transfer slip to proceed. View your order at your dashboard.`,
              order_id: pricingOrder.id,
              user_id: pricingOrder.user_id,
            },
          });
        } catch (smsError) {
          console.error("SMS notification failed:", smsError);
        }
      }

      setPricingOrder(null);
      fetchOrders();
      toast.success("Prices saved and customer notified");
    } catch (error: any) {
      toast.error(error.message || "Failed to save prices");
    } finally {
      setIsSavingPrices(false);
    }
  };

  const handleViewPaymentSlip = async (filePath: string) => {
    const { data } = await supabase.storage
      .from("payment-slips")
      .createSignedUrl(filePath, 300);

    if (data?.signedUrl) {
      setViewingSlip(data.signedUrl);
    } else {
      toast.error("Failed to load payment slip");
    }
  };

  const handleVerifyPayment = async (orderId: string, slipId: string, approved: boolean) => {
    try {
      // Update payment slip
      await supabase
        .from("payment_slips")
        .update({
          verified: approved,
          verified_at: new Date().toISOString(),
        })
        .eq("id", slipId);

      // Update order status
      await supabase
        .from("orders")
        .update({
          status: approved ? "payment_approved" : "payment_rejected",
          paid_at: approved ? new Date().toISOString() : null,
          payment_rejection_reason: approved ? null : "Payment verification failed",
        })
        .eq("id", orderId);

      const order = orders.find(o => o.id === orderId);
      if (order?.profile?.phone) {
        const message = approved
          ? `Payment approved for order #${orderId.slice(0, 8)}! Your order is now in production.`
          : `Payment verification failed for order #${orderId.slice(0, 8)}. Please contact us or upload a new payment slip.`;

        try {
          await supabase.functions.invoke("send-sms", {
            body: {
              phone: order.profile.phone,
              message,
              order_id: orderId,
              user_id: order.user_id,
            },
          });
        } catch (smsError) {
          console.error("SMS notification failed:", smsError);
        }
      }

      setViewingSlip(null);
      fetchOrders();
      toast.success(approved ? "Payment approved" : "Payment rejected");
    } catch (error: any) {
      toast.error(error.message || "Failed to verify payment");
    }
  };

  const filteredOrders = filterStatus === "all" 
    ? orders 
    : orders.filter(o => o.status === filterStatus);

  const getStatusBadge = (status: string) => {
    const statusInfo = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES];
    const isError = status.includes("rejected");
    const isSuccess = status === "completed" || status === "shipped";

    return (
      <Badge 
        variant="outline" 
        className={
          isError ? "border-destructive text-destructive" :
          isSuccess ? "border-success text-success" :
          "border-primary text-primary"
        }
      >
        {statusInfo?.label || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Manage customer orders and pricing</p>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            {statusOptions.map((status) => (
              <SelectItem key={status} value={status}>
                {ORDER_STATUSES[status as keyof typeof ORDER_STATUSES]?.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {filterStatus === "all" ? "All Orders" : ORDER_STATUSES[filterStatus as keyof typeof ORDER_STATUSES]?.label}
            <span className="text-muted-foreground font-normal ml-2">({filteredOrders.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No orders found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <>
                    <TableRow key={order.id}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                        >
                          {expandedOrder === order.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        #{order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        {order.profile ? (
                          <div>
                            <p className="font-medium">
                              {order.profile.first_name} {order.profile.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">{order.profile.phone}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>{order.order_items.length} items</TableCell>
                      <TableCell>
                        {order.total_price ? formatPrice(order.total_price) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => openPricingDialog(order)}
                          >
                            <DollarSign className="w-3 h-3" />
                            Set Price
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.payment_slips.length > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => handleViewPaymentSlip(order.payment_slips[0].file_path)}
                          >
                            <FileImage className="w-3 h-3" />
                            View Slip
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No slip</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.status}
                          onValueChange={(v) => handleStatusChange(order.id, v, order)}
                        >
                          <SelectTrigger className="w-40 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((status) => (
                              <SelectItem key={status} value={status} className="text-xs">
                                {ORDER_STATUSES[status as keyof typeof ORDER_STATUSES]?.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                    {expandedOrder === order.id && (
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={9}>
                          <div className="p-4 space-y-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold mb-2">Order Items</h4>
                                {order.notes && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    Notes: {order.notes}
                                  </p>
                                )}
                              </div>
                              {order.profile && (
                                <div className="text-right text-sm">
                                  <p className="font-medium">Delivery Address:</p>
                                  <p className="text-muted-foreground">{order.profile.address}</p>
                                </div>
                              )}
                            </div>
                            <div className="grid gap-2">
                              {order.order_items.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-4 p-3 bg-card rounded-lg border"
                                >
                                  <div
                                    className="w-6 h-6 rounded-full border"
                                    style={{ backgroundColor: item.color }}
                                  />
                                  <div className="flex-1">
                                    <p className="font-medium">{item.file_name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {item.material.toUpperCase()} • {item.quality} quality • {item.infill_percentage}% infill
                                    </p>
                                  </div>
                                  <span className="font-medium">×{item.quantity}</span>
                                  {item.price && (
                                    <span className="font-medium text-primary">
                                      {formatPrice(item.price)}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                            {order.total_price && (
                              <div className="flex justify-end gap-4 text-sm">
                                <span className="text-muted-foreground">
                                  Delivery: {formatPrice(order.delivery_charge || 0)}
                                </span>
                                <span className="font-bold">
                                  Total: {formatPrice(order.total_price)}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pricing Dialog */}
      <Dialog open={!!pricingOrder} onOpenChange={() => setPricingOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Set Order Prices</DialogTitle>
          </DialogHeader>
          
          {pricingOrder && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Order #{pricingOrder.id.slice(0, 8)} • {pricingOrder.profile?.first_name} {pricingOrder.profile?.last_name}
              </div>

              <div className="space-y-3">
                {pricingOrder.order_items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div
                      className="w-6 h-6 rounded-full border flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.material.toUpperCase()} • {item.quality} • {item.infill_percentage}% • ×{item.quantity}
                      </p>
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        placeholder="Price (LKR)"
                        value={itemPrices[item.id] || ""}
                        onChange={(e) => 
                          setItemPrices({ ...itemPrices, [item.id]: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 p-3 border rounded-lg bg-muted/50">
                <div className="flex-1">
                  <Label>Delivery Charge</Label>
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold text-primary">
                  {formatPrice(calculateTotal())}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPricingOrder(null)}>
              Cancel
            </Button>
            <Button onClick={handleSavePrices} disabled={isSavingPrices}>
              {isSavingPrices ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Save & Notify Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Slip Viewer */}
      <Dialog open={!!viewingSlip} onOpenChange={() => setViewingSlip(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Payment Slip</DialogTitle>
          </DialogHeader>
          
          {viewingSlip && (
            <div className="space-y-4">
              <div className="max-h-[60vh] overflow-auto rounded-lg border">
                {viewingSlip.includes('.pdf') ? (
                  <iframe src={viewingSlip} className="w-full h-[60vh]" />
                ) : (
                  <img src={viewingSlip} alt="Payment slip" className="w-full" />
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="destructive" 
              onClick={() => {
                const order = orders.find(o => 
                  o.payment_slips.some(s => viewingSlip?.includes(s.file_path.split('/').pop() || ''))
                );
                if (order) {
                  handleVerifyPayment(order.id, order.payment_slips[0].id, false);
                }
              }}
            >
              Reject Payment
            </Button>
            <Button 
              onClick={() => {
                const order = orders.find(o => 
                  o.payment_slips.some(s => viewingSlip?.includes(s.file_path.split('/').pop() || ''))
                );
                if (order) {
                  handleVerifyPayment(order.id, order.payment_slips[0].id, true);
                }
              }}
            >
              Approve Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
