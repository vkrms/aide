import type { VercelRequest, VercelResponse } from '@vercel/node';

import { appendChatHistory, getChatHistory } from '../db/chat-sessions.js';
import { createReminder } from '../db/reminders.js';
import { replyToMessage } from '../lib/gemini.js';
import { scheduleReminder } from '../lib/qstash.js';
import { createBot } from '../lib/telegram.js';

const geminiApiKey = process.env.GEMINI_API_KEY;
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const debugBotReplies = process.env.DEBUG_BOT_REPLIES === 'true';
const debugBotChatId = process.env.DEBUG_BOT_CHAT_ID;
const weekdayToIndex: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
};

type ZonedParts = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    weekday: number;
};

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

function shouldIncludeDebug(chatId: string): boolean {
    return debugBotReplies && (!debugBotChatId || debugBotChatId === chatId);
}

function buildDebugBlockquote(lines: Array<[string, string | number | boolean]>): string {
    const body = lines.map(([label, value]) => `${label}: ${value}`).join('\n');

    return `\n\n<blockquote expandable>${escapeHtml(body)}</blockquote>`;
}

function getRequestedWeekday(text: string): number | null {
    const match = text
        .toLowerCase()
        .match(/\b(monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat|sunday|sun)\b/);

    if (!match) return null;

    const token = match[1];
    if (token.startsWith('mon')) return weekdayToIndex.monday;
    if (token.startsWith('tue')) return weekdayToIndex.tuesday;
    if (token.startsWith('wed')) return weekdayToIndex.wednesday;
    if (token.startsWith('thu')) return weekdayToIndex.thursday;
    if (token.startsWith('fri')) return weekdayToIndex.friday;
    if (token.startsWith('sat')) return weekdayToIndex.saturday;
    return weekdayToIndex.sunday;
}

function getZonedParts(date: Date, timeZone: string): ZonedParts {
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        weekday: 'long',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    });
    const parts = formatter.formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

    return {
        year: Number(values.year),
        month: Number(values.month),
        day: Number(values.day),
        hour: Number(values.hour),
        minute: Number(values.minute),
        second: Number(values.second),
        weekday: weekdayToIndex[values.weekday.toLowerCase()],
    };
}

function addDaysToLocalDate(year: number, month: number, day: number, days: number) {
    const shifted = new Date(Date.UTC(year, month - 1, day + days));

    return {
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth() + 1,
        day: shifted.getUTCDate(),
    };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
    const zoned = getZonedParts(date, timeZone);
    const utcFromZoned = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute, zoned.second);

    return utcFromZoned - date.getTime();
}

function zonedTimeToUtc(parts: Omit<ZonedParts, 'weekday'>, timeZone: string): Date {
    const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const firstOffset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
    const firstPass = new Date(utcGuess - firstOffset);
    const secondOffset = getTimeZoneOffsetMs(firstPass, timeZone);

    return new Date(utcGuess - secondOffset);
}

function alignScheduledDateToRequestedWeekday(text: string, scheduledDate: Date, timeZone: string) {
    const requestedWeekday = getRequestedWeekday(text);
    if (requestedWeekday === null || Number.isNaN(scheduledDate.getTime())) {
        return { adjusted: false, requestedWeekday, scheduledDate };
    }

    const now = new Date();
    const scheduledLocal = getZonedParts(scheduledDate, timeZone);
    if (scheduledLocal.weekday === requestedWeekday && scheduledDate.getTime() > now.getTime()) {
        return { adjusted: false, requestedWeekday, scheduledDate };
    }

    const nowLocal = getZonedParts(now, timeZone);
    let daysUntil = (requestedWeekday - nowLocal.weekday + 7) % 7;
    if (daysUntil === 0) daysUntil = 7;

    const targetDate = addDaysToLocalDate(nowLocal.year, nowLocal.month, nowLocal.day, daysUntil);
    const adjustedDate = zonedTimeToUtc(
        {
            ...targetDate,
            hour: scheduledLocal.hour,
            minute: scheduledLocal.minute,
            second: scheduledLocal.second,
        },
        timeZone,
    );

    return { adjusted: true, requestedWeekday, scheduledDate: adjustedDate };
}

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
            const timezone = process.env.TIMEZONE ?? 'UTC';
            const parsedScheduledDate = new Date(scheduledAt);
            const alignedReminder = alignScheduledDateToRequestedWeekday(text, parsedScheduledDate, timezone);
            const scheduledDate = alignedReminder.scheduledDate;
            const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://cool-aide.vercel.app';

            const reminderId = await createReminder({ telegramChatId: chatId, message, scheduledAt: scheduledDate });

            if (reminderId) {
                const qstashMessageId = await scheduleReminder({ reminderId, scheduledAt: scheduledDate, baseUrl });
                console.log(
                    `[webhook] reminder scheduled: ${reminderId}, qstash: ${qstashMessageId}, adjustedWeekday: ${alignedReminder.adjusted}`,
                );
                const formattedTime = new Intl.DateTimeFormat('en-GB', {
                    timeZone: timezone,
                    dateStyle: 'medium',
                    timeStyle: 'short',
                }).format(scheduledDate);
                const debugSuffix = shouldIncludeDebug(chatId)
                    ? buildDebugBlockquote([
                        ['input', text],
                        ['timezone', timezone],
                        ['nowUtc', new Date().toISOString()],
                        ['scheduledAtUtc', scheduledAt],
                        ['scheduledAtAdjusted', alignedReminder.adjusted],
                        ['requestedWeekday', alignedReminder.requestedWeekday ?? 'none'],
                        ['finalScheduledAtUtc', scheduledDate.toISOString()],
                        ['scheduledAtValid', !Number.isNaN(scheduledDate.getTime())],
                        ['scheduledAtLocal', formattedTime],
                        ['message', message],
                        ['reminderId', reminderId],
                        ['qstashMessageId', qstashMessageId],
                        ['historyLength', history.length],
                    ])
                    : '';

                await ctx.reply(`Got it! I'll remind you at ${formattedTime}${debugSuffix}`, {
                    parse_mode: 'HTML',
                    reply_to_message_id: message_id,
                });
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
