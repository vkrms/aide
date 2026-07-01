import { NextRequest, NextResponse } from 'next/server';
import { getTasks, createTask } from '@/lib/data';
import { sendTelegramMessage } from '@/lib/telegram';

const telegramToken = process.env.TELEGRAM_BOT_TOKEN;

export async function GET() {
    try {
        const tasks = await getTasks();
        return NextResponse.json(tasks);
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const task = await createTask(body);

        const telegramChatId = process.env.TELEGRAM_CHAT_ID;
        if (telegramToken && telegramChatId) {
            sendTelegramMessage({
                token: telegramToken,
                chatId: telegramChatId,
                text: `*New task:* ${body.title}`,
            }).catch(() => { });
        }

        return NextResponse.json(task, { status: 201 });
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
