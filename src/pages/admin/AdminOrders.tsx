import { useState, useEffect, Fragment, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, ChevronDown, ChevronUp, DollarSign, Send, FileImage, 
  Search, Download, Eye, RefreshCw, Bell, MapPin, Phone, Mail,
  Package, Calendar, FileText
} from "lucide-react";
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
  notes: string | null;
}

interface PaymentSlip {
  id: string;
  file_name: string;
  file_path: string;
  verified: boolean;
  uploaded_at: string;
}

interface Profile {
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  email: string | null;
}

interface Order {
  id: string;
  status: string;
  total_price: number | null;
  delivery_charge: number | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
  user_id: string;
  priced_at: string | null;
  paid_at: string | null;
  profile: Profile | null;
  order_items: OrderItem[];
  payment_slips: PaymentSlip[];
}

const statusOptions = Object.keys(ORDER_STATUSES);

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [pricingOrder, setPricingOrder] = useState<Order | null>(null);
  const [itemPrices, setItemPrices] = useState<Record<string, number>>({});
  const [deliveryCharge, setDeliveryCharge] = useState<number>(350);
  const [isSavingPrices, setIsSavingPrices] = useState(false);
  const [viewingSlip, setViewingSlip] = useState<string | null>(null);
  const [viewingSlipOrderId, setViewingSlipOrderId] = useState<string | null>(null);
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();

    // Set up real-time subscription
    const channel = supabase
      .channel('admin-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('Order change detected:', payload);
          // Show notification for new orders
          if (payload.eventType === 'INSERT') {
            toast.info("New order received!", {
              icon: <Bell className="w-4 h-4" />,
              action: {
                label: "View",
                onClick: () => fetchOrders(),
              },
            });
          }
          fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_slips',
        },
        (payload) => {
          console.log('Payment slip change detected:', payload);
          if (payload.eventType === 'INSERT') {
            toast.info("New payment slip uploaded!", {
              icon: <FileImage className="w-4 h-4" />,
            });
          }
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id,
            file_name,
            file_path,
            quantity,
            color,
            material,
            quality,
            infill_percentage,
            price,
            notes
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

      if (ordersError) {
        console.error("Error fetching orders:", ordersError);
        toast.error("Failed to load orders");
        setIsLoading(false);
        return;
      }

      const userIds = [...new Set(ordersData?.map(o => o.user_id) || [])];
      
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, phone, address, email")
        .in("user_id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      const profileMap = new Map<string, Profile>();
      profilesData?.forEach(p => {
        profileMap.set(p.user_id, {
          first_name: p.first_name,
          last_name: p.last_name,
          phone: p.phone,
          address: p.address,
          email: p.email,
        });
      });

      const mappedOrders: Order[] = (ordersData || []).map((order: any) => ({
        ...order,
        profile: profileMap.get(order.user_id) || null,
        payment_slips: order.payment_slips || [],
        order_items: order.order_items || [],
      }));

      setOrders(mappedOrders);
    } catch (error) {
      console.error("Error in fetchOrders:", error);
      toast.error("Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    let result = orders;

    // Filter by status
    if (filterStatus !== "all") {
      result = result.filter(o => o.status === filterStatus);
    }

    // Search by order ID, customer name, phone, or email
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(order => {
        const orderId = order.id.toLowerCase();
        const customerName = `${order.profile?.first_name || ''} ${order.profile?.last_name || ''}`.toLowerCase();
        const phone = order.profile?.phone?.toLowerCase() || '';
        const email = order.profile?.email?.toLowerCase() || '';
        
        return orderId.includes(query) || 
               customerName.includes(query) || 
               phone.includes(query) ||
               email.includes(query);
      });
    }

    return result;
  }, [orders, filterStatus, searchQuery]);

  const handleStatusChange = async (orderId: string, newStatus: string, order: Order) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus as any })
      .eq("id", orderId);

    if (!error) {
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
      for (const [itemId, price] of Object.entries(itemPrices)) {
        const { error } = await supabase
          .from("order_items")
          .update({ price })
          .eq("id", itemId);

        if (error) throw error;
      }

      const total = calculateTotal();
      const isFirstPricing = pricingOrder.status === "pending_review";
      
      // Only change status and send notification if this is the first pricing
      const updateData: any = {
        total_price: total,
        delivery_charge: deliveryCharge,
      };

      if (isFirstPricing) {
        updateData.status = "priced_awaiting_payment";
        updateData.priced_at = new Date().toISOString();
      }

      const { error: orderError } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", pricingOrder.id);

      if (orderError) throw orderError;

      // Only send SMS notification for first pricing
      if (isFirstPricing && pricingOrder.profile?.phone) {
        try {
          await supabase.functions.invoke("send-sms", {
            body: {
              phone: pricingOrder.profile.phone,
              message: `Your order #${pricingOrder.id.slice(0, 8)} has been priced at ${formatPrice(total)}. Please upload your bank transfer slip to proceed.`,
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
      toast.success(isFirstPricing ? "Prices saved and customer notified" : "Prices updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to save prices");
    } finally {
      setIsSavingPrices(false);
    }
  };

  const handleViewPaymentSlip = async (filePath: string, orderId: string) => {
    const { data } = await supabase.storage
      .from("payment-slips")
      .createSignedUrl(filePath, 300);

    if (data?.signedUrl) {
      setViewingSlip(data.signedUrl);
      setViewingSlipOrderId(orderId);
    } else {
      toast.error("Failed to load payment slip");
    }
  };

  const handleVerifyPayment = async (orderId: string, slipId: string, approved: boolean) => {
    try {
      await supabase
        .from("payment_slips")
        .update({
          verified: approved,
          verified_at: new Date().toISOString(),
        })
        .eq("id", slipId);

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
      setViewingSlipOrderId(null);
      toast.success(approved ? "Payment approved" : "Payment rejected");
    } catch (error: any) {
      toast.error(error.message || "Failed to verify payment");
    }
  };

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    setIsDownloading(filePath);
    try {
      const { data, error } = await supabase.storage
        .from("models")
        .download(filePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${fileName}`);
    } catch (error: any) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    } finally {
      setIsDownloading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES];
    const isError = status.includes("rejected");
    const isSuccess = status === "completed" || status === "shipped";

    return (
      <Badge 
        variant="outline" 
        className={
          isError ? "border-destructive text-destructive" :
          isSuccess ? "border-green-500 text-green-600" :
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
        <Button variant="outline" size="sm" onClick={fetchOrders} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by order ID, customer name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders ({orders.length})</SelectItem>
                {statusOptions.map((status) => {
                  const count = orders.filter(o => o.status === status).length;
                  return (
                    <SelectItem key={status} value={status}>
                      {ORDER_STATUSES[status as keyof typeof ORDER_STATUSES]?.label} ({count})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
            <p className="text-center text-muted-foreground py-12">
              {searchQuery ? "No orders match your search" : "No orders found"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
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
                  <Fragment key={order.id}>
                    <TableRow className="hover:bg-muted/50">
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
                        <button 
                          onClick={() => setDetailsOrder(order)}
                          className="hover:text-primary hover:underline"
                        >
                          #{order.id.slice(0, 8)}
                        </button>
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
                        {order.total_price ? (
                          <div className="flex items-center gap-2">
                            <span>{formatPrice(order.total_price)}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2"
                              onClick={() => openPricingDialog(order)}
                            >
                              <DollarSign className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
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
                            onClick={() => handleViewPaymentSlip(order.payment_slips[0].file_path, order.id)}
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
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDetailsOrder(order)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Select
                            value={order.status}
                            onValueChange={(v) => handleStatusChange(order.id, v, order)}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
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
                        </div>
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
                                    className="w-6 h-6 rounded-full border flex-shrink-0"
                                    style={{ backgroundColor: item.color }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{item.file_name}</p>
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
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDownloadFile(item.file_path, item.file_name)}
                                    disabled={isDownloading === item.file_path}
                                  >
                                    {isDownloading === item.file_path ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Download className="w-4 h-4" />
                                    )}
                                  </Button>
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
                  </Fragment>
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
      <Dialog open={!!viewingSlip} onOpenChange={() => { setViewingSlip(null); setViewingSlipOrderId(null); }}>
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
                const order = orders.find(o => o.id === viewingSlipOrderId);
                if (order && order.payment_slips.length > 0) {
                  handleVerifyPayment(order.id, order.payment_slips[0].id, false);
                }
              }}
            >
              Reject Payment
            </Button>
            <Button 
              onClick={() => {
                const order = orders.find(o => o.id === viewingSlipOrderId);
                if (order && order.payment_slips.length > 0) {
                  handleVerifyPayment(order.id, order.payment_slips[0].id, true);
                }
              }}
            >
              Approve Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={!!detailsOrder} onOpenChange={() => setDetailsOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Order Details
            </DialogTitle>
          </DialogHeader>
          
          {detailsOrder && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6 pr-4">
                {/* Order Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-lg font-semibold">#{detailsOrder.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      Full ID: {detailsOrder.id}
                    </p>
                  </div>
                  {getStatusBadge(detailsOrder.status)}
                </div>

                <Separator />

                {/* Customer Info */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Customer Information
                  </h4>
                  {detailsOrder.profile ? (
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-20">Name:</span>
                        <span className="font-medium">{detailsOrder.profile.first_name} {detailsOrder.profile.last_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{detailsOrder.profile.phone}</span>
                      </div>
                      {detailsOrder.profile.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span>{detailsOrder.profile.email}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <span>{detailsOrder.profile.address}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No customer information</p>
                  )}
                </div>

                <Separator />

                {/* Timeline */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Order Timeline
                  </h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{new Date(detailsOrder.created_at).toLocaleString()}</span>
                    </div>
                    {detailsOrder.priced_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Priced:</span>
                        <span>{new Date(detailsOrder.priced_at).toLocaleString()}</span>
                      </div>
                    )}
                    {detailsOrder.paid_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment Verified:</span>
                        <span>{new Date(detailsOrder.paid_at).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Updated:</span>
                      <span>{new Date(detailsOrder.updated_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Order Items */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Order Items ({detailsOrder.order_items.length})
                  </h4>
                  <div className="space-y-3">
                    {detailsOrder.order_items.map((item) => (
                      <div key={item.id} className="p-3 border rounded-lg">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-8 h-8 rounded-full border flex-shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{item.file_name}</p>
                            <div className="text-sm text-muted-foreground space-y-1 mt-1">
                              <p>Material: {item.material.toUpperCase()}</p>
                              <p>Quality: {item.quality}</p>
                              <p>Infill: {item.infill_percentage}%</p>
                              <p>Quantity: {item.quantity}</p>
                              {item.notes && <p>Notes: {item.notes}</p>}
                              {item.price && (
                                <p className="text-primary font-medium">Price: {formatPrice(item.price)}</p>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => handleDownloadFile(item.file_path, item.file_name)}
                            disabled={isDownloading === item.file_path}
                          >
                            {isDownloading === item.file_path ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Pricing Summary */}
                {detailsOrder.total_price && (
                  <div>
                    <h4 className="font-semibold mb-3">Pricing Summary</h4>
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Items Total:</span>
                        <span>{formatPrice((detailsOrder.total_price || 0) - (detailsOrder.delivery_charge || 0))}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Delivery Charge:</span>
                        <span>{formatPrice(detailsOrder.delivery_charge || 0)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>Total:</span>
                        <span className="text-primary">{formatPrice(detailsOrder.total_price)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {detailsOrder.notes && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-2">Order Notes</h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {detailsOrder.notes}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOrder(null)}>
              Close
            </Button>
            <Button onClick={() => {
              if (detailsOrder) {
                openPricingDialog(detailsOrder);
                setDetailsOrder(null);
              }
            }}>
              <DollarSign className="w-4 h-4 mr-2" />
              Set/Update Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}