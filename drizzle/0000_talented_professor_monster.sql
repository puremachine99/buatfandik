CREATE TYPE "public"."status" AS ENUM('PENDING', 'SENT', 'FAILED');--> statement-breakpoint
CREATE TABLE "broadcast_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debitur_id" uuid NOT NULL,
	"status" "status" DEFAULT 'PENDING' NOT NULL,
	"pesan" text NOT NULL,
	"error_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "debiturs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"no_debitur" varchar(255) NOT NULL,
	"nama" varchar(255) NOT NULL,
	"agunan" text,
	"so_pokok" numeric NOT NULL,
	"tgk" numeric NOT NULL,
	"no_whatsapp" varchar(25) NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "debiturs_no_debitur_unique" UNIQUE("no_debitur")
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purpose" varchar(255) NOT NULL,
	"template" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "message_templates_purpose_unique" UNIQUE("purpose")
);
--> statement-breakpoint
ALTER TABLE "broadcast_logs" ADD CONSTRAINT "broadcast_logs_debitur_id_debiturs_id_fk" FOREIGN KEY ("debitur_id") REFERENCES "public"."debiturs"("id") ON DELETE cascade ON UPDATE no action;