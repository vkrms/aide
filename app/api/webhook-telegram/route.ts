import { NextRequest, NextResponse } from 'next/server';

import { appendChatHistory, getLastInteractionId, setLastInteractionId } from '@/db/chat-sessions';
import { createReminder } from '@/db/reminders';
import { replyToMessage } from '@/lib/gemini';
import { scheduleReminder } from '@/lib/qstash';
import { createBot } from '@/lib/telegram';

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
    if (token.startsWith('sun')) return weekdayToIndex.sunday;

    return null;
}

function getRequestedTime(text: string): { hour: number; minute: number } | null {
    const match = text.match(/\b(\d{1,2}):(\d{2})\b/);
    if (!match) return null;

    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

    return { hour, minute };
}

function getZonedParts(date: Date, timezone: string): ZonedParts {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'short',
        hour12: false,
    }).formatToParts(date);

    const values: Record<string, number> = {};
    for (const part of parts) {
        if (part.type !== 'literal') {
            values[part.type] = parseInt(part.value, 10);
        }
    }

    return {
        year: values.year,
        month: values.month,
        day: values.day,
        hour: values.hour,
        minute: values.minute,
        second: values.second,
        weekday: values.weekday,
    };
}

function getNextWeekday(from: ZonedParts, targetWeekday: number, targetTime: { hour: number; minute: number }): Date {
    const timezone = process.env.TIMEZONE ?? 'UTC';
    const candidate = new Date(from.year, from.month - 1, from.day, targetTime.hour, targetTime.minute, 0);

    let daysUntilTarget = targetWeekday - from.weekday;
    if (daysUntilTarget < 0) daysUntilTarget += 7;

    candidate.setDate(candidate.getDate() + daysUntilTarget);

    if (candidate.getTime() <= Date.now()) {
        candidate.setDate(candidate.getDate() + 7);
    }

    return candidate;
}

async function handleReminderCommand(chatId: string, text: string): Promise<string> {
    const weekday = getRequestedWeekday(text);
    const time = getRequestedTime(text);

    if (weekday === null || time === null) {
        return 'Please specify a day and time, e.g. "remind me Monday 09:00 to review my goals"';
    }

    const whatsLeft = text
        .replace(/\b(monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat|sunday|sun)\b/i, '')
        .replace(/\b\d{1,2}:\d{2}\b/, '')
        .replace(/\bremind\b/i, '')
        .replace(/\bme\b/i, '')
        .replace(/\bto\b/i, '')
        .trim();

    const reminderMessage = whatsLeft || 'Reminder!';

    const timezone = process.env.TIMEZONE ?? 'UTC';
    const now = getZonedParts(new Date(), timezone);
    const scheduledAt = getNextWeekday(now, weekday, time);

    const reminderId = await createReminder({
        message: reminderMessage,
        scheduledAt,
    });

    if (reminderId) {
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'https://cool-aide.vercel.app';
        await scheduleReminder({ reminderId, telegramChatId: chatId, scheduledAt, baseUrl });
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const pad = (n: number) => String(n).padStart(2, '0');

    return `Got it! I'll remind you on ${dayNames[weekday]} at ${pad(time.hour)}:${pad(time.minute)} (${timezone}) to "${reminderMessage}"`;
}

function buildBot() {
    if (!telegramToken || !geminiApiKey) {
        throw new Error('Missing TELEGRAM_BOT_TOKEN or GEMINI_API_KEY');
    }

    const bot = createBot(telegramToken);

    bot.command('start', async (ctx) => {
        await ctx.reply('Hi! I am your ADHD accountability bot. Send me a message and I\'ll check in with you.');
    });

    bot.on('message:text', async (ctx) => {
        const chatId = String(ctx.chat.id);
        const userMessage = ctx.message.text;

        if (!userMessage) return;

        const isReminder = /\bremind\b/i.test(userMessage);
        if (isReminder) {
            const reply = await handleReminderCommand(chatId, userMessage);
            await ctx.reply(reply);
            return;
        }

        const startTime = Date.now();

        const previousInteractionId = await getLastInteractionId(chatId);
        const result = await replyToMessage(geminiApiKey, userMessage, previousInteractionId);

        const elapsed = Date.now() - startTime;

        let reply: string;

        if (result.type === 'scheduleReminder') {
            const { message, scheduledAt } = result.args;
            const scheduledDate = new Date(scheduledAt);

            const reminderId = await createReminder({
                message,
                scheduledAt: scheduledDate,
            });

            if (reminderId) {
                const baseUrl = process.env.VERCEL_URL
                    ? `https://${process.env.VERCEL_URL}`
                    : 'https://cool-aide.vercel.app';
                await scheduleReminder({ reminderId, telegramChatId: chatId, scheduledAt: scheduledDate, baseUrl });
            }

            reply = 'Reminder set!';
        } else {
            reply = result.text;
        }

        await setLastInteractionId(chatId, result.interactionId);
        await appendChatHistory(chatId, [
            { role: 'user', parts: [{ text: userMessage }] },
            { role: 'model', parts: [{ text: reply }] },
        ]);

        if (shouldIncludeDebug(chatId)) {
            const callLines: Array<[string, string | number | boolean]> = [
                ['elapsed_ms', elapsed],
                ['interaction_id', result.interactionId],
            ];
            if (result.type === 'scheduleReminder') {
                callLines.push(['fn_calls', 'scheduleReminder']);
            }
            await ctx.reply(reply/* + buildDebugBlockquote(callLines)*/);
        } else {
            await ctx.reply(reply);
        }
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

export async function POST(request: NextRequest) {
    const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
    if (secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!telegramToken) {
        console.error('Missing TELEGRAM_BOT_TOKEN');
        return NextResponse.json({ ok: true });
    }

    try {
        const bot = await getBot();
        await bot.handleUpdate(await request.json());
    } catch (error) {
        console.error('Failed to handle Telegram update:', error);
    }

    return NextResponse.json({ ok: true });
}
