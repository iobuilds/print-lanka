import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Send, Users, Loader2, MessageSquare, Filter, 
  CheckCircle, XCircle, Clock, Megaphone 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  recipient_filter: Record<string, unknown>;
  recipient_count: number;
  sent_count: number;
  status: string;
  created_at: string;
  sent_at: string | null;
}

export default function AdminSMSCampaigns() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Campaign creation state
  const [campaignName, setCampaignName] = useState("");
  const [message, setMessage] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [minOrderValue, setMinOrderValue] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewRecipients, setPreviewRecipients] = useState<Profile[]>([]);

  // Fetch campaigns
  const { data: campaigns, isLoading: loadingCampaigns } = useQuery({
    queryKey: ["sms-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
  });

  // Fetch users with profiles
  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles-for-sms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, first_name, last_name, phone, email")
        .order("first_name");
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fetch users with orders
  const { data: orderedUsers } = useQuery({
    queryKey: ["ordered-users"],
    queryFn: async () => {
      // Get unique user IDs from orders
      const { data: orders, error } = await supabase
        .from("orders")
        .select("user_id, total_price")
        .not("total_price", "is", null);
      
      if (error) throw error;

      // Aggregate order totals by user
      const userTotals: Record<string, number> = {};
      orders?.forEach((order) => {
        if (order.user_id && order.total_price) {
          userTotals[order.user_id] = (userTotals[order.user_id] || 0) + Number(order.total_price);
        }
      });

      return userTotals;
    },
  });

  // Get filtered recipients based on criteria
  const getFilteredRecipients = (): Profile[] => {
    if (!profiles) return [];

    switch (filterType) {
      case "all":
        return profiles;
      case "selected":
        return profiles.filter((p) => selectedUsers.includes(p.user_id));
      case "ordered":
        // Users who have placed at least one order
        return profiles.filter((p) => orderedUsers && p.user_id in orderedUsers);
      case "high_value":
        // Users with total order value >= minOrderValue
        const minValue = parseFloat(minOrderValue) || 5000;
        return profiles.filter(
          (p) => orderedUsers && (orderedUsers[p.user_id] || 0) >= minValue
        );
      default:
        return profiles;
    }
  };

  const handlePreview = () => {
    const recipients = getFilteredRecipients();
    setPreviewRecipients(recipients);
    setShowPreview(true);
  };

  const handleSendCampaign = async () => {
    if (!message.trim()) {
      toast({ title: "Error", description: "Message is required", variant: "destructive" });
      return;
    }

    const recipients = getFilteredRecipients();
    if (recipients.length === 0) {
      toast({ title: "Error", description: "No recipients selected", variant: "destructive" });
      return;
    }

    setIsSending(true);

    try {
      // Create campaign record
      const { data: campaign, error: campaignError } = await supabase
        .from("sms_campaigns")
        .insert({
          name: campaignName || `Campaign ${format(new Date(), "MMM d, yyyy HH:mm")}`,
          message,
          recipient_filter: { type: filterType, minOrderValue, selectedUsers },
          recipient_count: recipients.length,
          status: "sending",
          created_by: user?.id,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Collect all phone numbers (comma-separated for bulk SMS)
      const phoneNumbers = recipients
        .map((r) => r.phone)
        .filter((phone) => phone && phone.length >= 9)
        .join(",");

      // Send bulk SMS via edge function
      const { data: smsResult, error: smsError } = await supabase.functions.invoke("send-sms", {
        body: {
          phone: phoneNumbers,
          message,
          user_id: user?.id,
        },
      });

      // Create recipient records
      for (const recipient of recipients) {
        await supabase.from("sms_campaign_recipients").insert({
          campaign_id: campaign.id,
          user_id: recipient.user_id,
          phone: recipient.phone,
          status: smsResult?.success ? "sent" : "failed",
          sent_at: new Date().toISOString(),
          provider_response: JSON.stringify(smsResult),
        });
      }

      // Update campaign status
      await supabase
        .from("sms_campaigns")
        .update({
          status: smsResult?.success ? "sent" : "failed",
          sent_count: smsResult?.success ? recipients.length : 0,
          sent_at: new Date().toISOString(),
        })
        .eq("id", campaign.id);

      queryClient.invalidateQueries({ queryKey: ["sms-campaigns"] });

      toast({
        title: smsResult?.success ? "Campaign Sent!" : "Campaign Failed",
        description: smsResult?.success
          ? `Message sent to ${recipients.length} recipients`
          : "Failed to send SMS. Check logs.",
        variant: smsResult?.success ? "default" : "destructive",
      });

      // Reset form
      setCampaignName("");
      setMessage("");
      setSelectedUsers([]);
      setShowPreview(false);
    } catch (error: any) {
      console.error("Campaign error:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    if (profiles) {
      setSelectedUsers(profiles.map((p) => p.user_id));
    }
  };

  const clearSelection = () => {
    setSelectedUsers([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">SMS Campaigns</h1>
        <p className="text-muted-foreground">Send promotional messages to customers</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Campaign Creator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5" />
              Create Campaign
            </CardTitle>
            <CardDescription>Send SMS to selected customers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Campaign Name (Optional)</Label>
              <Input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Summer Sale Promotion"
              />
            </div>

            <div>
              <Label>Message *</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your promotional message..."
                rows={4}
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {message.length}/160 characters
              </p>
            </div>

            <Separator />

            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Filter className="w-4 h-4" />
                Recipient Filter
              </Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Registered Users</SelectItem>
                  <SelectItem value="ordered">Users Who Have Ordered</SelectItem>
                  <SelectItem value="high_value">High Value Customers</SelectItem>
                  <SelectItem value="selected">Select Specific Users</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filterType === "high_value" && (
              <div>
                <Label>Minimum Total Order Value (LKR)</Label>
                <Input
                  type="number"
                  value={minOrderValue}
                  onChange={(e) => setMinOrderValue(e.target.value)}
                  placeholder="5000"
                />
              </div>
            )}

            {filterType === "selected" && profiles && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Select Users ({selectedUsers.length} selected)</Label>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAllUsers}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearSelection}>
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {profiles.map((profile) => (
                    <div
                      key={profile.user_id}
                      className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => toggleUserSelection(profile.user_id)}
                    >
                      <Checkbox checked={selectedUsers.includes(profile.user_id)} />
                      <span className="text-sm">
                        {profile.first_name} {profile.last_name}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {profile.phone}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePreview} className="flex-1">
                <Users className="w-4 h-4 mr-2" />
                Preview ({getFilteredRecipients().length})
              </Button>
              <Button
                onClick={handleSendCampaign}
                disabled={isSending || !message.trim()}
                className="flex-1"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Campaign
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Campaign History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Campaign History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCampaigns ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : campaigns?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No campaigns yet</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {campaigns?.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="p-3 border rounded-lg space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(campaign.created_at), "MMM d, yyyy HH:mm")}
                        </p>
                      </div>
                      <Badge
                        variant={
                          campaign.status === "sent"
                            ? "default"
                            : campaign.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {campaign.status === "sent" && <CheckCircle className="w-3 h-3 mr-1" />}
                        {campaign.status === "failed" && <XCircle className="w-3 h-3 mr-1" />}
                        {campaign.status === "sending" && <Clock className="w-3 h-3 mr-1" />}
                        {campaign.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {campaign.message}
                    </p>
                    <p className="text-xs">
                      Sent: {campaign.sent_count}/{campaign.recipient_count} recipients
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Campaign Preview</DialogTitle>
            <DialogDescription>
              {previewRecipients.length} recipients will receive this message
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">{message || "(No message entered)"}</p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRecipients.map((recipient) => (
                    <TableRow key={recipient.user_id}>
                      <TableCell>
                        {recipient.first_name} {recipient.last_name}
                      </TableCell>
                      <TableCell>{recipient.phone}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            <Button onClick={handleSendCampaign} disabled={isSending}>
              {isSending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Confirm & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
