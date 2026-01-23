import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { formatPrice, ORDER_STATUSES } from "@/lib/constants";
import { toast } from "sonner";

interface Order {
  id: string;
  status: string;
  total_price: number | null;
  delivery_charge: number | null;
  created_at: string;
  user_id: string;
  profile: {
    first_name: string;
    last_name: string;
    phone: string;
  } | null;
  order_items: {
    id: string;
    file_name: string;
    quantity: number;
    color: string;
    material: string;
    quality: string;
    infill_percentage: number;
  }[];
}

const statusOptions = Object.keys(ORDER_STATUSES);

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

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
          phone
        ),
        order_items (
          id,
          file_name,
          quantity,
          color,
          material,
          quality,
          infill_percentage
        )
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Map the data to handle potential null profiles
      const mappedOrders = data.map((order: any) => ({
        ...order,
        profile: Array.isArray(order.profile) ? order.profile[0] : order.profile
      }));
      setOrders(mappedOrders);
    }
    setIsLoading(false);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus as any })
      .eq("id", orderId);

    if (!error) {
      fetchOrders();
      toast.success("Order status updated");
    } else {
      toast.error("Failed to update status");
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
          <p className="text-muted-foreground">Manage customer orders</p>
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
                        {order.total_price ? formatPrice(order.total_price) : "Not priced"}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.status}
                          onValueChange={(v) => handleStatusChange(order.id, v)}
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
                        <TableCell colSpan={8}>
                          <div className="p-4 space-y-3">
                            <h4 className="font-semibold">Order Items</h4>
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
                                </div>
                              ))}
                            </div>
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
    </div>
  );
}
