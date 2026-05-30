import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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

export type NewDelivery = typeof deliveries.$inferInsert;
