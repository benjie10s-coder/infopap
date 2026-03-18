import TelegramBot from 'node-telegram-bot-api';
import { stateManager } from './state-manager.js';
import { apiClient } from './api-client.js';
import { ConversationState, DocumentType, LineItem } from './types.js';
import {
  getDocumentTypeKeyboard,
  getConfirmKeyboard,
  getAddItemKeyboard,
  getPreviewKeyboard,
  getRetryPaymentKeyboard,
  formatLineItemsForDisplay,
  formatPhoneNumber,
  isValidPhoneNumber,
  isValidCurrency,
  formatSummary,
  getErrorMessage,
  getPaymentPromptMessage,
  getPaymentSuccessMessage,
  getPaymentFailedMessage,
  getWelcomeMessage,
  calculateTotal,
} from './helpers.js';

interface HandlerContext {
  bot: TelegramBot;
  chatId: number;
  userId: number;
  msg: TelegramBot.Message;
  state: ConversationState;
}

interface CallbackContext extends HandlerContext {
  callbackQueryId: string;
  callbackData: string;
}

export class BotHandlers {
  // ============ START COMMAND ============
  static async handleStart(bot: TelegramBot, msg: TelegramBot.Message) {
    const { chat, from } = msg;
    if (!chat || !from) return;

    stateManager.createState(chat.id, from.id);

    await bot.sendMessage(chat.id, getWelcomeMessage(), {
      parse_mode: 'Markdown',
      reply_markup: getDocumentTypeKeyboard(),
    });
  }

  // ============ DOCUMENT TYPE SELECTION ============
  static async handleDocumentTypeSelection(
    bot: TelegramBot,
    chatId: number,
    userId: number,
    docType: DocumentType
  ) {
    const state = stateManager.updateState(chatId, { documentType: docType });

    const docNames: Record<DocumentType, string> = {
      invoice: 'Invoice',
      quotation: 'Quotation',
      'cash-sale': 'Cash Sale',
      'delivery-note': 'Delivery Note',
      'purchase-order': 'Purchase Order',
      receipt: 'Receipt',
    };

    stateManager.setStep(chatId, 'enter-from-name');

    await bot.sendMessage(
      chatId,
      `✅ *${docNames[docType]} selected!*\n\nLet's fill in the details.\n\n*First, what's YOUR business/name?*`,
      {
        parse_mode: 'Markdown',
      }
    );
  }

  // ============ FIELD COLLECTION HANDLERS ============
  static async handleFromName(bot: TelegramBot, msg: TelegramBot.Message) {
    const { chat, from, text } = msg;
    if (!chat || !from || !text) return;

    stateManager.setFormData(chat.id, 'fromName', text);
    stateManager.setStep(chat.id, 'enter-to-name');

    await bot.sendMessage(chat.id, '*Who is this document for?*\n(Enter the recipient name/business)', {
      parse_mode: 'Markdown',
    });
  }

  static async handleToName(bot: TelegramBot, msg: TelegramBot.Message) {
    const { chat, from, text } = msg;
    if (!chat || !from || !text) return;

    const state = stateManager.getState(chat.id);
    if (!state) return;

    stateManager.setFormData(chat.id, 'toName', text);

    // Skip currency for delivery notes
    const nextStep = state.documentType === 'delivery-note' ? 'add-line-items' : 'enter-currency';
    stateManager.setStep(chat.id, nextStep);

    if (nextStep === 'enter-currency') {
      await bot.sendMessage(
        chat.id,
        '*What currency?*\nExamples: KES, USD, EUR, GBP\n\n(Just type the 3-letter code)',
        {
          parse_mode: 'Markdown',
        }
      );
    } else {
      await bot.sendMessage(chat.id, '*Great! Now let\'s add the items/services.*\n\n*Item Name/Description?*', {
        parse_mode: 'Markdown',
      });
    }
  }

  static async handleCurrency(bot: TelegramBot, msg: TelegramBot.Message) {
    const { chat, from, text } = msg;
    if (!chat || !from || !text) return;

    const currency = text.toUpperCase();

    if (!isValidCurrency(currency)) {
      await bot.sendMessage(chat.id, '❌ Invalid currency code. Please use 3 letters (e.g., KES, USD)', {
        parse_mode: 'Markdown',
      });
      return;
    }

    stateManager.setFormData(chat.id, 'currency', currency);

    const state = stateManager.getState(chat.id);
    if (!state) return;

    // Tax rate only for certain document types
    const needsTax = ['invoice', 'cash-sale', 'purchase-order'].includes(state.documentType || '');

    if (needsTax) {
      stateManager.setStep(chat.id, 'enter-tax-rate');
      await bot.sendMessage(
        chat.id,
        '*What\'s the tax rate?*\nEnter a number (e.g., 16 for 16%)\n\nOr type 0 for no tax',
        {
          parse_mode: 'Markdown',
        }
      );
    } else {
      stateManager.setStep(chat.id, 'add-line-items');
      await bot.sendMessage(chat.id, '*Great! Now let\'s add the items/services.*\n\n*Item Name/Description?*', {
        parse_mode: 'Markdown',
      });
    }
  }

  static async handleTaxRate(bot: TelegramBot, msg: TelegramBot.Message) {
    const { chat, from, text } = msg;
    if (!chat || !from || !text) return;

    const taxRate = parseFloat(text);

    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      await bot.sendMessage(chat.id, '❌ Invalid tax rate. Please enter a number between 0 and 100', {
        parse_mode: 'Markdown',
      });
      return;
    }

    stateManager.setFormData(chat.id, 'taxRate', taxRate);
    stateManager.setStep(chat.id, 'add-line-items');

    await bot.sendMessage(chat.id, '*Perfect! Now let\'s add the items/services.*\n\n*Item Name/Description?*', {
      parse_mode: 'Markdown',
    });
  }

  // ============ LINE ITEMS COLLECTION ============
  static async handleAddItemName(bot: TelegramBot, msg: TelegramBot.Message) {
    const { chat, from, text } = msg;
    if (!chat || !from || !text) return;

    stateManager.setTempItemData(chat.id, { description: text });
    stateManager.setStep(chat.id, 'add-item-qty');

    await bot.sendMessage(chat.id, `*Item: ${text}*\n\n*How many?* (quantity)`, {
      parse_mode: 'Markdown',
    });
  }

  static async handleAddItemQty(bot: TelegramBot, msg: TelegramBot.Message) {
    const { chat, from, text } = msg;
    if (!chat || !from || !text) return;

    const quantity = parseFloat(text);

    if (isNaN(quantity) || quantity <= 0) {
      await bot.sendMessage(chat.id, '❌ Invalid quantity. Please enter a positive number', {
        parse_mode: 'Markdown',
      });
      return;
    }

    const state = stateManager.getState(chat.id);
    if (!state?.tempItemData) return;

    stateManager.setTempItemData(chat.id, { ...state.tempItemData, quantity });
    stateManager.setStep(chat.id, 'add-item-rate');

    await bot.sendMessage(
      chat.id,
      `*Item: ${state.tempItemData.description}*\nQty: ${quantity}\n\n*Unit rate/price?*`,
      {
        parse_mode: 'Markdown',
      }
    );
  }

  static async handleAddItemRate(bot: TelegramBot, msg: TelegramBot.Message) {
    const { chat, from, text } = msg;
    if (!chat || !from || !text) return;

    const rate = parseFloat(text);

    if (isNaN(rate) || rate <= 0) {
      await bot.sendMessage(chat.id, '❌ Invalid rate. Please enter a positive number', {
        parse_mode: 'Markdown',
      });
      return;
    }

    const state = stateManager.getState(chat.id);
    if (!state?.tempItemData) return;

    const item: LineItem = {
      description: state.tempItemData.description!,
      quantity: state.tempItemData.quantity!,
      rate,
      amount: state.tempItemData.quantity! * rate,
    };

    stateManager.addLineItem(chat.id, item);
    stateManager.clearTempItemData(chat.id);
    stateManager.setStep(chat.id, 'add-item-confirm');

    const total = item.quantity * item.rate;

    await bot.sendMessage(
      chat.id,
      `✅ *Item added!*\n\n${item.description}\n${item.quantity} × ${item.rate} = *${total.toFixed(2)}*\n\nWhat would you like to do?`,
      {
        parse_mode: 'Markdown',
        reply_markup: getAddItemKeyboard(),
      }
    );
  }

  // ============ DOCUMENT CREATION & PREVIEW ============
  static async handleCreateDocument(bot: TelegramBot, chatId: number) {
    const state = stateManager.getState(chatId);
    if (!state || !state.documentType) return;

    // Validate required fields
    if (!state.formData.fromName || !state.formData.toName) {
      await bot.sendMessage(chatId, '❌ Missing required fields (name information)', {
        parse_mode: 'Markdown',
      });
      return;
    }

    if (state.formData.lineItems.length === 0) {
      await bot.sendMessage(chatId, '❌ Please add at least one line item', {
        parse_mode: 'Markdown',
      });
      return;
    }

    // Show loading message
    const loadingMsg = await bot.sendMessage(chatId, '⏳ Creating document...', {
      parse_mode: 'Markdown',
    });

    try {
      // Create document via API
      const payload = {
        fromName: state.formData.fromName,
        toName: state.formData.toName,
        lineItems: state.formData.lineItems,
        ...(state.formData.currency && { currency: state.formData.currency }),
        ...(state.formData.taxRate !== undefined && { taxRate: state.formData.taxRate }),
        ...(state.formData.dueDate && { dueDate: state.formData.dueDate }),
      };

      const response = await apiClient.createDocument(
        state.documentType,
        payload,
        state.guestSessionId
      );

      // Fetch full document to get PDF URL
      let pdfUrl: string | undefined;
      try {
        const fullDoc = await apiClient.getDocument(
          state.documentType,
          response.id,
          state.guestSessionId
        );
        pdfUrl = fullDoc.pdfUrl;
      } catch (err) {
        // PDF might not be ready yet, that's okay
      }

      stateManager.setDocumentInfo(chatId, response.id, response.publicId, pdfUrl);
      stateManager.setStep(chatId, 'review-document');

      // Delete loading message
      try {
        await bot.deleteMessage(chatId, loadingMsg.message_id);
      } catch {
        // Silent fail
      }

      // Send preview
      const previewLink = apiClient.generatePreviewLink(state.documentType, response.publicId);
      const summary = formatSummary(state, state.documentType);

      await bot.sendMessage(chatId, `✅ *Document Created!*\n\n${summary}`, {
        parse_mode: 'Markdown',
        reply_markup: getPreviewKeyboard(previewLink),
      });
    } catch (error) {
      try {
        await bot.deleteMessage(chatId, loadingMsg.message_id);
      } catch {
        // Silent fail
      }

      await bot.sendMessage(chatId, getErrorMessage(error), {
        parse_mode: 'Markdown',
      });

      stateManager.setStep(chatId, 'add-item-confirm');
    }
  }

  // ============ PAYMENT FLOW ============
  static async handlePaymentPhoneRequest(bot: TelegramBot, msg: TelegramBot.Message) {
    const { chat, from, text } = msg;
    if (!chat || !from || !text) return;

    if (!isValidPhoneNumber(text)) {
      await bot.sendMessage(
        chat.id,
        '❌ Invalid phone number.\n\nPlease use format: *0712345678* or *254712345678*',
        {
          parse_mode: 'Markdown',
        }
      );
      return;
    }

    const state = stateManager.getState(chat.id);
    if (!state || !state.publicId || !state.documentType) return;

    const normalizedPhone = formatPhoneNumber(text);
    stateManager.setStep(chat.id, 'payment-status');

    const loadingMsg = await bot.sendMessage(chat.id, '⏳ Initiating M-Pesa payment...', {
      parse_mode: 'Markdown',
    });

    try {
      const paymentResponse = await apiClient.initiatePayment(
        state.publicId,
        normalizedPhone,
        state.documentType,
        state.guestSessionId
      );

      if (!paymentResponse.checkoutRequestId) {
        throw new Error('No checkout request ID returned');
      }

      stateManager.setPaymentInfo(
        chat.id,
        paymentResponse.checkoutRequestId,
        paymentResponse.merchantRequestId || '',
        normalizedPhone
      );

      try {
        await bot.deleteMessage(chat.id, loadingMsg.message_id);
      } catch {
        // Silent fail
      }

      // Calculate amount from line items
      const total = calculateTotal(
        state.formData.lineItems,
        state.formData.taxRate,
        0
      );

      await bot.sendMessage(
        chat.id,
        getPaymentPromptMessage(total, normalizedPhone),
        {
          parse_mode: 'Markdown',
        }
      );

      // Start polling for payment status
      BotHandlers.startPaymentPoling(bot, chat.id, paymentResponse.checkoutRequestId, state.documentType);
    } catch (error) {
      try {
        await bot.deleteMessage(chat.id, loadingMsg.message_id);
      } catch {
        // Silent fail
      }

      await bot.sendMessage(chat.id, getErrorMessage(error), {
        parse_mode: 'Markdown',
        reply_markup: getRetryPaymentKeyboard(),
      });
    }
  }

  static startPaymentPoling(
    bot: TelegramBot,
    chatId: number,
    checkoutRequestId: string,
    documentType: DocumentType,
    attempts: number = 0,
    maxAttempts: number = 30
  ) {
    const pollTimeout = setTimeout(async () => {
      const state = stateManager.getState(chatId);
      if (!state) {
        clearTimeout(pollTimeout);
        return;
      }

      try {
        const paymentStatus = await apiClient.queryPaymentStatus(
          checkoutRequestId,
          state.guestSessionId
        );

        if (paymentStatus.status === 'COMPLETED' && paymentStatus.mpesaReceiptNumber) {
          clearTimeout(pollTimeout);
          stateManager.setStep(chatId, 'download-pdf');

          await bot.sendMessage(
            chatId,
            getPaymentSuccessMessage(paymentStatus.mpesaReceiptNumber),
            {
              parse_mode: 'Markdown',
            }
          );

          // Send PDF file
          BotHandlers.sendPDFDocument(bot, chatId);
        } else if (paymentStatus.status === 'FAILED') {
          clearTimeout(pollTimeout);
          stateManager.setStep(chatId, 'payment-status');

          await bot.sendMessage(
            chatId,
            getPaymentFailedMessage('Payment was declined'),
            {
              parse_mode: 'Markdown',
              reply_markup: getRetryPaymentKeyboard(),
            }
          );
        } else if (attempts < maxAttempts) {
          // Continue polling
          BotHandlers.startPaymentPoling(bot, chatId, checkoutRequestId, documentType, attempts + 1, maxAttempts);
        } else {
          // Timeout
          clearTimeout(pollTimeout);
          await bot.sendMessage(
            chatId,
            '⏳ *Payment check timed out*\n\nPlease check your M-Pesa app for the result. Once confirmed, you can download your document.',
            {
              parse_mode: 'Markdown',
            }
          );
        }
      } catch (error) {
        console.error('Payment polling error:', error);
        if (attempts < maxAttempts) {
          BotHandlers.startPaymentPoling(bot, chatId, checkoutRequestId, documentType, attempts + 1, maxAttempts);
        }
      }
    }, 2000); // Poll every 2 seconds
  }

  static async sendPDFDocument(bot: TelegramBot, chatId: number) {
    const state = stateManager.getState(chatId);
    if (!state || !state.documentType || !state.publicId) return;

    try {
      const loadingMsg = await bot.sendMessage(chatId, '⏳ Preparing PDF download...', {
        parse_mode: 'Markdown',
      });

      // Fetch document to get PDF URL
      const document = await apiClient.getDocument(
        state.documentType,
        state.documentId || state.publicId,
        state.guestSessionId
      );

      if (!document.pdfUrl) {
        throw new Error('PDF URL not available');
      }

      // Download PDF from URL and send to Telegram
      const response = await fetch(document.pdfUrl);
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const filename = `${state.documentType}-${state.publicId}.pdf`;

      try {
        await bot.deleteMessage(chatId, loadingMsg.message_id);
      } catch {
        // Silent fail
      }

      await bot.sendDocument(chatId, buffer, {
        caption: `✅ Your ${state.documentType} PDF is ready!\n\nDocument ID: ${state.publicId}`,
      }, {filename: `${state.documentType}-${state.publicId}.pdf`});

      stateManager.setStep(chatId, 'complete');

      await bot.sendMessage(
        chatId,
        '🎉 *All done!*\n\nThank you for using InvoSafi Bot.\n\nYou can create another document anytime. Just /start',
        {
          parse_mode: 'Markdown',
        }
      );
    } catch (error) {
      console.error('Error sending PDF:', error);
      await bot.sendMessage(
        chatId,
        `❌ Failed to prepare PDF: ${error instanceof Error ? error.message : 'Unknown error'}\n\nYou can download it manually from the preview link above.`,
        {
          parse_mode: 'Markdown',
        }
      );
    }
  }

  // ============ CALLBACK QUERY HANDLERS ============
  static async handleCallbackQuery(bot: TelegramBot, callbackQuery: TelegramBot.CallbackQuery) {
    const { id: callbackQueryId, data, message, from } = callbackQuery;
    if (!data || !message || !from) return;

    const chatId = message.chat.id;
    let state = stateManager.getState(chatId);

    if (!state) {
      state = stateManager.createState(chatId, from.id);
    }

    try {
      if (data.startsWith('doc_')) {
        const docType = data.replace('doc_', '') as DocumentType;
        await BotHandlers.handleDocumentTypeSelection(bot, chatId, from.id, docType);
      } else if (data === 'confirm_yes') {
        await BotHandlers.handleCreateDocument(bot, chatId);
      } else if (data === 'confirm_no') {
        stateManager.setStep(chatId, 'add-item-confirm');
        await bot.sendMessage(chatId, 'Okay, let\'s review your items.', {
          parse_mode: 'Markdown',
          reply_markup: getAddItemKeyboard(),
        });
      } else if (data === 'add_item') {
        stateManager.setStep(chatId, 'add-item-name');
        await bot.sendMessage(chatId, '*Item Name/Description?*', {
          parse_mode: 'Markdown',
        });
      } else if (data === 'items_done') {
        stateManager.setStep(chatId, 'review-document');

        const summary = formatSummary(state, state.documentType!);
        await bot.sendMessage(
          chatId,
          `${summary}\n\n✅ *Ready to create this document?*`,
          {
            parse_mode: 'Markdown',
            reply_markup: getConfirmKeyboard(),
          }
        );
      } else if (data === 'proceed_payment') {
        stateManager.setStep(chatId, 'payment-phone');
        await bot.sendMessage(chatId, `💳 *M-Pesa Payment*\n\n${formatPhoneNumber('')}`, {
          parse_mode: 'Markdown',
        });

        // Actually send proper message
        await bot.sendMessage(
          chatId,
          '📱 *Enter your M-Pesa phone number*\n\nFormat: 0712345678 or 254712345678',
          {
            parse_mode: 'Markdown',
          }
        );
      } else if (data === 'retry_payment') {
        stateManager.setStep(chatId, 'payment-phone');
        await bot.sendMessage(
          chatId,
          '📱 *Enter your M-Pesa phone number again*\n\nFormat: 0712345678 or 254712345678',
          {
            parse_mode: 'Markdown',
          }
        );
      } else if (data === 'cancel') {
        stateManager.deleteState(chatId);
        stateManager.createState(chatId, from.id);
        await bot.sendMessage(chatId, getWelcomeMessage(), {
          parse_mode: 'Markdown',
          reply_markup: getDocumentTypeKeyboard(),
        });
      } else if (data === 'edit_document') {
        state = stateManager.getState(chatId);
        if (state?.publicId && state?.documentType) {
          const editLink = `${process.env.API_BASE_URL || 'http://localhost:3000'}/view/${state.documentType}/${state.publicId}?edit=true`;
          await bot.sendMessage(chatId, `[Edit your document](${editLink})`, {
            parse_mode: 'Markdown',
          });
        }
      }

      // Answer callback query
      await bot.answerCallbackQuery(callbackQueryId);
    } catch (error) {
      console.error('Callback query error:', error);
      await bot.answerCallbackQuery(callbackQueryId, {
        text: 'An error occurred',
        show_alert: true,
      });
    }
  }

  // ============ MESSAGE ROUTER ============
  static async handleMessage(bot: TelegramBot, msg: TelegramBot.Message) {
    const { chat, from, text } = msg;
    if (!chat || !from || !text) return;

    // Create state if it doesn't exist
    let state = stateManager.getState(chat.id);
    if (!state) {
      state = stateManager.createState(chat.id, from.id);
    }

    // Route based on current step
    try {
      switch (state.currentStep) {
        case 'select-doc-type':
          // Handled via callback buttons
          await bot.sendMessage(
            chat.id,
            '👆 Please select a document type using the buttons above',
            {
              reply_markup: getDocumentTypeKeyboard(),
            }
          );
          break;

        case 'enter-from-name':
          await BotHandlers.handleFromName(bot, msg);
          break;

        case 'enter-to-name':
          await BotHandlers.handleToName(bot, msg);
          break;

        case 'enter-currency':
          await BotHandlers.handleCurrency(bot, msg);
          break;

        case 'enter-tax-rate':
          await BotHandlers.handleTaxRate(bot, msg);
          break;

        case 'add-line-items':
        case 'add-item-name':
          await BotHandlers.handleAddItemName(bot, msg);
          break;

        case 'add-item-qty':
          await BotHandlers.handleAddItemQty(bot, msg);
          break;

        case 'add-item-rate':
          await BotHandlers.handleAddItemRate(bot, msg);
          break;

        case 'payment-phone':
          await BotHandlers.handlePaymentPhoneRequest(bot, msg);
          break;

        default:
          await bot.sendMessage(
            chat.id,
            '👆 Please use the buttons above or type /start to begin',
            {
              reply_markup: getDocumentTypeKeyboard(),
            }
          );
      }
    } catch (error) {
      console.error('Message handler error:', error);
      await bot.sendMessage(chat.id, getErrorMessage(error), {
        parse_mode: 'Markdown',
      });
    }
  }
}
