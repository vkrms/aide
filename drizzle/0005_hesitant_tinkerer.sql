CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"person" boolean DEFAULT false NOT NULL,
	"interest" boolean DEFAULT false NOT NULL,
	"challenge" boolean DEFAULT false NOT NULL,
	"novelty" boolean DEFAULT false NOT NULL,
	"urgency" boolean DEFAULT false NOT NULL,
	"consequence" text,
	"next_step" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "task_id" uuid;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;