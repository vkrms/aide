import type { VercelRequest, VercelResponse } from '@vercel/node';

import { appendChatHistory, getChatHistory } from '../db/chat-sessions.js';
import { createReminder } from '../db/reminders.js';
import { replyToMessage } from '../lib/gemini.js';
import { scheduleReminder } from '../lib/qstash.js';
import { createBot } from '../lib/telegram.js';

const geminiApiKey = process.env.GEMINI_API_KEY;
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;

function buildBot() {
    if (!telegramToken) throw new Error('Missing TELEGRAM_BOT_TOKEN');

    const bot = createBot(telegramToken);

    bot.on('message:text', async (ctx) => {
        const { text, message_id, from, chat } = ctx.message;
        const chatId = String(chat.id);

        console.log(`[webhook] message from ${from?.username ?? from?.first_name} (chat ${chatId}): ${text}`);

        if (!geminiApiKey) {
            console.error('Missing GEMINI_API_KEY');
            return;
        }

        const history = await getChatHistory(chatId);
        const result = await replyToMessage(geminiApiKey, text, history);

        if (result.type === 'scheduleReminder') {
            const { message, scheduledAt } = result.args;
            const scheduledDate = new Date(scheduledAt);
            const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://cool-aide.vercel.app';

            const reminderId = await createReminder({ telegramChatId: chatId, message, scheduledAt: scheduledDate });

            if (reminderId) {
                const qstashMessageId = await scheduleReminder({ reminderId, scheduledAt: scheduledDate, baseUrl });
                console.log(`[webhook] reminder scheduled: ${reminderId}, qstash: ${qstashMessageId}`);
                const timezone = process.env.TIMEZONE ?? 'UTC';
                const formattedTime = new Intl.DateTimeFormat('en-GB', {
                    timeZone: timezone,
                    dateStyle: 'medium',
                    timeStyle: 'short',
                }).format(scheduledDate);
                await ctx.reply(`Got it! I'll remind you at ${formattedTime} (${timezone}) 🎯`, { reply_to_message_id: message_id });
            } else {
                await ctx.reply("Hmm, I couldn't save that reminder. Try again?", { reply_to_message_id: message_id });
            }
        } else {
            await ctx.reply(result.text, { reply_to_message_id: message_id });
        }

        await appendChatHistory(chatId, result.updatedHistory.slice(history.length));
    });

    return bot;
}

let botPromise: Promise<ReturnType<typeof buildBot>> | undefined;

async function getBot() {
    if (!botPromise) {
        const bot = buildBot();
        botPromise = (async () => {
            await bot.init();
            return bot;
        })();
    }

    try {
        return await botPromise;
    } catch (error) {
        botPromise = undefined;
        throw error;
    }
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
        const bot = await getBot();
        await bot.handleUpdate(request.body);
    } catch (error) {
        console.error('Failed to handle Telegram update:', error);
    }

    return response.status(200).json({ ok: true });
}
