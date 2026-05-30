import type { VercelRequest, VercelResponse } from '@vercel/node';

import { replyToMessage } from '../lib/gemini.js';
import { createBot } from '../lib/telegram.js';

const geminiApiKey = process.env.GEMINI_API_KEY;
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;

function buildBot() {
    if (!telegramToken) throw new Error('Missing TELEGRAM_BOT_TOKEN');

    const bot = createBot(telegramToken);

    bot.on('message:text', async (ctx) => {
        const { text, message_id, from, chat } = ctx.message;

        console.log(`[webhook] message from ${from?.username ?? from?.first_name} (chat ${chat.id}): ${text}`);

        if (!geminiApiKey) {
            console.error('Missing GEMINI_API_KEY');
            return;
        }

        const replyText = await replyToMessage(geminiApiKey, text);
        await ctx.reply(replyText, { reply_to_message_id: message_id });
    });

    return bot;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const secretToken = request.headers['x-telegram-bot-api-secret-token'];
    if (secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
        return response.status(401).json({ error: 'Unauthorized' });
    }

    if (!telegramToken) {
        console.error('Missing TELEGRAM_BOT_TOKEN');
        return response.status(200).json({ ok: true });
    }

    try {
        const bot = buildBot();
        await bot.init();
        await bot.handleUpdate(request.body);
    } catch (error) {
        console.error('Failed to handle Telegram update:', error);
    }

    return response.status(200).json({ ok: true });
}
