import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const materials = [
  {
    name: "PLA",
    fullName: "Polylactic Acid",
    description: "The most popular choice for everyday prints. Eco-friendly, easy to print, and produces high-quality results with minimal warping.",
    pros: ["Eco-friendly", "Easy to print", "Great detail", "Low odor"],
    cons: ["Not heat resistant", "Brittle"],
    bestFor: "Prototypes, decorative items, figurines",
    color: "from-green-500 to-emerald-600",
  },
  {
    name: "PETG",
    fullName: "Polyethylene Terephthalate Glycol",
    description: "The perfect balance between strength and ease of printing. Excellent layer adhesion and chemical resistance.",
    pros: ["Strong", "Flexible", "Food safe", "Water resistant"],
    cons: ["Strings more", "Hygroscopic"],
    bestFor: "Functional parts, containers, outdoor items",
    color: "from-blue-500 to-cyan-600",
  },
  {
    name: "ABS",
    fullName: "Acrylonitrile Butadiene Styrene",
    description: "Industrial-grade material known for its durability and heat resistance. Perfect for mechanical parts that need to withstand stress.",
    pros: ["Very durable", "Heat resistant", "Impact resistant", "Smoothable"],
    cons: ["Requires enclosure", "Strong odor"],
    bestFor: "Automotive parts, mechanical components, tools",
    color: "from-orange-500 to-red-600",
  },
];

export function MaterialsSection() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Premium <span className="text-primary">Materials</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Choose the right material for your project's specific needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {materials.map((material, index) => (
            <Card key={index} className="overflow-hidden group hover:shadow-xl transition-all duration-300">
              {/* Header with gradient */}
              <div className={`h-32 bg-gradient-to-br ${material.color} flex items-center justify-center relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/10" />
                <div className="text-center relative z-10">
                  <h3 className="font-display text-4xl font-bold text-white">{material.name}</h3>
                  <p className="text-white/80 text-sm">{material.fullName}</p>
                </div>
              </div>

              <CardContent className="p-6">
                <p className="text-muted-foreground mb-4">{material.description}</p>

                {/* Pros */}
                <div className="mb-4">
                  <p className="font-semibold text-sm text-foreground mb-2">Advantages</p>
                  <div className="flex flex-wrap gap-1">
                    {material.pros.map((pro, i) => (
                      <Badge key={i} variant="secondary" className="bg-success/10 text-success border-success/20">
                        {pro}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Cons */}
                <div className="mb-4">
                  <p className="font-semibold text-sm text-foreground mb-2">Considerations</p>
                  <div className="flex flex-wrap gap-1">
                    {material.cons.map((con, i) => (
                      <Badge key={i} variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">
                        {con}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Best For */}
                <div className="pt-4 border-t border-border">
                  <p className="font-semibold text-sm text-foreground mb-1">Best For</p>
                  <p className="text-muted-foreground text-sm">{material.bestFor}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
