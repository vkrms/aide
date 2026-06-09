import { NextRequest, NextResponse } from 'next/server';
import { getReminders, createReminder } from '@/lib/data';

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
        return NextResponse.json(reminder, { status: 201 });
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
