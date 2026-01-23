import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { WorkflowSection } from "@/components/home/WorkflowSection";
import { ModelUploadSection } from "@/components/home/ModelUploadSection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <WorkflowSection />
      <ModelUploadSection />
    </Layout>
  );
};

export default Index;