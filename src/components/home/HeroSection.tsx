import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Upload, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function HeroSection() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleUploadClick = () => {
    if (user) {
      navigate("/upload");
    } else {
      navigate("/register");
    }
  };

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-hero-gradient opacity-95" />
      
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-3xl" />
      </div>

      {/* 3D Grid pattern */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm text-white/90">Sri Lanka's Premier 3D Printing Service</span>
          </div>

          {/* Heading */}
          <h1 className="font-display text-5xl md:text-7xl font-bold text-white mb-6 animate-slide-in-bottom" style={{ animationDelay: "0.1s" }}>
            Bring Your Ideas
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-accent to-white">
              To Life in 3D
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto animate-slide-in-bottom" style={{ animationDelay: "0.2s" }}>
            Upload your 3D models, choose your specifications, and we'll handle the rest. 
            Professional quality prints delivered across Sri Lanka.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-in-bottom" style={{ animationDelay: "0.3s" }}>
            <Button
              size="lg"
              onClick={handleUploadClick}
              className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-6 text-lg font-semibold shadow-accent-glow group"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload Model & Get Quote
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/pricing")}
              className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg"
            >
              View Pricing Guide
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 animate-slide-in-bottom" style={{ animationDelay: "0.4s" }}>
            <div className="text-center">
              <div className="text-4xl font-display font-bold text-white mb-1">500+</div>
              <div className="text-white/60 text-sm">Orders Completed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-display font-bold text-white mb-1">24h</div>
              <div className="text-white/60 text-sm">Turnaround Time</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-display font-bold text-white mb-1">100%</div>
              <div className="text-white/60 text-sm">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
          <div className="w-1.5 h-3 rounded-full bg-white/50" />
        </div>
      </div>
    </section>
  );
}
