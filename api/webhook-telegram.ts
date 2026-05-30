import type { VercelRequest, VercelResponse } from '@vercel/node';

import { replyToMessage } from '../lib/gemini.js';
import { sendTelegramMessage, type TelegramUpdate } from '../lib/telegram.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
    // Telegram sends POST requests only
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    // Validate the secret token Telegram sends in the header
    const secretToken = request.headers['x-telegram-bot-api-secret-token'];
    if (secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
        return response.status(401).json({ error: 'Unauthorized' });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!geminiApiKey || !telegramToken) {
        console.error('Missing GEMINI_API_KEY or TELEGRAM_BOT_TOKEN');
        // Always return 200 to Telegram so it doesn't retry
        return response.status(200).json({ ok: true });
    }

    const update = request.body as TelegramUpdate;
    const message = update.message;

    // Ignore non-text messages and bot messages
    if (!message?.text || message.from?.is_bot) {
        return response.status(200).json({ ok: true });
    }

    const chatId = String(message.chat.id);
    const userText = message.text;

    try {
        const replyText = await replyToMessage(geminiApiKey, userText);

        await sendTelegramMessage({
            token: telegramToken,
            chatId,
            text: replyText,
            replyToMessageId: message.message_id,
        });
    } catch (error) {
        console.error('Failed to handle Telegram message:', error);
    }

    // Always acknowledge to prevent Telegram from resending
    return response.status(200).json({ ok: true });
}
