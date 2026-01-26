import { Link } from "react-router-dom";
import { Mail, MapPin, Phone } from "lucide-react";
import { useContactInfo } from "@/hooks/useContactInfo";
import logo from "@/assets/logo.png";

export function Footer() {
  const { contactInfo } = useContactInfo();

  return (
    <footer className="bg-dark-gradient text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="IO Builds Logo" className="h-10 w-auto" />
            </Link>
            <p className="text-gray-400 text-sm">
              Professional 3D printing services. From prototype to production,
              we bring your ideas to life.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-white transition-colors">
                  Pricing Guide
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition-colors">
                  My Orders
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 text-gray-400">
              {contactInfo.admin_phone && (
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <a 
                    href={`tel:${contactInfo.admin_phone}`} 
                    className="hover:text-white transition-colors"
                  >
                    {contactInfo.admin_phone}
                  </a>
                </li>
              )}
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <a href="mailto:official.iobuilds@gmail.com" className="hover:text-white transition-colors">
                  official.iobuilds@gmail.com
                </a>
              </li>
              {contactInfo.address && (
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-primary mt-1" />
                  <span>{contactInfo.address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Policy Links */}
        <div className="border-t border-white/10 mt-8 pt-6 flex justify-center gap-6 text-gray-400 text-sm">
          <Link to="/privacy-policy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms-conditions" className="hover:text-white transition-colors">
            Terms & Conditions
          </Link>
          <Link to="/refund-policy" className="hover:text-white transition-colors">
            Refund Policy
          </Link>
        </div>

        {/* Copyright */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            © 2026 IO Builds LLC. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
