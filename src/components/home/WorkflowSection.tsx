import { Upload, Settings, Send, CreditCard, Printer, Package } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload Models",
    description: "Upload your STL, OBJ, or 3MF files",
  },
  {
    icon: Settings,
    title: "Configure",
    description: "Choose color, material, and quality",
  },
  {
    icon: Send,
    title: "Submit Order",
    description: "Review and submit your order",
  },
  {
    icon: CreditCard,
    title: "Pay",
    description: "We price it, you pay via bank transfer",
  },
  {
    icon: Printer,
    title: "Production",
    description: "We print your models with care",
  },
  {
    icon: Package,
    title: "Delivery",
    description: "Receive your prints island-wide",
  },
];

export function WorkflowSection() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            How It <span className="text-primary">Works</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From upload to delivery, we've streamlined the entire 3D printing process
          </p>
        </div>

        <div className="relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary -translate-y-1/2 opacity-20" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative group">
                <div className="flex flex-col items-center text-center">
                  {/* Icon container */}
                  <div className="relative mb-4">
                    <div className="w-20 h-20 rounded-2xl bg-primary-gradient flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform duration-300">
                      <step.icon className="w-8 h-8 text-primary-foreground" />
                    </div>
                    {/* Step number */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent text-accent-foreground font-bold text-sm flex items-center justify-center shadow-lg">
                      {index + 1}
                    </div>
                  </div>

                  <h3 className="font-display font-semibold text-lg mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
