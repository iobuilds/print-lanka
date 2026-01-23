import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Upload, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function CTASection() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleClick = () => {
    if (user) {
      navigate("/upload");
    } else {
      navigate("/register");
    }
  };

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-primary-gradient" />
      
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Start Your
            <br />
            3D Printing Project?
          </h2>
          <p className="text-xl text-white/80 mb-10">
            Upload your model now and get a quote within 24 hours. 
            No hidden fees, transparent pricing in LKR.
          </p>
          <Button
            size="lg"
            onClick={handleClick}
            className="bg-accent hover:bg-accent/90 text-accent-foreground px-10 py-6 text-lg font-semibold shadow-accent-glow group"
          >
            <Upload className="w-5 h-5 mr-2" />
            {user ? "Upload Your Model" : "Get Started Free"}
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
}
