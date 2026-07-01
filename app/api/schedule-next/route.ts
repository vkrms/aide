import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';

import { scheduleReminder } from '@/lib/qstash';

/**
 * Intermediate chaining endpoint for reminders whose delay exceeds QStash's
 * 604 800 s (7 d) cap.  When fired, it recalculates the remaining delay and
 * re-invokes scheduleReminder, which either delivers directly or chains again.
 */
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

    const { reminderId, telegramChatId, scheduledAt } = body as {
        reminderId: string;
        telegramChatId: string;
        scheduledAt: string;
    };

    if (!reminderId || !telegramChatId || !scheduledAt) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : `http://localhost:${process.env.PORT ?? 9120}`;

    try {
        const messageId = await scheduleReminder({
            reminderId,
            telegramChatId,
            scheduledAt: new Date(scheduledAt),
            baseUrl,
        });

        return NextResponse.json({ ok: true, messageId });
    } catch (error) {
        console.error('Failed to chain reminder:', error);
        return NextResponse.json({ error: 'Failed to schedule next reminder' }, { status: 500 });
    }
}
