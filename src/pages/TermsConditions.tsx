import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsConditions() {
  return (
    <Layout>
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-3xl">Terms & Conditions</CardTitle>
              <p className="text-muted-foreground">Last updated: January 2026</p>
            </CardHeader>
            <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
              <h2 className="text-xl font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground mb-4">
                By accessing and using IO Builds LLC's 3D printing services, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">2. Service Description</h2>
              <p className="text-muted-foreground mb-4">
                We provide custom 3D printing services. You upload 3D model files, select printing options, and we manufacture physical objects based on your specifications.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">3. Order Process</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                <li>Submit your 3D model files through our website</li>
                <li>Our team reviews and prices your order</li>
                <li>You receive an SMS notification with pricing</li>
                <li>Payment is made via bank transfer</li>
                <li>Production begins after payment verification</li>
                <li>Orders are shipped to your specified address</li>
              </ul>

              <h2 className="text-xl font-semibold mt-6 mb-3">4. File Requirements</h2>
              <p className="text-muted-foreground mb-4">
                You are responsible for ensuring your 3D model files are printable. We reserve the right to reject files that:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                <li>Contain errors or are not watertight</li>
                <li>Are too complex for our equipment</li>
                <li>Violate intellectual property rights</li>
                <li>Contain prohibited content</li>
              </ul>

              <h2 className="text-xl font-semibold mt-6 mb-3">5. Pricing & Payment</h2>
              <p className="text-muted-foreground mb-4">
                Prices are determined based on material, size, complexity, and quality settings. All prices are in LKR. Payment must be completed via bank transfer within 7 days of receiving the quote.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">6. Intellectual Property</h2>
              <p className="text-muted-foreground mb-4">
                You retain ownership of your 3D model files. By uploading, you warrant that you have the right to print the designs and grant us license to manufacture them for your order.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">7. Warranty & Liability</h2>
              <p className="text-muted-foreground mb-4">
                We guarantee our prints to be free from manufacturing defects. However, we are not liable for design flaws in your submitted models. Our liability is limited to the order value.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">8. Cancellation</h2>
              <p className="text-muted-foreground mb-4">
                Orders may be cancelled before payment is made. Once production begins, cancellation is not possible and no refunds will be issued.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">9. Changes to Terms</h2>
              <p className="text-muted-foreground mb-4">
                We reserve the right to modify these terms at any time. Continued use of our services constitutes acceptance of updated terms.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">10. Contact</h2>
              <p className="text-muted-foreground">
                IO Builds LLC<br />
                Kalispell, MT, USA<br />
                Email: support@iobuilds.com
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
