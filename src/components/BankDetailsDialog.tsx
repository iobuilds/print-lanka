import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Building2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BankDetail {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch: string | null;
}

interface BankDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BankDetailsDialog({ open, onOpenChange }: BankDetailsDialogProps) {
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchBankDetails();
    }
  }, [open]);

  const fetchBankDetails = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("bank_details")
      .select("id, bank_name, account_name, account_number, branch")
      .eq("is_active", true)
      .order("created_at");

    if (!error && data) {
      setBankDetails(data);
    }
    setIsLoading(false);
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Payment Account Details
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : bankDetails.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No payment accounts available. Please contact support.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please transfer the payment to one of the following accounts:
              </p>
              {bankDetails.map((bank) => (
                <Card key={bank.id} className="bg-secondary/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-lg">{bank.bank_name}</span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Account Name:</span>
                        <span className="font-medium">{bank.account_name}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Account Number:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{bank.account_number}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopy(bank.account_number, bank.id)}
                          >
                            {copiedId === bank.id ? (
                              <Check className="w-3 h-3 text-success" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      {bank.branch && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Branch:</span>
                          <span className="font-medium">{bank.branch}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              <p className="text-xs text-muted-foreground text-center">
                After transfer, upload your payment slip in your dashboard.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
