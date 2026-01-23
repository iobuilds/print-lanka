import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, Package, Tag, Clock, CheckCircle, XCircle, 
  Truck, Printer, CreditCard, Edit2, Save, Loader2,
  Calendar, Percent, ChevronRight
} from "lucide-react";
import { formatPrice, ORDER_STATUSES } from "@/lib/constants";
import { toast } from "sonner";

interface Order {
  id: string;
  status: string;
  total_price: number | null;
  delivery_charge: number | null;
  created_at: string;
  notes: string | null;
  order_items: {
    id: string;
    file_name: string;
    quantity: number;
    color: string;
    material: string;
    quality: string;
  }[];
}

interface UserCoupon {
  id: string;
  is_used: boolean;
  used_at: string | null;
  assigned_at: string;
  coupon: {
    code: string;
    discount_type: string;
    discount_value: number;
    valid_until: string | null;
  };
}

const statusIcons: Record<string, React.ReactNode> = {
  pending_review: <Clock className="w-4 h-4" />,
  priced_awaiting_payment: <CreditCard className="w-4 h-4" />,
  payment_submitted: <CreditCard className="w-4 h-4" />,
  payment_approved: <CheckCircle className="w-4 h-4" />,
  in_production: <Printer className="w-4 h-4" />,
  ready_to_ship: <Package className="w-4 h-4" />,
  shipped: <Truck className="w-4 h-4" />,
  completed: <CheckCircle className="w-4 h-4" />,
  rejected: <XCircle className="w-4 h-4" />,
  payment_rejected: <XCircle className="w-4 h-4" />,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, refreshProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<UserCoupon[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setEditForm({
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        address: profile.address,
      });
    }
  }, [profile]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          status,
          total_price,
          delivery_charge,
          created_at,
          notes,
          order_items (
            id,
            file_name,
            quantity,
            color,
            material,
            quality
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setOrders(data);
      }
      setIsLoadingOrders(false);
    };

    const fetchCoupons = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("user_coupons")
        .select(`
          id,
          is_used,
          used_at,
          assigned_at,
          coupon:coupons (
            code,
            discount_type,
            discount_value,
            valid_until
          )
        `)
        .eq("user_id", user.id)
        .order("assigned_at", { ascending: false });

      if (!error && data) {
        const mappedCoupons = data.map((uc: any) => ({
          id: uc.id,
          is_used: uc.is_used,
          used_at: uc.used_at,
          assigned_at: uc.assigned_at,
          coupon: uc.coupon
        }));
        setCoupons(mappedCoupons);
      }
      setIsLoadingCoupons(false);
    };

    if (user) {
      fetchOrders();
      fetchCoupons();
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          phone: editForm.phone,
          address: editForm.address,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      
      await refreshProfile();
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES];
    if (!statusInfo) return <Badge variant="outline">{status}</Badge>;

    const isError = status.includes("rejected");
    const isSuccess = status === "completed" || status === "shipped";
    const isPending = status.includes("pending") || status.includes("awaiting");

    return (
      <Badge 
        variant="outline" 
        className={`gap-1 ${
          isError ? "border-destructive text-destructive" :
          isSuccess ? "border-success text-success" :
          isPending ? "border-warning text-warning" :
          "border-primary text-primary"
        }`}
      >
        {statusIcons[status]}
        {statusInfo.label}
      </Badge>
    );
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold">My Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your orders, coupons, and profile
            </p>
          </div>

          <Tabs defaultValue="orders" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
              <TabsTrigger value="orders" className="gap-2">
                <Package className="w-4 h-4" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="coupons" className="gap-2">
                <Tag className="w-4 h-4" />
                Coupons
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-2">
                <User className="w-4 h-4" />
                Profile
              </TabsTrigger>
            </TabsList>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Order History</CardTitle>
                  <CardDescription>
                    View all your orders and their status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingOrders ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground mb-4">No orders yet</p>
                      <Button onClick={() => navigate("/")}>
                        Start Your First Order
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <Card key={order.id} className="hover:border-primary/30 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-sm text-muted-foreground">
                                    #{order.id.slice(0, 8)}
                                  </span>
                                  {getStatusBadge(order.status)}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {order.order_items.map((item) => (
                                    <div 
                                      key={item.id}
                                      className="flex items-center gap-2 bg-secondary px-2 py-1 rounded text-sm"
                                    >
                                      <div 
                                        className="w-3 h-3 rounded-full border"
                                        style={{ backgroundColor: item.color }}
                                      />
                                      <span className="truncate max-w-[150px]">{item.file_name}</span>
                                      <span className="text-muted-foreground">×{item.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="font-semibold">
                                    {order.total_price ? formatPrice(order.total_price) : "Pending quote"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(order.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <Button variant="ghost" size="icon">
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Coupons Tab */}
            <TabsContent value="coupons" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>My Coupons</CardTitle>
                  <CardDescription>
                    View your available and used coupons
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingCoupons ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : coupons.length === 0 ? (
                    <div className="text-center py-12">
                      <Tag className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground">No coupons available</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Coupons will appear here when assigned to your account
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {coupons.map((uc) => {
                        const isExpired = uc.coupon.valid_until && new Date(uc.coupon.valid_until) < new Date();
                        const isAvailable = !uc.is_used && !isExpired;

                        return (
                          <Card 
                            key={uc.id} 
                            className={`relative overflow-hidden ${
                              isAvailable ? "border-primary/30 bg-primary/5" : "opacity-60"
                            }`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Percent className="w-5 h-5 text-primary" />
                                    <span className="font-display font-bold text-lg">
                                      {uc.coupon.code}
                                    </span>
                                  </div>
                                  <p className="text-2xl font-bold text-primary">
                                    {uc.coupon.discount_type === "percentage" 
                                      ? `${uc.coupon.discount_value}% OFF`
                                      : `LKR ${uc.coupon.discount_value} OFF`
                                    }
                                  </p>
                                </div>
                                <Badge variant={isAvailable ? "default" : "secondary"}>
                                  {uc.is_used ? "Used" : isExpired ? "Expired" : "Available"}
                                </Badge>
                              </div>
                              
                              <Separator className="my-3" />
                              
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {uc.coupon.valid_until 
                                    ? `Expires ${new Date(uc.coupon.valid_until).toLocaleDateString()}`
                                    : "No expiry"
                                  }
                                </div>
                                {uc.is_used && uc.used_at && (
                                  <span>Used on {new Date(uc.used_at).toLocaleDateString()}</span>
                                )}
                              </div>
                            </CardContent>
                            
                            {/* Decorative dashed border */}
                            <div className="absolute left-0 top-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 bg-background rounded-full" />
                            <div className="absolute right-0 top-1/2 w-4 h-4 translate-x-1/2 -translate-y-1/2 bg-background rounded-full" />
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Your personal details and delivery address
                    </CardDescription>
                  </div>
                  {!isEditing ? (
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveProfile} disabled={isSaving}>
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name</Label>
                      {isEditing ? (
                        <Input
                          id="first_name"
                          value={editForm.first_name}
                          onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                        />
                      ) : (
                        <p className="text-lg">{profile?.first_name || "-"}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      {isEditing ? (
                        <Input
                          id="last_name"
                          value={editForm.last_name}
                          onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                        />
                      ) : (
                        <p className="text-lg">{profile?.last_name || "-"}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      {isEditing ? (
                        <Input
                          id="phone"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-lg">{profile?.phone || "-"}</p>
                          {profile?.phone_verified && (
                            <Badge variant="outline" className="text-success border-success">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <p className="text-lg text-muted-foreground">{profile?.email || "-"}</p>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Delivery Address</Label>
                      {isEditing ? (
                        <Input
                          id="address"
                          value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          placeholder="Enter your full delivery address"
                        />
                      ) : (
                        <p className="text-lg">{profile?.address || "-"}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
