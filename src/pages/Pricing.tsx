import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/constants";
import { Box, Layers, Palette, Zap } from "lucide-react";

const pricingTiers = [
  {
    quality: "Draft",
    layerHeight: "0.3mm",
    description: "Fast prints for prototyping",
    pricePerGram: 15,
    icon: Zap,
    color: "from-amber-500 to-orange-600",
  },
  {
    quality: "Normal",
    layerHeight: "0.2mm",
    description: "Balanced quality and speed",
    pricePerGram: 20,
    icon: Layers,
    popular: true,
    color: "from-primary to-teal-600",
  },
  {
    quality: "High",
    layerHeight: "0.1mm",
    description: "Maximum detail and smoothness",
    pricePerGram: 30,
    icon: Box,
    color: "from-blue-500 to-indigo-600",
  },
];

const materialPricing = [
  { name: "PLA", basePrice: 0, description: "Standard material" },
  { name: "PETG", basePrice: 5, description: "+Rs.5/gram" },
  { name: "ABS", basePrice: 8, description: "+Rs.8/gram" },
];

const additionalFees = [
  { name: "Minimum Order", value: "Rs. 500" },
  { name: "Color Change", value: "Free (basic colors)" },
  { name: "Custom Color", value: "Rs. 200 surcharge" },
  { name: "Rush Order (24h)", value: "+50% of print cost" },
  { name: "Delivery (Colombo)", value: "Rs. 300" },
  { name: "Delivery (Island-wide)", value: "Rs. 400 - 600" },
];

export default function Pricing() {
  return (
    <Layout>
      <div className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Transparent <span className="text-primary">Pricing</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Simple pricing based on material weight and quality. No hidden fees.
            </p>
          </div>

          {/* Quality Tiers */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            {pricingTiers.map((tier, index) => (
              <Card 
                key={index} 
                className={`relative overflow-hidden ${tier.popular ? "ring-2 ring-primary shadow-glow" : ""}`}
              >
                {tier.popular && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}
                <div className={`h-32 bg-gradient-to-br ${tier.color} flex items-center justify-center`}>
                  <tier.icon className="w-16 h-16 text-white/90" />
                </div>
                <CardHeader>
                  <CardTitle className="font-display text-2xl">{tier.quality} Quality</CardTitle>
                  <p className="text-muted-foreground">{tier.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <span className="text-4xl font-display font-bold">{formatPrice(tier.pricePerGram)}</span>
                    <span className="text-muted-foreground">/gram</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Layer Height: {tier.layerHeight}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Material Pricing */}
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="font-display text-2xl font-bold text-center mb-8">
              <Palette className="inline-block w-6 h-6 mr-2 text-primary" />
              Material Options
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {materialPricing.map((material, index) => (
                <Card key={index} className="text-center">
                  <CardContent className="pt-6">
                    <h3 className="font-display font-semibold text-xl mb-1">{material.name}</h3>
                    <p className="text-muted-foreground text-sm">{material.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Additional Fees */}
          <div className="max-w-2xl mx-auto">
            <h2 className="font-display text-2xl font-bold text-center mb-8">Additional Information</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {additionalFees.map((fee, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                      <span className="text-muted-foreground">{fee.name}</span>
                      <span className="font-semibold">{fee.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <p className="text-center text-muted-foreground text-sm mt-6">
              * Final price is calculated by our team based on model complexity and actual material usage.
              <br />
              You'll receive an exact quote before payment.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}