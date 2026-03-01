// app/(legal)/refund/page.tsx — Refund Policy
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy — Invopap",
  description: "Invopap Refund Policy",
};

export default function RefundPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1>Refund Policy</h1>
      <p className="text-sm text-ink/50">Last updated: 28 February 2026</p>

      <h2>Digital Goods</h2>
      <p>
        Invopap provides digital document downloads (PDF files). Once a document
        has been successfully generated and downloaded, the transaction is
        considered complete.
      </p>

      <h2>Refund Eligibility</h2>
      <p>We will issue a refund (KSh 10) in the following cases:</p>
      <ul>
        <li>
          <strong>Payment was charged but PDF download failed</strong> — If our
          system confirms payment but fails to generate or deliver the PDF due to
          a technical error on our end.
        </li>
        <li>
          <strong>Double payment</strong> — If you were charged more than once
          for the same document due to a system error.
        </li>
        <li>
          <strong>M-Pesa deducted but payment not reflected</strong> — If M-Pesa
          confirms deduction but our system doesn&apos;t register the payment
          (callback failure).
        </li>
      </ul>

      <h2>Non-Refundable</h2>
      <ul>
        <li>
          Successfully downloaded documents (the PDF was generated and
          delivered)
        </li>
        <li>Dissatisfaction with the document content you entered</li>
        <li>
          Payments cancelled by the user during M-Pesa PIN entry (these are
          not charged)
        </li>
      </ul>

      <h2>How to Request a Refund</h2>
      <ol>
        <li>
          Email <a href="mailto:support@invopap.com">support@invopap.com</a>{" "}
          with:
          <ul>
            <li>Your M-Pesa phone number</li>
            <li>M-Pesa transaction/receipt number</li>
            <li>Date and time of payment</li>
            <li>Description of the issue</li>
          </ul>
        </li>
        <li>We will investigate within 48 hours</li>
        <li>
          If approved, the refund will be processed to your M-Pesa number within
          5 business days
        </li>
      </ol>

      <h2>Processing Time</h2>
      <p>
        Refund requests are processed within 48 hours. M-Pesa refunds typically
        arrive within 1-5 business days.
      </p>

      <h2>Contact</h2>
      <p>
        For refund requests, email{" "}
        <a href="mailto:support@invopap.com">support@invopap.com</a> or reach
        us via our support channels.
      </p>
    </article>
  );
}
