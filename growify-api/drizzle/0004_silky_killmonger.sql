CREATE TYPE "public"."question_type" AS ENUM('rating', 'number');--> statement-breakpoint
CREATE TYPE "public"."scored_by" AS ENUM('self', 'reviewer');--> statement-breakpoint
ALTER TABLE "scores" DROP CONSTRAINT "scores_membership_question_period_unique";--> statement-breakpoint
ALTER TABLE "scores" DROP CONSTRAINT "scores_value_range";--> statement-breakpoint
ALTER TABLE "scores" ALTER COLUMN "value" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "type" "question_type" DEFAULT 'rating' NOT NULL;--> statement-breakpoint
ALTER TABLE "scores" ADD COLUMN "scored_by" "scored_by" DEFAULT 'reviewer' NOT NULL;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_membership_question_period_scoredby_unique" UNIQUE("membership_id","question_id","period","scored_by");