import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, MessageSquare, Truck, Save, Loader2, TestTube, 
  DollarSign, Palette, Package, Trash2, Database, Download, 
  Upload, AlertTriangle, CheckCircle, HardDrive, FileBox
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  
  // Maintenance state
  const [isClearingFiles, setIsClearingFiles] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [completedOrdersCount, setCompletedOrdersCount] = useState(0);
  const [completedFilesCount, setCompletedFilesCount] = useState(0);
  const [isExportingDb, setIsExportingDb] = useState(false);
  const [isImportingDb, setIsImportingDb] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchCompletedOrdersStats();
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
          message: "This is a test message from IO Builds 3D print service. Your SMS notifications are working!",
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

  // Fetch completed orders count for cleanup preview
  const fetchCompletedOrdersStats = async () => {
    const { data: completedOrders, error } = await supabase
      .from("orders")
      .select("id")
      .eq("status", "completed");
    
    if (!error && completedOrders) {
      setCompletedOrdersCount(completedOrders.length);
      
      // Count files for completed orders
      const orderIds = completedOrders.map(o => o.id);
      if (orderIds.length > 0) {
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("id, file_path")
          .in("order_id", orderIds);
        setCompletedFilesCount(orderItems?.length || 0);
      }
    }
  };

  // Clear completed orders' model files
  const handleClearCompletedFiles = async () => {
    setIsClearingFiles(true);
    try {
      // Get all completed orders
      const { data: completedOrders, error: ordersError } = await supabase
        .from("orders")
        .select("id")
        .eq("status", "completed");

      if (ordersError) throw ordersError;
      if (!completedOrders || completedOrders.length === 0) {
        toast.info("No completed orders to clean up");
        setShowClearConfirm(false);
        return;
      }

      const orderIds = completedOrders.map(o => o.id);

      // Get all order items for completed orders
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("id, file_path")
        .in("order_id", orderIds);

      if (itemsError) throw itemsError;

      // Delete files from storage
      let deletedCount = 0;
      for (const item of orderItems || []) {
        if (item.file_path) {
          const { error: deleteError } = await supabase.storage
            .from("models")
            .remove([item.file_path]);
          
          if (!deleteError) {
            deletedCount++;
          }
        }
      }

      toast.success(`Cleared ${deletedCount} model files from completed orders`);
      setShowClearConfirm(false);
      fetchCompletedOrdersStats();
    } catch (error: any) {
      toast.error(error.message || "Failed to clear files");
    } finally {
      setIsClearingFiles(false);
    }
  };

  // Export database backup
  const handleExportBackup = async () => {
    setIsExportingDb(true);
    try {
      // Fetch all tables data
      const [orders, orderItems, profiles, coupons, userCoupons, colors, settings] = await Promise.all([
        supabase.from("orders").select("*"),
        supabase.from("order_items").select("*"),
        supabase.from("profiles").select("*"),
        supabase.from("coupons").select("*"),
        supabase.from("user_coupons").select("*"),
        supabase.from("available_colors").select("*"),
        supabase.from("system_settings").select("*"),
      ]);

      const backup = {
        version: "1.0",
        created_at: new Date().toISOString(),
        tables: {
          orders: orders.data || [],
          order_items: orderItems.data || [],
          profiles: profiles.data || [],
          coupons: coupons.data || [],
          user_coupons: userCoupons.data || [],
          available_colors: colors.data || [],
          system_settings: settings.data || [],
        },
      };

      // Download as JSON file
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `iobuilds-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Database backup downloaded");
    } catch (error: any) {
      toast.error(error.message || "Failed to export backup");
    } finally {
      setIsExportingDb(false);
    }
  };

  // Handle restore file selection
  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".json")) {
        toast.error("Please select a JSON backup file");
        return;
      }
      setRestoreFile(file);
      setShowRestoreConfirm(true);
    }
  };

  // Restore database from backup
  const handleRestoreBackup = async () => {
    if (!restoreFile) return;

    setIsImportingDb(true);
    try {
      const text = await restoreFile.text();
      const backup = JSON.parse(text);

      if (!backup.version || !backup.tables) {
        throw new Error("Invalid backup file format");
      }

      // Restore system_settings (upsert)
      if (backup.tables.system_settings?.length) {
        for (const setting of backup.tables.system_settings) {
          await supabase
            .from("system_settings")
            .upsert(setting, { onConflict: "key" });
        }
      }

      // Restore available_colors (upsert by id)
      if (backup.tables.available_colors?.length) {
        for (const color of backup.tables.available_colors) {
          await supabase
            .from("available_colors")
            .upsert(color, { onConflict: "id" });
        }
      }

      // Restore coupons (upsert by id)
      if (backup.tables.coupons?.length) {
        for (const coupon of backup.tables.coupons) {
          await supabase
            .from("coupons")
            .upsert(coupon, { onConflict: "id" });
        }
      }

      toast.success("Settings and configuration restored from backup");
      setShowRestoreConfirm(false);
      setRestoreFile(null);
      fetchSettings();
    } catch (error: any) {
      toast.error(error.message || "Failed to restore backup");
    } finally {
      setIsImportingDb(false);
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
          <TabsTrigger value="maintenance" className="gap-2">
            <HardDrive className="w-4 h-4" />
            Maintenance
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
                SMS Configuration
              </CardTitle>
              <CardDescription>
                SMS notifications are configured via Text.lk API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Text.lk API Connected</strong>
                  <br />
                  <span className="text-muted-foreground">
                    Sender ID: <strong>IO Builds</strong> | API: v3
                  </span>
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h4 className="font-medium">SMS notifications are sent when:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                  <li>Order is priced and awaiting payment</li>
                  <li>Payment is approved</li>
                  <li>Payment is rejected</li>
                  <li>Order is ready to ship</li>
                  <li>Order is shipped (with tracking number)</li>
                </ul>
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
                  placeholder="0771234567"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="max-w-xs"
                />
                <Button 
                  variant="outline" 
                  onClick={handleTestSms}
                  disabled={isTesting || !testPhone}
                >
                  {isTesting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4 mr-2" />
                  )}
                  Send Test SMS
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Enter a Sri Lankan phone number (e.g., 0771234567 or 94771234567)
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Settings */}
        <TabsContent value="maintenance" className="space-y-6">
          {/* Storage Cleanup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileBox className="w-5 h-5" />
                Storage Cleanup
              </CardTitle>
              <CardDescription>
                Clear 3D model files from completed orders to free up storage space
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-primary">{completedOrdersCount}</div>
                  <div className="text-sm text-muted-foreground">Completed Orders</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-orange-500">{completedFilesCount}</div>
                  <div className="text-sm text-muted-foreground">Model Files to Clear</div>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  This will permanently delete all uploaded 3D model files from completed orders. 
                  Order records will be kept but files cannot be recovered.
                </AlertDescription>
              </Alert>

              <Button 
                variant="destructive" 
                onClick={() => setShowClearConfirm(true)}
                disabled={completedFilesCount === 0}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear Completed Order Files
              </Button>
            </CardContent>
          </Card>

          {/* Database Backup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Database Backup & Restore
              </CardTitle>
              <CardDescription>
                Export settings and data for backup, or restore from a previous backup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Export */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export Backup
                </h4>
                <p className="text-sm text-muted-foreground">
                  Download all orders, profiles, coupons, colors, and settings as a JSON file.
                </p>
                <Button 
                  variant="outline" 
                  onClick={handleExportBackup}
                  disabled={isExportingDb}
                  className="gap-2"
                >
                  {isExportingDb ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download Backup
                </Button>
              </div>

              <div className="border-t pt-6">
                {/* Import */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Restore from Backup
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Restore settings, colors, and coupons from a backup file. 
                    <span className="text-orange-500 font-medium"> This will overwrite current settings.</span>
                  </p>
                  <div>
                    <Input
                      type="file"
                      accept=".json"
                      onChange={handleRestoreFileChange}
                      className="max-w-xs"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Clear Files Confirmation Dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirm File Deletion
            </DialogTitle>
            <DialogDescription>
              You are about to permanently delete {completedFilesCount} model files from {completedOrdersCount} completed orders.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleClearCompletedFiles}
              disabled={isClearingFiles}
            >
              {isClearingFiles ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Files
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-500">
              <Upload className="w-5 h-5" />
              Confirm Restore
            </DialogTitle>
            <DialogDescription>
              This will restore settings, colors, and coupons from the backup file.
              Current settings will be overwritten.
            </DialogDescription>
          </DialogHeader>
          {restoreFile && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <span className="font-medium">File:</span> {restoreFile.name}
              </p>
              <p className="text-sm">
                <span className="font-medium">Size:</span> {(restoreFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRestoreConfirm(false); setRestoreFile(null); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleRestoreBackup}
              disabled={isImportingDb}
            >
              {isImportingDb ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
