#!/usr/bin/env node
/**
 * Test script for Resend email configuration
 * Run: node scripts/test-resend.js
 */

const { Resend } = require("resend");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const FROM_NAME = process.env.RESEND_FROM_NAME || "InvoSafi";

console.log("\n=== Resend Email Configuration Test ===\n");

// Check if API key is set
if (!RESEND_API_KEY) {
  console.error("❌ RESEND_API_KEY environment variable is not set!");
  console.error("   Set it with: export RESEND_API_KEY='your_key_here'");
  process.exit(1);
}

console.log("✓ RESEND_API_KEY is set");
console.log(`✓ From Email: ${FROM_EMAIL}`);
console.log(`✓ From Name: ${FROM_NAME}\n`);

// Initialize Resend client
const resend = new Resend(RESEND_API_KEY);

// Test email parameters
const testEmail = {
  from: `${FROM_NAME} <${FROM_EMAIL}>`,
  to: process.argv[2] || "delivered@resend.dev", // Use arg or Resend test email
  subject: "InvoSafi Email Configuration Test",
  html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Test Email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px;">
  <h2>InvoSafi Email Configuration Test</h2>
  <p>This is a test email to verify your Resend setup is working correctly.</p>
  <p><strong>Test Details:</strong></p>
  <ul>
    <li>Email Service: Resend</li>
    <li>From: ${FROM_EMAIL}</li>
    <li>Sent at: ${new Date().toLocaleString()}</li>
  </ul>
  <p>If you received this email, your Resend configuration is working! ✓</p>
  <hr style="margin: 20px 0;">
  <p style="font-size: 12px; color: #666;">
    This is a test email from InvoSafi. Please ignore if you didn't expect this.
  </p>
</body>
</html>
  `,
  text: `
InvoSafi Email Configuration Test

This is a test email to verify your Resend setup is working correctly.

If you received this email, your Resend configuration is working!

---
Email Service: Resend
From: ${FROM_EMAIL}
Sent at: ${new Date().toLocaleString()}
  `,
};

console.log("📧 Sending test email...\n");
console.log(`   To: ${testEmail.to}`);
console.log(`   Subject: ${testEmail.subject}\n`);

// Send test email
(async () => {
  try {
    const response = await resend.emails.send(testEmail);

    if (response.error) {
      console.error("❌ Email send failed:");
      console.error(`   Error: ${response.error.message}`);
      process.exit(1);
    }

    console.log("✓ Email sent successfully!\n");
    console.log(`📬 Resend Email ID: ${response.data.id}`);
    console.log(`\n📋 Next Steps:`);
    console.log(`   1. Check your email (${testEmail.to}) in a few seconds`);
    console.log(`   2. Visit Resend Dashboard → Logs to view send status`);
    console.log(`   3. If successful, your setup is complete!\n`);
    console.log(
      `💡 Running tests with a specific email: node scripts/test-resend.js your-email@example.com\n`
    );
  } catch (error) {
    console.error("❌ Unexpected error:");
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
})();
