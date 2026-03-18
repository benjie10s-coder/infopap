import TelegramBot from 'node-telegram-bot-api';
import { DocumentType, ConversationState, LineItem } from './types.js';

// Keyboard markups
export function getDocumentTypeKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '📄 Invoice', callback_data: 'doc_invoice' },
        { text: '💼 Quotation', callback_data: 'doc_quotation' },
      ],
      [
        { text: '🛍️ Cash Sale', callback_data: 'doc_cash-sale' },
        { text: '📦 Delivery Note', callback_data: 'doc_delivery-note' },
      ],
      [
        { text: '📋 Purchase Order', callback_data: 'doc_purchase-order' },
        { text: '🧾 Receipt', callback_data: 'doc_receipt' },
      ],
      [{ text: '❌ Cancel', callback_data: 'cancel' }],
    ],
  };
}

export function getConfirmKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '✅ Yes', callback_data: 'confirm_yes' },
        { text: '❌ No', callback_data: 'confirm_no' },
      ],
    ],
  };
}

export function getAddItemKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '➕ Add Another Item', callback_data: 'add_item' },
        { text: '✅ Done', callback_data: 'items_done' },
      ],
    ],
  };
}

export function getPreviewKeyboard(previewLink: string): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: '👁️ Preview Document',
          url: previewLink,
        },
      ],
      [
        { text: '✏️ Edit', callback_data: 'edit_document' },
        { text: '💳 Proceed to Payment', callback_data: 'proceed_payment' },
      ],
      [{ text: '❌ Cancel', callback_data: 'cancel' }],
    ],
  };
}

export function getRetryPaymentKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '🔄 Retry Payment', callback_data: 'retry_payment' },
        { text: '❌ Cancel', callback_data: 'cancel' },
      ],
    ],
  };
}

// Message templates
export function getWelcomeMessage(): string {
  return `👋 *Welcome to InvoSafi Bot!*

I help you create professional documents (invoices, quotations, receipts, and more) with just a few messages.

*Here's how it works:*
1️⃣ Select document type
2️⃣ Fill in your business details
3️⃣ Add line items
4️⃣ Preview your document
5️⃣ Pay with M-Pesa
6️⃣ Download your PDF

*Let's get started!* Select a document type below 👇`;
}

export function getDocumentTypeDescription(docType: DocumentType): string {
  const descriptions: Record<DocumentType, string> = {
    invoice: '📄 *Invoice* - Send a formal bill for goods or services',
    quotation: '💼 *Quotation* - Provide a price estimate to your customer',
    'cash-sale': '🛍️ *Cash Sale* - Record an immediate cash transaction',
    'delivery-note': '📦 *Delivery Note* - Document shipment of goods',
    'purchase-order': '📋 *Purchase Order* - Request goods from a supplier',
    receipt: '🧾 *Receipt* - Confirm payment received',
  };

  return descriptions[docType] || 'Document';
}

export function formatLineItemsForDisplay(items: LineItem[]): string {
  if (items.length === 0) {
    return '*(No items yet)*';
  }

  const formatted = items
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.description}\n   Qty: ${item.quantity} × ${item.rate} = ${(
          item.quantity * item.rate
        ).toFixed(2)}`
    )
    .join('\n\n');

  return formatted;
}

export function formatCurrencyOptions(): string {
  return 'Common: KES (Kenyan Shilling), USD, EUR, GBP, ZAR, UGX, TZS\nOr enter any currency code';
}

export function getPaymentPhoneHint(): string {
  return 'Enter your M-Pesa registered phone number\nFormat: *0712345678* or *254712345678*';
}

export function getPaymentPromptMessage(amount: number, phone: string): string {
  return `💳 *M-Pesa Payment Initiated*

Amount: *${amount}*
Phone: *${phone}*

📱 Check your phone for the M-Pesa prompt and enter your PIN.

⏳ Waiting for payment confirmation...`;
}

export function getPaymentSuccessMessage(receipt: string): string {
  return `✅ *Payment Successful!*

M-Pesa Receipt: \`${receipt}\`

Your PDF document is now ready for download. Click below to get it! 👇`;
}

export function getPaymentFailedMessage(reason?: string): string {
  return `❌ *Payment Failed*

${reason ? `Reason: ${reason}` : 'Unable to process payment. Please try again.'}

Would you like to retry? 👇`;
}

export function formatSummary(state: ConversationState, documentType: DocumentType): string {
  const lines = [
    `📋 *${getDocumentTypeDescription(documentType).split(' ')[1].toUpperCase()} Summary*`,
    '',
    `*From:* ${state.formData.fromName || '—'}`,
    `*To:* ${state.formData.toName || '—'}`,
    `*Currency:* ${state.formData.currency || '—'}`,
  ];

  if (state.formData.taxRate !== undefined) {
    lines.push(`*Tax Rate:* ${state.formData.taxRate}%`);
  }

  if (state.formData.dueDate) {
    lines.push(`*Due Date:* ${state.formData.dueDate}`);
  }

  lines.push('');
  lines.push('*Line Items:*');
  lines.push(formatLineItemsForDisplay(state.formData.lineItems));

  return lines.join('\n');
}

export function getErrorMessage(error: any): string {
  const message = error instanceof Error ? error.message : String(error);
  return `❌ *Error:* ${message}`;
}

export function formatPhoneNumber(phone: string): string {
  // Normalize phone to 254XXXXXXXXX format
  if (phone.startsWith('0')) {
    return '254' + phone.slice(1);
  }
  if (phone.startsWith('+254')) {
    return phone.replace('+', '');
  }
  return phone;
}

export function isValidPhoneNumber(phone: string): boolean {
  // Kenya phone validation
  const normalized = formatPhoneNumber(phone);
  return /^254\d{9}$/.test(normalized);
}

export function isValidCurrency(currency: string): boolean {
  // Accept 3-letter currency codes
  return /^[A-Z]{3}$/.test(currency.toUpperCase());
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function calculateTotal(
  lineItems: LineItem[],
  taxRate?: number,
  discountAmount?: number
): number {
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  let total = subtotal;

  if (taxRate !== undefined) {
    const tax = (subtotal * taxRate) / 100;
    total += tax;
  }

  if (discountAmount !== undefined) {
    total -= discountAmount;
  }

  return Math.max(total, 0); // Prevent negative totals
}
