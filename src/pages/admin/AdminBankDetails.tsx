import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Trash2, Edit2, Building2 } from "lucide-react";
import { toast } from "sonner";

interface BankDetail {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminBankDetails() {
  const { user } = useAuth();
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankDetail | null>(null);

  const [formData, setFormData] = useState({
    bank_name: "",
    account_name: "",
    account_number: "",
    branch: "",
  });

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    const { data, error } = await supabase
      .from("bank_details")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setBankDetails(data);
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      bank_name: "",
      account_name: "",
      account_number: "",
      branch: "",
    });
    setEditingBank(null);
  };

  const handleOpenDialog = (bank?: BankDetail) => {
    if (bank) {
      setEditingBank(bank);
      setFormData({
        bank_name: bank.bank_name,
        account_name: bank.account_name,
        account_number: bank.account_number,
        branch: bank.branch || "",
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.bank_name.trim() || !formData.account_name.trim() || !formData.account_number.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      if (editingBank) {
        const { error } = await supabase
          .from("bank_details")
          .update({
            bank_name: formData.bank_name,
            account_name: formData.account_name,
            account_number: formData.account_number,
            branch: formData.branch || null,
          })
          .eq("id", editingBank.id);

        if (error) throw error;
        toast.success("Bank details updated successfully");
      } else {
        const { error } = await supabase.from("bank_details").insert({
          bank_name: formData.bank_name,
          account_name: formData.account_name,
          account_number: formData.account_number,
          branch: formData.branch || null,
          created_by: user?.id,
        });

        if (error) throw error;
        toast.success("Bank details added successfully");
      }

      setDialogOpen(false);
      resetForm();
      fetchBankDetails();
    } catch (error: any) {
      toast.error(error.message || "Failed to save bank details");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (bank: BankDetail) => {
    const { error } = await supabase
      .from("bank_details")
      .update({ is_active: !bank.is_active })
      .eq("id", bank.id);

    if (!error) {
      fetchBankDetails();
      toast.success(`Bank account ${!bank.is_active ? "activated" : "deactivated"}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bank account?")) return;

    const { error } = await supabase.from("bank_details").delete().eq("id", id);

    if (!error) {
      fetchBankDetails();
      toast.success("Bank account deleted");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Bank Details</h1>
          <p className="text-muted-foreground">Manage payment account information shown to customers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary-gradient" onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Bank Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBank ? "Edit" : "Add"} Bank Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Bank Name *</Label>
                <Input
                  placeholder="e.g., Commercial Bank"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Account Name *</Label>
                <Input
                  placeholder="e.g., IO Builds LLC"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Account Number *</Label>
                <Input
                  placeholder="e.g., 1234567890"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Branch (optional)</Label>
                <Input
                  placeholder="e.g., Main Branch"
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                />
              </div>

              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingBank ? "Update" : "Add"} Bank Account
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Accounts</CardTitle>
          <CardDescription>Active accounts will be shown to customers when making payments</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : bankDetails.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No bank accounts added yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bank</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankDetails.map((bank) => (
                  <TableRow key={bank.id}>
                    <TableCell className="font-medium">{bank.bank_name}</TableCell>
                    <TableCell>{bank.account_name}</TableCell>
                    <TableCell className="font-mono">{bank.account_number}</TableCell>
                    <TableCell>{bank.branch || "-"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={bank.is_active}
                        onCheckedChange={() => handleToggleActive(bank)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDialog(bank)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(bank.id)}
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
