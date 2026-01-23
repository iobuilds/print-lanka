import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { WorkflowSection } from "@/components/home/WorkflowSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { MaterialsSection } from "@/components/home/MaterialsSection";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <WorkflowSection />
      <FeaturesSection />
      <MaterialsSection />
      <CTASection />
    </Layout>
  );
};

export default Index;