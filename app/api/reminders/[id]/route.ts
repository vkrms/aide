import { NextRequest, NextResponse } from 'next/server';
import { getReminder, updateReminder, deleteReminder } from '@/lib/data';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const reminder = await getReminder(id);
        if (!reminder) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(reminder);
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const reminder = await updateReminder(id, body);
        if (!reminder) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(reminder);
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await deleteReminder(id);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
