import { eq } from 'drizzle-orm';

import { getDb } from './client.js';
import { reminders, type NewReminder } from './schema.js';

export async function createReminder(input: NewReminder): Promise<string | null> {
    const db = getDb();
    if (!db) return null;

    const [row] = await db.insert(reminders).values(input).returning({ id: reminders.id });
    return row?.id ?? null;
}

export async function getReminderById(id: string) {
    const db = getDb();
    if (!db) return null;

    const [row] = await db.select().from(reminders).where(eq(reminders.id, id)).limit(1);
    return row ?? null;
}

export async function markReminderSent(id: string): Promise<void> {
    const db = getDb();
    if (!db) return;

    await db.update(reminders).set({ status: 'sent' }).where(eq(reminders.id, id));
}

export async function markReminderFailed(id: string): Promise<void> {
    const db = getDb();
    if (!db) return;

    await db.update(reminders).set({ status: 'failed' }).where(eq(reminders.id, id));
}
