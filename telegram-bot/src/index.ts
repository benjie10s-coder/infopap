import * as dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { BotHandlers } from './handlers.js';

// Load environment variables
dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN is not set in environment variables');
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

console.log('🤖 InvoSafi Telegram Bot is starting...');

// ============ COMMAND HANDLERS ============

bot.onText(/^\/start/, async (msg) => {
  try {
    await BotHandlers.handleStart(bot, msg);
  } catch (error) {
    console.error('Error in /start handler:', error);
  }
});

bot.onText(/^\/cancel/, async (msg) => {
  try {
    const { chat } = msg;
    if (!chat) return;

    await bot.sendMessage(chat.id, '❌ Operation cancelled. Type /start to begin again.');
  } catch (error) {
    console.error('Error in /cancel handler:', error);
  }
});

bot.onText(/^\/help/, async (msg) => {
  try {
    const { chat } = msg;
    if (!chat) return;

    const helpMessage = `✅ *InvoSafi Bot Help*

*Supported Document Types:*
• 📄 Invoice - Formal bill for goods/services
• 💼 Quotation - Price estimates
• 🛍️ Cash Sale - Immediate cash transactions
• 📦 Delivery Note - Shiping documents
• 📋 Purchase Order - Procurement requests
• 🧾 Receipt - Payment confirmations

*How to use:*
1. Type /start to begin
2. Select a document type
3. Fill in your business details step by step
4. Add line items (products/services)
5. Review your document
6. Pay with M-Pesa
7. Download your PDF

*Commands:*
/start - Start creating a document
/cancel - Cancel current operation
/help - Show this message

*Issues?*
If you encounter any problems, try /start again to create a new document.`;

    await bot.sendMessage(chat.id, helpMessage, {
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Error in /help handler:', error);
  }
});

// ============ CALLBACK QUERY HANDLER ============

bot.on('callback_query', async (callbackQuery) => {
  try {
    await BotHandlers.handleCallbackQuery(bot, callbackQuery);
  } catch (error) {
    console.error('Error in callback query handler:', error);
  }
});

// ============ MESSAGE HANDLER ============

bot.on('message', async (msg) => {
  try {
    // Skip command messages (handled above)
    if (msg.text?.startsWith('/')) {
      return;
    }

    await BotHandlers.handleMessage(bot, msg);
  } catch (error) {
    console.error('Error in message handler:', error);
    const { chat } = msg;
    if (chat) {
      await bot.sendMessage(
        chat.id,
        '❌ An error occurred. Please try again or type /start',
        {
          parse_mode: 'Markdown',
        }
      );
    }
  }
});

// ============ ERROR HANDLING ============

bot.on('poll_error', (error) => {
  console.error('❌ Polling error:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Optionally restart the bot
  setTimeout(() => {
    console.log('🔄 Restarting bot...');
    process.exit(1);
  }, 5000);
});

// ============ GRACEFUL SHUTDOWN ============

process.on('SIGINT', async () => {
  console.log('\n📴 Shutting down bot gracefully...');
  await bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n📴 Shutting down bot gracefully...');
  await bot.stopPolling();
  process.exit(0);
});

console.log('✅ Bot is ready!');
console.log('⏳ Waiting for messages...');
