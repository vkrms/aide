import { NextRequest, NextResponse } from 'next/server';
import { getReminders, createReminder, getProject } from '@/lib/data';
import { sendTelegramMessage } from '@/lib/telegram';

const telegramToken = process.env.TELEGRAM_BOT_TOKEN;

export async function GET() {
    try {
        const reminders = await getReminders();
        return NextResponse.json(reminders);
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const reminder = await createReminder(body);

        if (telegramToken && body.projectId) {
            const project = await getProject(body.projectId);
            if (project) {
                const scheduled = new Date(body.scheduledAt).toLocaleString();
                sendTelegramMessage({
                    token: telegramToken,
                    chatId: project.telegramChatId,
                    text: `⏰ *New reminder set:*\n${body.message}\n_${scheduled}_`,
                }).catch(() => {});
            }
        }

        return NextResponse.json(reminder, { status: 201 });
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
