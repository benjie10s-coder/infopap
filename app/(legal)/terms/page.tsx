// app/(legal)/terms/page.tsx — Terms of Service
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — InvoSafi",
  description: "InvoSafi Terms of Service",
};

export default function TermsPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1>Terms of Service</h1>

      <h2>1. Acceptance of Terms</h2>
      <p>
        Welcome to InvoSafi (&quot;the Service&quot;). By accessing or using the Service, you
        agree to be bound by these Terms of Service. If you do not agree with
        any part of these terms, you must not use the Service.
      </p>

      <h2>2. Service Description</h2>
      <p>
        InvoSafi is a document generation platform designed to allow users to
        create professional invoices, receipts, estimates, and quotes. The
        Service provides flexibility by allowing users to create documents
        without an account (as guests) or to sign up for a persistent, registered
        account to manage their documents over time.
      </p>

      <h2>3. Account Registration and Guest Mode</h2>
      <p>
        <strong>Guest Access:</strong> You may use the Service to generate
        documents without creating an account. Please note that guest session
        data is temporary and may be permanently deleted after 90 days of
        inactivity.
      </p>
      <p>
        <strong>Registered Accounts:</strong> Signing up for a persistent account
        allows you to save and manage your documents long-term. You agree to
        provide accurate information during registration and are responsible for
        maintaining the security of your account credentials.
      </p>

      <h2>4. Pricing</h2>
      <p>
        <strong>Free Features:</strong> Creating, editing, and previewing
        documents on the platform is completely free.
      </p>
      <p>
        <strong>Premium Downloads:</strong> Downloading a clean, final PDF
        document (without the InvoSafi watermark) requires a one-time payment of
        <strong> KSh 10 per document</strong>.
      </p>
      <p>
        <strong>Billing Responsibility:</strong> This fee is charged strictly to
        the document creator. The recipient of your invoice, receipt, estimate,
        or quote will never be charged by InvoSafi to view or receive the
        document.
      </p>

      <h2>5. Payments and Refunds</h2>
      <p>
        <strong>Payment Processor:</strong> All payments are processed securely
        via Safaricom M-Pesa. By completing a payment on InvoSafi, you also agree
        to be bound by Safaricom&apos;s terms of service.
      </p>
      <p>
        <strong>Refund Policy:</strong> Because the digital product is delivered
        instantly, payments are strictly non-refundable once a clean PDF has been
        successfully generated and downloaded. Attempting to circumvent payment
        requirements is strictly prohibited.
      </p>

      <h2>6. User Content and Data Ownership</h2>
      <p>
        You retain full ownership of all content you enter into your documents,
        including business names, financial amounts, client details, logos, and
        images. By using the Service, you grant InvoSafi a limited,
        non-exclusive license to store, process, and display this content solely
        for the purpose of generating and delivering your documents.
      </p>

      <h2>7. Prohibited Use</h2>
      <p>To ensure a safe and reliable platform, you agree not to use the Service
        for any of the following activities:</p>
      <ul>
        <li>Creating fraudulent, misleading, or illegal documents (including tax evasion)</li>
        <li>Accessing the platform via automated scripts, scrapers, or bots without our prior written consent</li>
        <li>Attempting to bypass, hack, or circumvent the KSh 10 payment requirement</li>
        <li>Uploading illegal, offensive, or harmful content</li>
        <li>Interfering with, disrupting, or attempting to gain unauthorized access to the Service&apos;s infrastructure or servers</li>
      </ul>

      <h2>8. Account Termination and Suspension</h2>
      <p>
        We reserve the right to suspend or terminate your account or block your
        access to the Service immediately, without prior notice, if you violate
        any of these Terms of Service.
      </p>

      <h2>9. Limitation of Liability</h2>
      <p>
        The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis without
        warranties of any kind, whether express or implied.
      </p>
      <p>
        InvoSafi is not a specialized accounting or legal firm. We are not liable
        for any business, financial, or tax decisions made based on the documents
        generated using our Service.
      </p>
      <p>
        In no event shall InvoSafi&apos;s total maximum liability to you for any claims
        arising out of your use of the Service exceed the total amount paid by
        you to InvoSafi in the preceding 12 months.
      </p>

      <h2>10. Governing Law and Dispute Resolution</h2>
      <p>
        These Terms of Service shall be governed by and construed in accordance
        with the laws of the Republic of Kenya. Any disputes arising out of or
        relating to these terms or your use of the Service shall be resolved
        exclusively in the courts located in Nairobi, Kenya.
      </p>

      <h2>11. Changes to Terms</h2>
      <p>
        We may update these terms from time to time to reflect changes to our
        Service or for legal reasons. We will post the updated terms on this
        page. Your continued use of the Service after any changes constitutes
        your acceptance of the new Terms of Service.
      </p>
    </article>
  );
}
