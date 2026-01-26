import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RefundPolicy() {
  return (
    <Layout>
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-3xl">Refund Policy</CardTitle>
              <p className="text-muted-foreground">Last updated: January 2026</p>
            </CardHeader>
            <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
              <h2 className="text-xl font-semibold mt-6 mb-3">1. Overview</h2>
              <p className="text-muted-foreground mb-4">
                At IO Builds LLC, all payments are final once confirmed. We do not issue cash or card refunds. Where applicable, approved refunds are provided in the form of store credit or a coupon code equal to the approved refund amount.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">2. Eligible for Refund</h2>
              <p className="text-muted-foreground mb-4">
                You may be eligible for store credit (coupon code) equal to a full or partial refund amount if:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                <li>The printed item has manufacturing defects (layer separation, warping due to our error)</li>
                <li>The wrong item was shipped</li>
                <li>The item was damaged during shipping</li>
                <li>The print significantly differs from the approved specifications</li>
              </ul>

              <h2 className="text-xl font-semibold mt-6 mb-3">3. Not Eligible for Refund</h2>
              <p className="text-muted-foreground mb-4">
                Refunds are NOT provided for:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                <li>Design flaws in your submitted 3D model</li>
                <li>Change of mind after production has started</li>
                <li>Minor cosmetic variations inherent to 3D printing (layer lines, slight color variations)</li>
                <li>Orders cancelled after payment verification</li>
                <li>Items that meet the specifications you approved</li>
              </ul>

              <h2 className="text-xl font-semibold mt-6 mb-3">4. Refund Process</h2>
              <p className="text-muted-foreground mb-4">
                To request a refund:
              </p>
              <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-4">
                <li>Contact us within 7 days of receiving your order</li>
                <li>Provide your order ID and photos/videos of the issue</li>
                <li>Our team will review your claim within 3 business days</li>
                <li>If approved, a coupon code equal to the approved refund amount will be issued within 3–5 business days</li>
              </ol>

              <h2 className="text-xl font-semibold mt-6 mb-3">5. Reprint Option</h2>
              <p className="text-muted-foreground mb-4">
                In many cases, we may offer to reprint the item at no additional cost instead of issuing store credit. Reprints are prioritized where feasible to ensure you receive the correct product as quickly as possible.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">6. Shipping Costs</h2>
              <p className="text-muted-foreground mb-4">
                For defective items, we will cover return shipping costs where applicable. Shipping charges are not refundable as cash and are not included in coupon-based refunds unless the error was entirely on our part.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">7. Disputes</h2>
              <p className="text-muted-foreground mb-4">
                If you disagree with a refund decision, you may escalate by emailing us with additional documentation. Our decision after review will be final.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">8. Contact Us</h2>
              <p className="text-muted-foreground">
                For refund requests or questions:<br /><br />
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
