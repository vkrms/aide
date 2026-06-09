import { NextRequest, NextResponse } from 'next/server';
import { getProjects, createProject } from '@/lib/data';
import { sendTelegramMessage } from '@/lib/telegram';

const telegramToken = process.env.TELEGRAM_BOT_TOKEN;

export async function GET() {
    try {
        const projects = await getProjects();
        return NextResponse.json(projects);
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const project = await createProject(body);

        if (telegramToken && body.telegramChatId) {
            sendTelegramMessage({
                token: telegramToken,
                chatId: body.telegramChatId,
                text: `📋 *New project created:* ${body.name}`,
            }).catch(() => {});
        }

        return NextResponse.json(project, { status: 201 });
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
