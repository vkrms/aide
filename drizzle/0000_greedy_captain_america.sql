CREATE TABLE "deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message" text NOT NULL,
	"message_source" text NOT NULL,
	"status" text NOT NULL,
	"telegram_chat_id" text NOT NULL,
	"cron_schedule" text,
	"error_message" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
