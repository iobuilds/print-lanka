import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Trash2, UserPlus, Percent, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_value: number | null;
  max_uses: number | null;
  uses_per_user: number | null;
  current_uses: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
}

export default function AdminCoupons() {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");

  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: 10,
    min_order_value: 0,
    max_uses: "",
    uses_per_user: "1", // "1" = one-time per user, "" = unlimited per user
    valid_until: "",
  });

  useEffect(() => {
    fetchCoupons();
    fetchProfiles();
  }, []);

  const fetchCoupons = async () => {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCoupons(data);
    }
    setIsLoading(false);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, user_id, first_name, last_name, phone")
      .order("first_name");

    if (data) {
      setProfiles(data);
    }
  };

  const handleCreateCoupon = async () => {
    if (!newCoupon.code.trim()) {
      toast.error("Coupon code is required");
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase.from("coupons").insert({
        code: newCoupon.code.toUpperCase(),
        discount_type: newCoupon.discount_type,
        discount_value: newCoupon.discount_value,
        min_order_value: newCoupon.min_order_value || 0,
        max_uses: newCoupon.max_uses ? parseInt(newCoupon.max_uses) : null,
        uses_per_user: newCoupon.uses_per_user ? parseInt(newCoupon.uses_per_user) : null,
        valid_until: newCoupon.valid_until || null,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success("Coupon created successfully");
      setCreateDialogOpen(false);
      setNewCoupon({
        code: "",
        discount_type: "percentage",
        discount_value: 10,
        min_order_value: 0,
        max_uses: "",
        uses_per_user: "1",
        valid_until: "",
      });
      fetchCoupons();
    } catch (error: any) {
      toast.error(error.message || "Failed to create coupon");
    } finally {
      setIsCreating(false);
    }
  };

  const handleAssignCoupon = async () => {
    if (!selectedCoupon || !selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    setIsAssigning(true);
    try {
      const { error } = await supabase.from("user_coupons").insert({
        user_id: selectedUserId,
        coupon_id: selectedCoupon.id,
        assigned_by: user?.id,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("User already has this coupon");
        } else {
          throw error;
        }
      } else {
        toast.success("Coupon assigned successfully");
        setAssignDialogOpen(false);
        setSelectedUserId("");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to assign coupon");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    const { error } = await supabase
      .from("coupons")
      .update({ is_active: !coupon.is_active })
      .eq("id", coupon.id);

    if (!error) {
      fetchCoupons();
      toast.success(`Coupon ${!coupon.is_active ? "activated" : "deactivated"}`);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    const { error } = await supabase.from("coupons").delete().eq("id", id);

    if (!error) {
      fetchCoupons();
      toast.success("Coupon deleted");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Coupons</h1>
          <p className="text-muted-foreground">Create and manage discount coupons</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary-gradient">
              <Plus className="w-4 h-4 mr-2" />
              Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Coupon</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Coupon Code</Label>
                <Input
                  placeholder="e.g., SAVE20"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select
                    value={newCoupon.discount_type}
                    onValueChange={(v) => setNewCoupon({ ...newCoupon, discount_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (LKR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Discount Value</Label>
                  <Input
                    type="number"
                    value={newCoupon.discount_value}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Global Uses</Label>
                  <Input
                    type="number"
                    placeholder="Unlimited"
                    value={newCoupon.max_uses}
                    onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Total times this coupon can be used</p>
                </div>
                <div className="space-y-2">
                  <Label>Uses Per User</Label>
                  <Select
                    value={newCoupon.uses_per_user}
                    onValueChange={(v) => setNewCoupon({ ...newCoupon, uses_per_user: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">One-time per user</SelectItem>
                      <SelectItem value="">Unlimited per user</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">How many times each user can use</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Min Order Value (LKR)</Label>
                <Input
                  type="number"
                  value={newCoupon.min_order_value}
                  onChange={(e) => setNewCoupon({ ...newCoupon, min_order_value: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Expiry Date (optional)</Label>
                <Input
                  type="date"
                  value={newCoupon.valid_until}
                  onChange={(e) => setNewCoupon({ ...newCoupon, valid_until: e.target.value })}
                />
              </div>

              <Button onClick={handleCreateCoupon} disabled={isCreating} className="w-full">
                {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Coupon
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Assign Coupon Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Coupon to User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Assigning: <strong>{selectedCoupon?.code}</strong>
            </p>
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.first_name} {profile.last_name} ({profile.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAssignCoupon} disabled={isAssigning} className="w-full">
              {isAssigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Assign Coupon
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All Coupons</CardTitle>
          <CardDescription>Manage your discount coupons</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : coupons.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No coupons created yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {coupon.discount_type === "percentage" ? (
                          <Percent className="w-3 h-3" />
                        ) : (
                          <DollarSign className="w-3 h-3" />
                        )}
                        {coupon.discount_value}
                        {coupon.discount_type === "percentage" ? "%" : " LKR"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {coupon.current_uses}/{coupon.max_uses || "∞"}
                    </TableCell>
                    <TableCell>
                      {coupon.valid_until 
                        ? new Date(coupon.valid_until).toLocaleDateString()
                        : "Never"
                      }
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={coupon.is_active}
                        onCheckedChange={() => handleToggleActive(coupon)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCoupon(coupon);
                            setAssignDialogOpen(true);
                          }}
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteCoupon(coupon.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
