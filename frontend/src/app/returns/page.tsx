import Link from 'next/link';
import { ArrowLeft, RefreshCcw, CreditCard, Clock, HelpCircle } from 'lucide-react';

export default function ReturnsPage() {
  return (
    <div className="container py-12 max-w-4xl">
      <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
      </Link>

      <h1 className="text-4xl font-outfit font-bold mb-4">Returns & Refunds Policy</h1>
      <p className="text-lg text-muted-foreground mb-10">
        Everything you need to know about our hassle-free return process.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-muted/30 p-6 rounded-2xl">
          <RefreshCcw className="w-8 h-8 text-primary mb-4" />
          <h3 className="font-bold mb-2">7-Day Returns</h3>
          <p className="text-sm text-muted-foreground">You have 7 days from the delivery date to request a return or exchange for eligible items.</p>
        </div>
        <div className="bg-muted/30 p-6 rounded-2xl">
          <CreditCard className="w-8 h-8 text-primary mb-4" />
          <h3 className="font-bold mb-2">Instant Refunds</h3>
          <p className="text-sm text-muted-foreground">Once the returned item is verified, refunds are initiated immediately to your original payment method.</p>
        </div>
        <div className="bg-muted/30 p-6 rounded-2xl">
          <Clock className="w-8 h-8 text-primary mb-4" />
          <h3 className="font-bold mb-2">Free Pick-up</h3>
          <p className="text-sm text-muted-foreground">We offer free doorstep pick-up for all return requests across serviceable pincodes.</p>
        </div>
      </div>

      <div className="prose max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-bold border-b pb-2 mb-4">How to Return an Item</h2>
          <ol className="space-y-4 list-decimal pl-5">
            <li>
              <strong>Go to your Orders:</strong> Navigate to your <Link href="/profile" className="text-primary hover:underline">Profile</Link> and select the "My Orders" tab.
            </li>
            <li>
              <strong>Select the Order:</strong> Click on the specific order containing the item you wish to return to open the detailed tracking page.
            </li>
            <li>
              <strong>Initiate Return:</strong> Click the "Request Return" button available for delivered orders. Provide a valid reason and submit the request.
            </li>
            <li>
              <strong>Pack the Item:</strong> Please ensure the item is unused, unwashed, and has all original tags and packaging intact.
            </li>
            <li>
              <strong>Handover:</strong> Our delivery executive will pick up the package from your address within 2-3 business days.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-bold border-b pb-2 mb-4">Eligibility for Returns</h2>
          <p className="mb-4">Most items are eligible for return within 7 days of delivery. However, the following items cannot be returned due to hygiene and safety reasons:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Innerwear, lingerie, and swimwear</li>
            <li>Custom-made or tailored outfits</li>
            <li>Items marked as "Non-Returnable" on the product page</li>
            <li>Products that have been altered, washed, or worn</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold border-b pb-2 mb-4">Refund Process</h2>
          <p className="mb-4">Refunds are processed after the returned item passes our quality check at the warehouse. The timeline depends on your payment method:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Prepaid Orders (Razorpay):</strong> Refunded directly to your original payment source (Credit/Debit Card, UPI, Netbanking) within 5-7 business days.</li>
            <li><strong>Cash on Delivery (COD):</strong> A refund link will be sent to your registered email/phone to collect your bank details, or the amount can be added to your store wallet instantly.</li>
          </ul>
        </section>

        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mt-10 flex gap-4 items-start">
          <HelpCircle className="w-6 h-6 text-primary shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-lg mb-2">Still need help?</h3>
            <p className="text-muted-foreground mb-4">If you are facing issues with your return or have questions about a refund, our support team is here to assist you.</p>
            <button className="bg-white border text-foreground px-6 py-2 rounded-lg font-medium hover:bg-muted/50 transition-colors">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
