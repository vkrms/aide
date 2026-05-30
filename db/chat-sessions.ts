import { eq } from 'drizzle-orm';

import { getDb } from './client.js';
import { chatSessions, type ChatMessage } from './schema.js';

const MAX_HISTORY_MESSAGES = 40;

export async function getChatHistory(telegramChatId: string): Promise<ChatMessage[]> {
    const db = getDb();
    if (!db) return [];

    const [session] = await db
        .select({ history: chatSessions.history })
        .from(chatSessions)
        .where(eq(chatSessions.telegramChatId, telegramChatId))
        .limit(1);

    return session?.history ?? [];
}

export async function appendChatHistory(telegramChatId: string, messages: ChatMessage[]): Promise<void> {
    const db = getDb();
    if (!db) return;

    const existing = await getChatHistory(telegramChatId);
    const updated = [...existing, ...messages].slice(-MAX_HISTORY_MESSAGES);

    await db
        .insert(chatSessions)
        .values({ telegramChatId, history: updated })
        .onConflictDoUpdate({
            target: chatSessions.telegramChatId,
            set: { history: updated, updatedAt: new Date() },
        });
}
