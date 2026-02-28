// app/(legal)/privacy/page.tsx — Privacy Policy
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Invopap",
  description: "Invopap Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1>Privacy Policy</h1>
      <p className="text-sm text-ink/50">Last updated: 28 February 2026</p>

      <h2>1. Information We Collect</h2>

      <h3>Account Information</h3>
      <p>
        When you sign up with Google, we receive: your email address, display
        name, and profile picture. This is stored securely in our database.
      </p>

      <h3>Document Content</h3>
      <p>
        Information you enter in invoices: business names, addresses, amounts,
        line items, logos, signatures, and photo attachments.
      </p>

      <h3>Payment Information</h3>
      <p>
        When you pay via M-Pesa, we receive: your phone number, M-Pesa receipt
        number, and transaction date. We do <strong>not</strong> store your
        M-Pesa PIN or any banking credentials.
      </p>

      <h3>Technical Data</h3>
      <p>
        IP address (for rate limiting and abuse prevention), browser user agent,
        and request timestamps.
      </p>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>Generate and store your documents</li>
        <li>Process M-Pesa payments</li>
        <li>Provide dashboard analytics for your account</li>
        <li>Prevent fraud and abuse</li>
        <li>Improve the Service</li>
      </ul>

      <h2>3. Data Sharing</h2>
      <p>
        We do <strong>not</strong> sell, rent, or share your personal information
        with third parties, except:
      </p>
      <ul>
        <li>
          <strong>Safaricom</strong>: Phone number and payment amount are shared
          to process M-Pesa transactions
        </li>
        <li>
          <strong>Supabase</strong>: Our database and authentication provider
          (hosted infrastructure)
        </li>
        <li>
          <strong>Legal requirements</strong>: When required by Kenyan law or
          court order
        </li>
      </ul>

      <h2>4. Data Retention</h2>
      <ul>
        <li>
          <strong>Guest invoices</strong>: Unpaid guest invoices are automatically
          deleted after 90 days
        </li>
        <li>
          <strong>Paid invoices</strong>: Retained indefinitely (or until you
          delete your account)
        </li>
        <li>
          <strong>Payment records</strong>: Retained for 7 years (Kenyan tax
          compliance)
        </li>
        <li>
          <strong>Account data</strong>: Deleted within 30 days of account
          deletion request
        </li>
      </ul>

      <h2>5. Data Security</h2>
      <p>
        We use industry-standard security measures: HTTPS encryption, Row-Level
        Security in our database, secure httpOnly cookies, and access controls.
        However, no system is 100% secure.
      </p>

      <h2>6. Your Rights</h2>
      <p>Under the Kenya Data Protection Act 2019, you have the right to:</p>
      <ul>
        <li>Access your personal data</li>
        <li>Correct inaccurate data</li>
        <li>Delete your data (right to be forgotten)</li>
        <li>Object to processing</li>
        <li>Data portability</li>
      </ul>

      <h2>7. Cookies</h2>
      <p>
        We use essential cookies only: Supabase authentication session and guest
        session identifier. No tracking or analytics cookies are used.
      </p>

      <h2>8. Children&apos;s Privacy</h2>
      <p>
        Invopap is not intended for users under 18. We do not knowingly collect
        data from minors.
      </p>

      <h2>Contact</h2>
      <p>
        For privacy inquiries, contact our Data Protection Officer at{" "}
        <a href="mailto:privacy@invopap.com">privacy@invopap.com</a>.
      </p>
    </article>
  );
}
