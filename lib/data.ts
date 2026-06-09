import { getDb } from '@/db/client';
import { projects, reminders, memories, NewProject, NewReminder, NewMemory } from '@/db/schema';
import { eq, and, ilike } from 'drizzle-orm';

// ─── Projects ──────────────────────────────────────────────────────────────

export async function getProjects() {
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    return db.select().from(projects).orderBy(projects.createdAt);
}

export async function getProject(id: string) {
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project ?? null;
}

export async function createProject(data: NewProject) {
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    const [project] = await db.insert(projects).values(data).returning();
    return project;
}

export async function updateProject(id: string, data: Partial<NewProject>) {
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    const [project] = await db
        .update(projects)
        .set(data)
        .where(eq(projects.id, id))
        .returning();
    return project ?? null;
}

export async function deleteProject(id: string) {
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    await db.delete(projects).where(eq(projects.id, id));
}

// ─── Reminders ─────────────────────────────────────────────────────────────

export async function getReminders() {
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    return db
        .select({
            id: reminders.id,
            message: reminders.message,
            scheduledAt: reminders.scheduledAt,
            status: reminders.status,
            projectId: reminders.projectId,
            projectName: projects.name,
            qstashMessageId: reminders.qstashMessageId,
            createdAt: reminders.createdAt,
        })
        .from(reminders)
        .leftJoin(projects, eq(reminders.projectId, projects.id))
        .orderBy(reminders.scheduledAt);
}

export async function getReminder(id: string) {
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    const [reminder] = await db.select().from(reminders).where(eq(reminders.id, id));
    return reminder ?? null;
}

export async function createReminder(data: NewReminder) {
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    const [reminder] = await db.insert(reminders).values(data).returning();
    return reminder;
}

export async function updateReminder(id: string, data: Partial<NewReminder>) {
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    const [reminder] = await db
        .update(reminders)
        .set(data)
        .where(eq(reminders.id, id))
        .returning();
    return reminder ?? null;
}

export async function deleteReminder(id: string) {
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    await db.delete(reminders).where(eq(reminders.id, id));
}

// ─── Memories ──────────────────────────────────────────────────────────────

export async function getMemoriesByChatId(telegramChatId: string, query?: string) {
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    const conditions = [eq(memories.telegramChatId, telegramChatId)];
    if (query) {
        conditions.push(ilike(memories.content, `%${query}%`));
    }
    return db
        .select()
        .from(memories)
        .where(and(...conditions))
        .orderBy(memories.createdAt);
}

export async function getAllMemories() {
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    return db.select().from(memories).orderBy(memories.createdAt);
}

export async function createMemory(telegramChatId: string, content: string) {
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    const [memory] = await db
        .insert(memories)
        .values({ telegramChatId, content })
        .returning();
    return memory;
}

export async function deleteMemory(id: string) {
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    await db.delete(memories).where(eq(memories.id, id));
}
