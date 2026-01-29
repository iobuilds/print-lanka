import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

interface ShopShippingConfig {
  shipping_cost: number;
}

export default function AdminShopSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [shippingCost, setShippingCost] = useState("");

  const { data: config, isLoading } = useQuery({
    queryKey: ["shop-shipping-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "shop_shipping_config")
        .maybeSingle();
      if (data?.value && typeof data.value === "object" && !Array.isArray(data.value)) {
        return data.value as unknown as ShopShippingConfig;
      }
      return { shipping_cost: 350 };
    },
  });

  useEffect(() => {
    if (config) {
      setShippingCost(config.shipping_cost.toString());
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const value: Json = {
        shipping_cost: parseFloat(shippingCost) || 0,
      };

      // Check if setting exists
      const { data: existing } = await supabase
        .from("system_settings")
        .select("id")
        .eq("key", "shop_shipping_config")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("system_settings")
          .update({ value })
          .eq("key", "shop_shipping_config");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("system_settings")
          .insert([{ key: "shop_shipping_config", value }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Shop settings updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["shop-shipping-config"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Shop Settings</h1>
        <p className="text-muted-foreground">Configure shop shipping and settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Shipping Configuration
          </CardTitle>
          <CardDescription>
            Set the default shipping cost for shop orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="shipping">Shipping Cost (LKR)</Label>
            <Input
              id="shipping"
              type="number"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
              placeholder="350"
            />
            <p className="text-sm text-muted-foreground mt-1">
              This amount will be added to all shop orders
            </p>
          </div>

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
