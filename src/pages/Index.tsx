import { Layout } from "@/components/layout/Layout";
import { WorkflowSection } from "@/components/home/WorkflowSection";
import { ModelUploadSection } from "@/components/home/ModelUploadSection";

const Index = () => {
  return (
    <Layout>
      <ModelUploadSection />
      <WorkflowSection />
    </Layout>
  );
};

export default Index;