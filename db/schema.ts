import { json, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export type ChatMessage = { role: 'user' | 'model'; parts: Array<{ text: string }> };

export const deliveries = pgTable('deliveries', {
    id: uuid('id').defaultRandom().primaryKey(),
    message: text('message').notNull(),
    messageSource: text('message_source').notNull(),
    status: text('status').notNull(),
    telegramChatId: text('telegram_chat_id').notNull(),
    cronSchedule: text('cron_schedule'),
    errorMessage: text('error_message'),
    sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
});

export const chatSessions = pgTable('chat_sessions', {
    id: uuid('id').defaultRandom().primaryKey(),
    telegramChatId: text('telegram_chat_id').notNull().unique(),
    history: json('history').$type<ChatMessage[]>().notNull().default([]),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const reminders = pgTable('reminders', {
    id: uuid('id').defaultRandom().primaryKey(),
    telegramChatId: text('telegram_chat_id').notNull(),
    message: text('message').notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    qstashMessageId: text('qstash_message_id'),
    status: text('status', { enum: ['pending', 'sent', 'failed'] }).notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type NewDelivery = typeof deliveries.$inferInsert;
export type NewReminder = typeof reminders.$inferInsert;
