import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';

import { getReminderById, markReminderFailed, markReminderSent } from '@/db/reminders';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(request: NextRequest) {
    const receiver = new Receiver({
        currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? '',
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? '',
    });

    const body = await request.json();

    const isValid = await receiver
        .verify({
            signature: request.headers.get('upstash-signature') ?? '',
            body: JSON.stringify(body),
        })
        .catch(() => false);

    if (!isValid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reminderId, telegramChatId } = body as { reminderId: string; telegramChatId: string };
    if (!reminderId) {
        return NextResponse.json({ error: 'Missing reminderId' }, { status: 400 });
    }
    if (!telegramChatId) {
        return NextResponse.json({ error: 'Missing telegramChatId' }, { status: 400 });
    }

    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!telegramToken) {
        return NextResponse.json({ error: 'Missing TELEGRAM_BOT_TOKEN' }, { status: 500 });
    }

    const reminder = await getReminderById(reminderId);
    if (!reminder) {
        return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    try {
        await sendTelegramMessage({ token: telegramToken, chatId: telegramChatId, text: reminder.message });
        await markReminderSent(reminderId);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Failed to send reminder:', error);
        await markReminderFailed(reminderId);
        return NextResponse.json({ error: 'Failed to send reminder' }, { status: 500 });
    }
}
