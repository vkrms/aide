import { and, eq } from 'drizzle-orm';

import { getDb } from './client.js';
import { projects, reminders, type NewProject } from './schema.js';

export async function createProject(input: NewProject): Promise<string | null> {
    const db = getDb();
    if (!db) return null;

    const [row] = await db.insert(projects).values(input).returning({ id: projects.id });
    return row?.id ?? null;
}

export async function getProjectById(id: string) {
    const db = getDb();
    if (!db) return null;

    const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return row ?? null;
}

export async function getProjectsByChatId(telegramChatId: string) {
    const db = getDb();
    if (!db) return [];

    return db.select().from(projects).where(eq(projects.telegramChatId, telegramChatId)).orderBy(projects.createdAt);
}

export async function updateProject(
    id: string,
    telegramChatId: string,
    updates: Partial<Pick<NewProject, 'name' | 'description'>>,
) {
    const db = getDb();
    if (!db) return null;

    const [row] = await db
        .update(projects)
        .set(updates)
        .where(and(eq(projects.id, id), eq(projects.telegramChatId, telegramChatId)))
        .returning();
    return row ?? null;
}

export async function deleteProject(id: string, telegramChatId: string): Promise<boolean> {
    const db = getDb();
    if (!db) return false;

    const result = await db
        .delete(projects)
        .where(and(eq(projects.id, id), eq(projects.telegramChatId, telegramChatId)));
    return result.rowCount > 0;
}

export async function getProjectReminders(projectId: string, telegramChatId: string) {
    const db = getDb();
    if (!db) return [];

    return db
        .select()
        .from(reminders)
        .where(and(eq(reminders.projectId, projectId), eq(reminders.telegramChatId, telegramChatId)))
        .orderBy(reminders.scheduledAt);
}
