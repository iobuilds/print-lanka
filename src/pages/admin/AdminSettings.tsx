import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, MessageSquare, Truck, Save, Loader2, TestTube, DollarSign, Palette, Package } from "lucide-react";
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
  colombo_charge: number;
  island_min: number;
  island_max: number;
}

interface QualityPricing {
  draft: number;
  normal: number;
  high: number;
}

interface MaterialPricing {
  pla: number;
  petg: number;
  abs: number;
}

interface PricingConfig {
  quality_pricing: QualityPricing;
  material_surcharge: MaterialPricing;
  minimum_order: number;
  custom_color_surcharge: number;
  rush_order_multiplier: number;
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
  colombo_charge: 300,
  island_min: 400,
  island_max: 600,
};

const defaultPricingConfig: PricingConfig = {
  quality_pricing: {
    draft: 15,
    normal: 20,
    high: 30,
  },
  material_surcharge: {
    pla: 0,
    petg: 5,
    abs: 8,
  },
  minimum_order: 500,
  custom_color_surcharge: 200,
  rush_order_multiplier: 1.5,
};

export default function AdminSettings() {
  const [smsConfig, setSmsConfig] = useState<SMSConfig>(defaultSmsConfig);
  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryConfig>(defaultDeliveryConfig);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(defaultPricingConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSms, setIsSavingSms] = useState(false);
  const [isSavingDelivery, setIsSavingDelivery] = useState(false);
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    
    // Fetch all configs in parallel
    const [smsResult, deliveryResult, pricingResult] = await Promise.all([
      supabase.from("system_settings").select("value").eq("key", "sms_config").single(),
      supabase.from("system_settings").select("value").eq("key", "delivery_config").single(),
      supabase.from("system_settings").select("value").eq("key", "pricing_config").single(),
    ]);

    if (smsResult.data?.value && typeof smsResult.data.value === 'object' && !Array.isArray(smsResult.data.value)) {
      setSmsConfig(smsResult.data.value as unknown as SMSConfig);
    }

    if (deliveryResult.data?.value && typeof deliveryResult.data.value === 'object' && !Array.isArray(deliveryResult.data.value)) {
      setDeliveryConfig(deliveryResult.data.value as unknown as DeliveryConfig);
    }

    if (pricingResult.data?.value && typeof pricingResult.data.value === 'object' && !Array.isArray(pricingResult.data.value)) {
      setPricingConfig(pricingResult.data.value as unknown as PricingConfig);
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

  const handleSavePricingConfig = async () => {
    setIsSavingPricing(true);
    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert({
          key: "pricing_config",
          value: pricingConfig as any,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "key"
        });

      if (error) throw error;
      toast.success("Pricing settings saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save pricing settings");
    } finally {
      setIsSavingPricing(false);
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

      <Tabs defaultValue="pricing" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pricing" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Pricing
          </TabsTrigger>
          <TabsTrigger value="delivery" className="gap-2">
            <Truck className="w-4 h-4" />
            Delivery
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            SMS
          </TabsTrigger>
        </TabsList>

        {/* Pricing Settings */}
        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Quality Pricing (per gram)
              </CardTitle>
              <CardDescription>
                Set the base price per gram for each quality level
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="draft-price">Draft Quality (LKR/gram)</Label>
                  <Input
                    id="draft-price"
                    type="number"
                    value={pricingConfig.quality_pricing.draft}
                    onChange={(e) => 
                      setPricingConfig({
                        ...pricingConfig,
                        quality_pricing: { ...pricingConfig.quality_pricing, draft: Number(e.target.value) }
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">0.3mm layer height</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="normal-price">Normal Quality (LKR/gram)</Label>
                  <Input
                    id="normal-price"
                    type="number"
                    value={pricingConfig.quality_pricing.normal}
                    onChange={(e) => 
                      setPricingConfig({
                        ...pricingConfig,
                        quality_pricing: { ...pricingConfig.quality_pricing, normal: Number(e.target.value) }
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">0.2mm layer height</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="high-price">High Quality (LKR/gram)</Label>
                  <Input
                    id="high-price"
                    type="number"
                    value={pricingConfig.quality_pricing.high}
                    onChange={(e) => 
                      setPricingConfig({
                        ...pricingConfig,
                        quality_pricing: { ...pricingConfig.quality_pricing, high: Number(e.target.value) }
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">0.1mm layer height</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Material Surcharges (per gram)
              </CardTitle>
              <CardDescription>
                Additional cost per gram for different materials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="pla-surcharge">PLA Surcharge (LKR)</Label>
                  <Input
                    id="pla-surcharge"
                    type="number"
                    value={pricingConfig.material_surcharge.pla}
                    onChange={(e) => 
                      setPricingConfig({
                        ...pricingConfig,
                        material_surcharge: { ...pricingConfig.material_surcharge, pla: Number(e.target.value) }
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Standard (usually 0)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="petg-surcharge">PETG Surcharge (LKR)</Label>
                  <Input
                    id="petg-surcharge"
                    type="number"
                    value={pricingConfig.material_surcharge.petg}
                    onChange={(e) => 
                      setPricingConfig({
                        ...pricingConfig,
                        material_surcharge: { ...pricingConfig.material_surcharge, petg: Number(e.target.value) }
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Strong, heat resistant</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="abs-surcharge">ABS Surcharge (LKR)</Label>
                  <Input
                    id="abs-surcharge"
                    type="number"
                    value={pricingConfig.material_surcharge.abs}
                    onChange={(e) => 
                      setPricingConfig({
                        ...pricingConfig,
                        material_surcharge: { ...pricingConfig.material_surcharge, abs: Number(e.target.value) }
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Durable, impact resistant</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Additional Fees
              </CardTitle>
              <CardDescription>
                Minimum order and special service charges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="minimum-order">Minimum Order (LKR)</Label>
                  <Input
                    id="minimum-order"
                    type="number"
                    value={pricingConfig.minimum_order}
                    onChange={(e) => 
                      setPricingConfig({ ...pricingConfig, minimum_order: Number(e.target.value) })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-color">Custom Color Surcharge (LKR)</Label>
                  <Input
                    id="custom-color"
                    type="number"
                    value={pricingConfig.custom_color_surcharge}
                    onChange={(e) => 
                      setPricingConfig({ ...pricingConfig, custom_color_surcharge: Number(e.target.value) })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rush-multiplier">Rush Order Multiplier</Label>
                  <Input
                    id="rush-multiplier"
                    type="number"
                    step="0.1"
                    value={pricingConfig.rush_order_multiplier}
                    onChange={(e) => 
                      setPricingConfig({ ...pricingConfig, rush_order_multiplier: Number(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground">e.g., 1.5 = +50%</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSavePricingConfig} disabled={isSavingPricing}>
                  {isSavingPricing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Pricing Settings
                </Button>
              </div>
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
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="base-charge">Base Delivery Charge (LKR)</Label>
                  <Input
                    id="base-charge"
                    type="number"
                    value={deliveryConfig.base_charge}
                    onChange={(e) => 
                      setDeliveryConfig({ ...deliveryConfig, base_charge: Number(e.target.value) })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="colombo-charge">Colombo Delivery (LKR)</Label>
                  <Input
                    id="colombo-charge"
                    type="number"
                    value={deliveryConfig.colombo_charge}
                    onChange={(e) => 
                      setDeliveryConfig({ ...deliveryConfig, colombo_charge: Number(e.target.value) })
                    }
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
                  />
                  <p className="text-xs text-muted-foreground">Orders above this get free delivery</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="island-min">Island-wide Min (LKR)</Label>
                  <Input
                    id="island-min"
                    type="number"
                    value={deliveryConfig.island_min}
                    onChange={(e) => 
                      setDeliveryConfig({ ...deliveryConfig, island_min: Number(e.target.value) })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="island-max">Island-wide Max (LKR)</Label>
                  <Input
                    id="island-max"
                    type="number"
                    value={deliveryConfig.island_max}
                    onChange={(e) => 
                      setDeliveryConfig({ ...deliveryConfig, island_max: Number(e.target.value) })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="express-multiplier">Express Multiplier</Label>
                  <Input
                    id="express-multiplier"
                    type="number"
                    step="0.1"
                    value={deliveryConfig.express_multiplier}
                    onChange={(e) => 
                      setDeliveryConfig({ ...deliveryConfig, express_multiplier: Number(e.target.value) })
                    }
                  />
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
                      <SelectItem value="textlk">Text.lk (Sri Lanka)</SelectItem>
                      <SelectItem value="dialog">Dialog (Sri Lanka)</SelectItem>
                      <SelectItem value="mobitel">Mobitel (Sri Lanka)</SelectItem>
                      <SelectItem value="twilio">Twilio (International)</SelectItem>
                      <SelectItem value="generic">Generic HTTP API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="api-key">
                      {smsConfig.provider === 'textlk' ? 'API Token' : 
                       smsConfig.provider === 'twilio' ? 'Account SID' : 'API Key'}
                    </Label>
                    <Input
                      id="api-key"
                      type="password"
                      value={smsConfig.api_key}
                      onChange={(e) => 
                        setSmsConfig({ ...smsConfig, api_key: e.target.value })
                      }
                      placeholder={smsConfig.provider === 'textlk' ? 'e.g., 3074|Rr1li91D...' : 'Enter API key'}
                    />
                  </div>

                  {smsConfig.provider !== 'textlk' && (
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
                  )}
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
                      placeholder={smsConfig.provider === 'textlk' ? 'e.g., TextLKDemo' : 'e.g., Print3D'}
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
      </Tabs>
    </div>
  );
}
