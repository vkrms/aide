ALTER TABLE "chat_sessions" ADD COLUMN "last_interaction_id" text;--> statement-breakpoint
ALTER TABLE "reminders" DROP COLUMN "telegram_chat_id";