import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Receiver } from '@upstash/qstash';

import { getReminderById, markReminderFailed, markReminderSent } from '../db/reminders.js';
import { sendTelegramMessage } from '../lib/telegram.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    // Verify the request is genuinely from QStash
    const receiver = new Receiver({
        currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? '',
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? '',
    });

    const isValid = await receiver.verify({
        signature: request.headers['upstash-signature'] as string,
        body: JSON.stringify(request.body),
    }).catch(() => false);

    if (!isValid) {
        return response.status(401).json({ error: 'Unauthorized' });
    }

    const { reminderId } = request.body as { reminderId: string };
    if (!reminderId) {
        return response.status(400).json({ error: 'Missing reminderId' });
    }

    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!telegramToken) {
        return response.status(500).json({ error: 'Missing TELEGRAM_BOT_TOKEN' });
    }

    const reminder = await getReminderById(reminderId);
    if (!reminder) {
        return response.status(404).json({ error: 'Reminder not found' });
    }

    try {
        await sendTelegramMessage({ token: telegramToken, chatId: reminder.telegramChatId, text: reminder.message });
        await markReminderSent(reminderId);
        return response.status(200).json({ ok: true });
    } catch (error) {
        console.error('Failed to send reminder:', error);
        await markReminderFailed(reminderId);
        return response.status(500).json({ error: 'Failed to send reminder' });
    }
}
