import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <Layout>
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-3xl">Privacy Policy</CardTitle>
              <p className="text-muted-foreground">Last updated: January 2026</p>
            </CardHeader>
            <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
              <h2 className="text-xl font-semibold mt-6 mb-3">1. Information We Collect</h2>
              <p className="text-muted-foreground mb-4">
                IO Builds LLC ("we", "our", or "us") collects information you provide directly to us, including:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                <li>Name, email address, phone number, and delivery address when you create an account</li>
                <li>3D model files you upload for printing services</li>
                <li>Payment information and transaction history</li>
                <li>Communications you send to us</li>
              </ul>

              <h2 className="text-xl font-semibold mt-6 mb-3">2. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                <li>Process and fulfill your 3D printing orders</li>
                <li>Send order updates and notifications via SMS</li>
                <li>Communicate with you about your orders and account</li>
                <li>Improve our services and customer experience</li>
                <li>Comply with legal obligations</li>
              </ul>

              <h2 className="text-xl font-semibold mt-6 mb-3">3. Information Sharing</h2>
              <p className="text-muted-foreground mb-4">
                We do not sell, trade, or rent your personal information to third parties. We may share your information with:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                <li>Service providers who assist in our operations (payment processors, delivery services)</li>
                <li>Law enforcement when required by law</li>
              </ul>

              <h2 className="text-xl font-semibold mt-6 mb-3">4. Data Security</h2>
              <p className="text-muted-foreground mb-4">
                We implement appropriate security measures to protect your personal information. Your 3D model files are stored securely and are only accessed for order fulfillment purposes.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">5. Your Rights</h2>
              <p className="text-muted-foreground mb-4">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                <li>Access and update your personal information through your account dashboard</li>
                <li>Request deletion of your account and associated data</li>
                <li>Opt out of marketing communications</li>
              </ul>

              <h2 className="text-xl font-semibold mt-6 mb-3">6. Contact Us</h2>
              <p className="text-muted-foreground mb-4">
                If you have questions about this Privacy Policy, please contact us at:
              </p>
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
