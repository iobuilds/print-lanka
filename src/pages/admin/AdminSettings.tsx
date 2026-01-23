import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, MessageSquare, Truck, Save, Loader2, TestTube } from "lucide-react";
import { toast } from "sonner";

interface SMSConfig {
  provider: string;
  api_key: string;
  api_secret: string;
  sender_id: string;
  api_url: string;
  enabled: boolean;
}

interface DeliveryConfig {
  base_charge: number;
  free_delivery_threshold: number;
  express_multiplier: number;
}

const defaultSmsConfig: SMSConfig = {
  provider: "dialog",
  api_key: "",
  api_secret: "",
  sender_id: "",
  api_url: "",
  enabled: false,
};

const defaultDeliveryConfig: DeliveryConfig = {
  base_charge: 350,
  free_delivery_threshold: 5000,
  express_multiplier: 1.5,
};

export default function AdminSettings() {
  const [smsConfig, setSmsConfig] = useState<SMSConfig>(defaultSmsConfig);
  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryConfig>(defaultDeliveryConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSms, setIsSavingSms] = useState(false);
  const [isSavingDelivery, setIsSavingDelivery] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    
    // Fetch SMS config
    const { data: smsData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "sms_config")
      .single();

    if (smsData?.value && typeof smsData.value === 'object' && !Array.isArray(smsData.value)) {
      setSmsConfig(smsData.value as unknown as SMSConfig);
    }

    // Fetch delivery config
    const { data: deliveryData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "delivery_config")
      .single();

    if (deliveryData?.value && typeof deliveryData.value === 'object' && !Array.isArray(deliveryData.value)) {
      setDeliveryConfig(deliveryData.value as unknown as DeliveryConfig);
    }

    setIsLoading(false);
  };

  const handleSaveSmsConfig = async () => {
    setIsSavingSms(true);
    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert({
          key: "sms_config",
          value: smsConfig as any,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "key"
        });

      if (error) throw error;
      toast.success("SMS settings saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save SMS settings");
    } finally {
      setIsSavingSms(false);
    }
  };

  const handleSaveDeliveryConfig = async () => {
    setIsSavingDelivery(true);
    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert({
          key: "delivery_config",
          value: deliveryConfig as any,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "key"
        });

      if (error) throw error;
      toast.success("Delivery settings saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save delivery settings");
    } finally {
      setIsSavingDelivery(false);
    }
  };

  const handleTestSms = async () => {
    if (!testPhone) {
      toast.error("Please enter a phone number");
      return;
    }

    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: {
          phone: testPhone,
          message: "This is a test message from Print3D Lanka. Your SMS notifications are working!",
          user_id: (await supabase.auth.getUser()).data.user?.id,
        },
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success("Test SMS sent successfully!");
      } else {
        toast.error(data?.message || "SMS sending failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send test SMS");
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure system settings</p>
      </div>

      <Tabs defaultValue="sms" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sms" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            SMS Notifications
          </TabsTrigger>
          <TabsTrigger value="delivery" className="gap-2">
            <Truck className="w-4 h-4" />
            Delivery
          </TabsTrigger>
        </TabsList>

        {/* SMS Settings */}
        <TabsContent value="sms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                SMS Provider Configuration
              </CardTitle>
              <CardDescription>
                Configure SMS notifications for order status updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sms-enabled">Enable SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send SMS alerts for order status changes
                  </p>
                </div>
                <Switch
                  id="sms-enabled"
                  checked={smsConfig.enabled}
                  onCheckedChange={(checked) => 
                    setSmsConfig({ ...smsConfig, enabled: checked })
                  }
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>SMS Provider</Label>
                  <Select
                    value={smsConfig.provider}
                    onValueChange={(v) => setSmsConfig({ ...smsConfig, provider: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dialog">Dialog (Sri Lanka)</SelectItem>
                      <SelectItem value="mobitel">Mobitel (Sri Lanka)</SelectItem>
                      <SelectItem value="twilio">Twilio (International)</SelectItem>
                      <SelectItem value="generic">Generic HTTP API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key / Account SID</Label>
                    <Input
                      id="api-key"
                      type="password"
                      value={smsConfig.api_key}
                      onChange={(e) => 
                        setSmsConfig({ ...smsConfig, api_key: e.target.value })
                      }
                      placeholder="Enter API key"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="api-secret">API Secret / Auth Token</Label>
                    <Input
                      id="api-secret"
                      type="password"
                      value={smsConfig.api_secret}
                      onChange={(e) => 
                        setSmsConfig({ ...smsConfig, api_secret: e.target.value })
                      }
                      placeholder="Enter API secret"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sender-id">Sender ID</Label>
                    <Input
                      id="sender-id"
                      value={smsConfig.sender_id}
                      onChange={(e) => 
                        setSmsConfig({ ...smsConfig, sender_id: e.target.value })
                      }
                      placeholder="e.g., Print3D"
                    />
                    <p className="text-xs text-muted-foreground">
                      The name shown as the sender
                    </p>
                  </div>

                  {(smsConfig.provider === "generic" || smsConfig.provider === "dialog" || smsConfig.provider === "mobitel") && (
                    <div className="space-y-2">
                      <Label htmlFor="api-url">API URL (Optional)</Label>
                      <Input
                        id="api-url"
                        value={smsConfig.api_url}
                        onChange={(e) => 
                          setSmsConfig({ ...smsConfig, api_url: e.target.value })
                        }
                        placeholder="https://api.example.com/send"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSmsConfig} disabled={isSavingSms}>
                  {isSavingSms ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save SMS Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Test SMS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Test SMS
              </CardTitle>
              <CardDescription>
                Send a test message to verify your configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  placeholder="+94771234567"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="max-w-xs"
                />
                <Button 
                  variant="outline" 
                  onClick={handleTestSms}
                  disabled={isTesting || !smsConfig.enabled}
                >
                  {isTesting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4 mr-2" />
                  )}
                  Send Test
                </Button>
              </div>
              {!smsConfig.enabled && (
                <p className="text-sm text-muted-foreground mt-2">
                  Enable SMS notifications to send test messages
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Settings */}
        <TabsContent value="delivery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Delivery Configuration
              </CardTitle>
              <CardDescription>
                Configure delivery charges and options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="base-charge">Base Delivery Charge (LKR)</Label>
                  <Input
                    id="base-charge"
                    type="number"
                    value={deliveryConfig.base_charge}
                    onChange={(e) => 
                      setDeliveryConfig({ ...deliveryConfig, base_charge: Number(e.target.value) })
                    }
                    placeholder="350"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="free-threshold">Free Delivery Threshold (LKR)</Label>
                  <Input
                    id="free-threshold"
                    type="number"
                    value={deliveryConfig.free_delivery_threshold}
                    onChange={(e) => 
                      setDeliveryConfig({ ...deliveryConfig, free_delivery_threshold: Number(e.target.value) })
                    }
                    placeholder="5000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Orders above this amount get free delivery
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="express-multiplier">Express Delivery Multiplier</Label>
                  <Input
                    id="express-multiplier"
                    type="number"
                    step="0.1"
                    value={deliveryConfig.express_multiplier}
                    onChange={(e) => 
                      setDeliveryConfig({ ...deliveryConfig, express_multiplier: Number(e.target.value) })
                    }
                    placeholder="1.5"
                  />
                  <p className="text-xs text-muted-foreground">
                    Multiply base charge for express delivery
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveDeliveryConfig} disabled={isSavingDelivery}>
                  {isSavingDelivery ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Delivery Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
