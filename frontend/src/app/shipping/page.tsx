import Link from 'next/link';

export default function ShippingInfoPage() {
  return (
    <div className="container py-12 max-w-4xl">
      <h1 className="text-4xl font-outfit font-bold mb-6">Shipping Information</h1>
      
      <div className="prose max-w-none space-y-8 text-muted-foreground">
        <p className="text-lg">At Anjali Alankaram, we are committed to delivering your ethnic wear safely and on time. We partner with top-tier courier services via Shiprocket to ensure reliable pan-India delivery.</p>

        <section>
          <h2 className="text-2xl font-bold text-foreground border-b pb-2 mb-4">Processing Time</h2>
          <p>All orders are processed within 1-2 business days. Orders are not shipped or delivered on weekends or public holidays.</p>
          <p>If we are experiencing a high volume of orders, shipments may be delayed by a few days. Please allow additional days in transit for delivery. If there will be a significant delay in the shipment of your order, we will contact you via email or telephone.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground border-b pb-2 mb-4">Shipping Rates & Delivery Estimates</h2>
          <p>Shipping charges for your order will be calculated and displayed at checkout.</p>
          <div className="bg-muted/10 border rounded-xl overflow-hidden mt-4">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/20 text-foreground font-medium border-b">
                <tr>
                  <th className="px-6 py-3">Shipment Method</th>
                  <th className="px-6 py-3">Estimated Delivery Time</th>
                  <th className="px-6 py-3">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-6 py-4">Standard Delivery</td>
                  <td className="px-6 py-4">5-7 business days</td>
                  <td className="px-6 py-4">₹49 (Free on orders above ₹499)</td>
                </tr>
                <tr>
                  <td className="px-6 py-4">Express Delivery</td>
                  <td className="px-6 py-4">2-3 business days</td>
                  <td className="px-6 py-4">₹149</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground border-b pb-2 mb-4">Shipment Confirmation & Order Tracking</h2>
          <p>You will receive a Shipment Confirmation email once your order has shipped containing your tracking number(s). The tracking number will be active within 24 hours. You can track your order using the <Link href="/track-order" className="text-primary hover:underline">Track Order</Link> page.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground border-b pb-2 mb-4">Damages</h2>
          <p>Anjali Alankaram is not liable for any products damaged or lost during shipping. If you received your order damaged, please contact the shipment carrier to file a claim. Please save all packaging materials and damaged goods before filing a claim.</p>
        </section>
      </div>
    </div>
  );
}
