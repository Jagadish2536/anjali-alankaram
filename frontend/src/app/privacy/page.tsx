export default function PrivacyPolicyPage() {
  return (
    <div className="container py-12 max-w-4xl">
      <h1 className="text-4xl font-outfit font-bold mb-6">Privacy Policy</h1>
      <p className="text-muted-foreground mb-10">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="prose max-w-none space-y-6 text-muted-foreground">
        <p>This Privacy Policy describes how Anjali Alankaram (the "Site" or "we") collects, uses, and discloses your Personal Information when you visit or make a purchase from the Site.</p>

        <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">Collecting Personal Information</h2>
        <p>When you visit the Site, we collect certain information about your device, your interaction with the Site, and information necessary to process your purchases. We may also collect additional information if you contact us for customer support. In this Privacy Policy, we refer to any information that can uniquely identify an individual as "Personal Information".</p>
        
        <h3 className="text-xl font-bold text-foreground mt-6 mb-3">Order Information</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Examples of Personal Information collected:</strong> name, billing address, shipping address, payment information (including credit card numbers), email address, and phone number.</li>
          <li><strong>Purpose of collection:</strong> to provide products or services to you to fulfill our contract, to process your payment information, arrange for shipping, and provide you with invoices and/or order confirmations.</li>
          <li><strong>Source of collection:</strong> collected from you directly.</li>
          <li><strong>Disclosure for a business purpose:</strong> shared with our processor Razorpay, shipping partner Shiprocket, and cloud provider AWS.</li>
        </ul>

        <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">Sharing Personal Information</h2>
        <p>We share your Personal Information with service providers to help us provide our services and fulfill our contracts with you, as described above. For example:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>We use AWS to power our backend infrastructure.</li>
          <li>We share information with Razorpay for secure payment processing.</li>
          <li>We share information with Shiprocket to generate shipping labels and tracking information.</li>
          <li>We may share your Personal Information to comply with applicable laws and regulations, to respond to a subpoena, search warrant or other lawful request for information we receive, or to otherwise protect our rights.</li>
        </ul>

        <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">Using Personal Information</h2>
        <p>We use your personal Information to provide our services to you, which includes: offering products for sale, processing payments, shipping and fulfillment of your order, and keeping you up to date on new products, services, and offers.</p>

        <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">Retention</h2>
        <p>When you place an order through the Site, we will retain your Personal Information for our records unless and until you ask us to erase this information.</p>

        <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">Contact</h2>
        <p>For more information about our privacy practices, if you have questions, or if you would like to make a complaint, please contact us by e-mail at privacy@anjalialankaram.com or by mail using the details provided on our Contact Us page.</p>
      </div>
    </div>
  );
}
