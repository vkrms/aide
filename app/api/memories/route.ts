import { NextRequest, NextResponse } from 'next/server';
import { getAllMemories, createMemory } from '@/lib/data';

export async function GET() {
    try {
        const memories = await getAllMemories();
        return NextResponse.json(memories);
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { telegramChatId, content } = await req.json();
        if (!telegramChatId || !content) {
            return NextResponse.json({ error: 'telegramChatId and content are required' }, { status: 400 });
        }
        const memory = await createMemory(telegramChatId, content);
        return NextResponse.json(memory, { status: 201 });
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
