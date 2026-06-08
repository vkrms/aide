import { eq } from 'drizzle-orm';

import { getDb } from './client';
import { chatSessions, type ChatMessage } from './schema';

const MAX_HISTORY_MESSAGES = 40;

export async function getLastInteractionId(telegramChatId: string): Promise<string | null> {
    const db = getDb();
    if (!db) return null;

    const [session] = await db
        .select({ lastInteractionId: chatSessions.lastInteractionId })
        .from(chatSessions)
        .where(eq(chatSessions.telegramChatId, telegramChatId))
        .limit(1);

    return session?.lastInteractionId ?? null;
}

export async function setLastInteractionId(telegramChatId: string, interactionId: string): Promise<void> {
    const db = getDb();
    if (!db) return;

    await db
        .insert(chatSessions)
        .values({ telegramChatId, lastInteractionId: interactionId })
        .onConflictDoUpdate({
            target: chatSessions.telegramChatId,
            set: { lastInteractionId: interactionId, updatedAt: new Date() },
        });
}

export async function appendChatHistory(telegramChatId: string, messages: ChatMessage[]): Promise<void> {
    const db = getDb();
    if (!db) return;

    const [session] = await db
        .select({ history: chatSessions.history })
        .from(chatSessions)
        .where(eq(chatSessions.telegramChatId, telegramChatId))
        .limit(1);

    const updated = [...(session?.history ?? []), ...messages].slice(-MAX_HISTORY_MESSAGES);

    await db
        .insert(chatSessions)
        .values({ telegramChatId, history: updated })
        .onConflictDoUpdate({
            target: chatSessions.telegramChatId,
            set: { history: updated, updatedAt: new Date() },
        });
}
