import { Layout } from "@/components/layout/Layout";
import { WorkflowSection } from "@/components/home/WorkflowSection";
import { ModelUploadSection } from "@/components/home/ModelUploadSection";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <Layout>
      <ModelUploadSection />
      <WorkflowSection />
      
      {/* Pricing CTA Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Transparent <span className="text-primary">Pricing</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Check out our competitive pricing based on material weight and quality. No hidden fees.
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link to="/pricing">
              <DollarSign className="w-5 h-5" />
              View Pricing Guide
            </Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
};

export default Index;