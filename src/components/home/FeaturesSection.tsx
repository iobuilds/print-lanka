import { Layers, Palette, Zap, Shield, Truck, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Layers,
    title: "Multiple Materials",
    description: "Choose from PLA, PETG, and ABS materials for different strength and flexibility needs.",
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    icon: Palette,
    title: "Wide Color Range",
    description: "Select from our range of colors or request custom colors for your project.",
    color: "bg-purple-500/10 text-purple-500",
  },
  {
    icon: Zap,
    title: "Fast Turnaround",
    description: "Quick production times with SMS updates at every stage of your order.",
    color: "bg-amber-500/10 text-amber-500",
  },
  {
    icon: Shield,
    title: "Quality Guaranteed",
    description: "Professional grade prints with quality checks before shipping.",
    color: "bg-green-500/10 text-green-500",
  },
  {
    icon: Truck,
    title: "Island-wide Delivery",
    description: "We deliver to any location across Sri Lanka with careful packaging.",
    color: "bg-red-500/10 text-red-500",
  },
  {
    icon: MessageSquare,
    title: "SMS Notifications",
    description: "Stay updated with real-time SMS notifications on your order status.",
    color: "bg-cyan-500/10 text-cyan-500",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Why Choose <span className="text-primary">Print3D Lanka</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Professional 3D printing services tailored for Sri Lankan customers
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30"
            >
              <CardContent className="p-6">
                <div className={`w-14 h-14 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="font-display font-semibold text-xl mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
