'use client';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useEffect } from 'react';

export default function TermsOfServicePage() {
  const { settings, fetchSettings } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, []);

  const contactEmail = settings.contactEmail || settings.supportEmail || 'support@anjalialankaram.com';

  return (
    <div className="container py-12 max-w-4xl">
      <h1 className="text-4xl font-outfit font-bold mb-6">Terms of Service</h1>
      <p className="text-muted-foreground mb-10">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="prose max-w-none space-y-6 text-muted-foreground">
        <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">1. Overview</h2>
        <p>This website is operated by Anjali Alankaram. Throughout the site, the terms "we", "us" and "our" refer to Anjali Alankaram. Anjali Alankaram offers this website, including all information, tools and services available from this site to you, the user, conditioned upon your acceptance of all terms, conditions, policies and notices stated here.</p>
        <p>By visiting our site and/ or purchasing something from us, you engage in our "Service" and agree to be bound by the following terms and conditions ("Terms of Service", "Terms"), including those additional terms and conditions and policies referenced herein and/or available by hyperlink.</p>

        <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">2. Online Store Terms</h2>
        <p>By agreeing to these Terms of Service, you represent that you are at least the age of majority in your state or province of residence, or that you are the age of majority in your state or province of residence and you have given us your consent to allow any of your minor dependents to use this site.</p>
        <p>You may not use our products for any illegal or unauthorized purpose nor may you, in the use of the Service, violate any laws in your jurisdiction (including but not limited to copyright laws).</p>

        <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">3. Accuracy, Completeness and Timeliness of Information</h2>
        <p>We are not responsible if information made available on this site is not accurate, complete or current. The material on this site is provided for general information only and should not be relied upon or used as the sole basis for making decisions without consulting primary, more accurate, more complete or more timely sources of information. Any reliance on the material on this site is at your own risk.</p>

        <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">4. Modifications to the Service and Prices</h2>
        <p>Prices for our products are subject to change without notice.</p>
        <p>We reserve the right at any time to modify or discontinue the Service (or any part or content thereof) without notice at any time.</p>
        <p>We shall not be liable to you or to any third-party for any modification, price change, suspension or discontinuance of the Service.</p>

        <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">5. Products or Services</h2>
        <p>Certain products or services may be available exclusively online through the website. These products or services may have limited quantities and are subject to return or exchange only according to our Return Policy.</p>
        <p>We have made every effort to display as accurately as possible the colors and images of our products that appear at the store. We cannot guarantee that your computer monitor's display of any color will be accurate.</p>

        <h2 className="text-2xl font-bold text-foreground mt-10 mb-4">6. Contact Information</h2>
        <p>
          Questions about the Terms of Service should be sent to us at{' '}
          <a href={`mailto:${contactEmail}`} className="text-primary underline font-medium">
            {contactEmail}
          </a>.
        </p>
      </div>
    </div>
  );
}
