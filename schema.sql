


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."daily_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "log_date" "date" DEFAULT CURRENT_DATE,
    "study_minutes" integer DEFAULT 0,
    "tasks_completed" integer DEFAULT 0,
    "tasks_missed" integer DEFAULT 0,
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."daily_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "topic_id" integer,
    "subject" "text",
    "topic" "text",
    "duration_minutes" integer,
    "scheduled_date" "date",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "completed_at" timestamp without time zone,
    "time_spent" integer
);


ALTER TABLE "public"."daily_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."micro_topics" (
    "id" integer NOT NULL,
    "topic_name" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "target_exam" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "resource_url" "text",
    "ncert_reference" "text",
    "difficulty_level" integer
);


ALTER TABLE "public"."micro_topics" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."micro_topics_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."micro_topics_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."micro_topics_id_seq" OWNED BY "public"."micro_topics"."id";



CREATE TABLE IF NOT EXISTS "public"."prep_memory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "intent" "text",
    "session_state" "jsonb",
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."prep_memory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "phone_number" "text",
    "state" "text",
    "class_level" "text",
    "target_exam" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."repair_paths" (
    "id" integer NOT NULL,
    "user_id" "uuid",
    "weak_topic_id" integer,
    "repair_topic_id" integer,
    "reason" "text",
    "priority_score" double precision,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."repair_paths" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."repair_paths_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."repair_paths_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."repair_paths_id_seq" OWNED BY "public"."repair_paths"."id";



CREATE TABLE IF NOT EXISTS "public"."revision_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "topic_id" integer,
    "next_revision" "date",
    "interval_days" integer DEFAULT 3,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."revision_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_topic_progress" (
    "id" integer NOT NULL,
    "user_id" "uuid",
    "topic_id" integer,
    "mastery_level" integer DEFAULT 0,
    "accuracy" double precision DEFAULT 0,
    "attempts" integer DEFAULT 0,
    "last_practiced" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."student_topic_progress" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."student_topic_progress_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."student_topic_progress_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."student_topic_progress_id_seq" OWNED BY "public"."student_topic_progress"."id";



CREATE TABLE IF NOT EXISTS "public"."study_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "topic_id" integer,
    "event_type" "text",
    "duration_minutes" integer,
    "difficulty_rating" integer,
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "study_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['started'::"text", 'completed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."study_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."study_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "task_id" "uuid",
    "started_at" timestamp without time zone,
    "ended_at" timestamp without time zone,
    "duration_minutes" integer,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."study_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."topic_dependencies" (
    "id" integer NOT NULL,
    "topic_id" integer,
    "prerequisite_topic_id" integer,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."topic_dependencies" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."topic_dependencies_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."topic_dependencies_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."topic_dependencies_id_seq" OWNED BY "public"."topic_dependencies"."id";



CREATE TABLE IF NOT EXISTS "public"."topic_graph_rank" (
    "id" integer NOT NULL,
    "topic_id" integer,
    "dependency_count" integer DEFAULT 0,
    "unlock_count" integer DEFAULT 0,
    "graph_rank" double precision DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."topic_graph_rank" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."topic_graph_rank_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."topic_graph_rank_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."topic_graph_rank_id_seq" OWNED BY "public"."topic_graph_rank"."id";



CREATE TABLE IF NOT EXISTS "public"."topic_metadata" (
    "id" integer NOT NULL,
    "topic_id" integer,
    "weightage" integer,
    "difficulty" integer,
    "importance_score" integer,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."topic_metadata" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."topic_metadata_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."topic_metadata_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."topic_metadata_id_seq" OWNED BY "public"."topic_metadata"."id";



CREATE TABLE IF NOT EXISTS "public"."user_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "topic_id" integer,
    "is_mastered" boolean DEFAULT false,
    "last_studied_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_progress" OWNER TO "postgres";


ALTER TABLE ONLY "public"."micro_topics" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."micro_topics_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."repair_paths" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."repair_paths_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."student_topic_progress" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."student_topic_progress_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."topic_dependencies" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."topic_dependencies_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."topic_graph_rank" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."topic_graph_rank_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."topic_metadata" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."topic_metadata_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."daily_logs"
    ADD CONSTRAINT "daily_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_tasks"
    ADD CONSTRAINT "daily_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."micro_topics"
    ADD CONSTRAINT "micro_topics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."micro_topics"
    ADD CONSTRAINT "micro_topics_topic_name_target_exam_key" UNIQUE ("topic_name", "target_exam");



ALTER TABLE ONLY "public"."prep_memory"
    ADD CONSTRAINT "prep_memory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prep_memory"
    ADD CONSTRAINT "prep_memory_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repair_paths"
    ADD CONSTRAINT "repair_paths_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."revision_queue"
    ADD CONSTRAINT "revision_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_topic_progress"
    ADD CONSTRAINT "student_topic_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_topic_progress"
    ADD CONSTRAINT "student_topic_progress_user_id_topic_id_key" UNIQUE ("user_id", "topic_id");



ALTER TABLE ONLY "public"."study_events"
    ADD CONSTRAINT "study_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."study_sessions"
    ADD CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topic_dependencies"
    ADD CONSTRAINT "topic_dependencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topic_dependencies"
    ADD CONSTRAINT "topic_dependencies_topic_id_prerequisite_topic_id_key" UNIQUE ("topic_id", "prerequisite_topic_id");



ALTER TABLE ONLY "public"."topic_graph_rank"
    ADD CONSTRAINT "topic_graph_rank_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topic_graph_rank"
    ADD CONSTRAINT "topic_graph_rank_topic_id_key" UNIQUE ("topic_id");



ALTER TABLE ONLY "public"."topic_metadata"
    ADD CONSTRAINT "topic_metadata_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topic_metadata"
    ADD CONSTRAINT "topic_metadata_topic_id_key" UNIQUE ("topic_id");



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "unique_user_topic" UNIQUE ("user_id", "topic_id");



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_logs"
    ADD CONSTRAINT "daily_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_tasks"
    ADD CONSTRAINT "daily_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prep_memory"
    ADD CONSTRAINT "prep_memory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."repair_paths"
    ADD CONSTRAINT "repair_paths_repair_topic_id_fkey" FOREIGN KEY ("repair_topic_id") REFERENCES "public"."micro_topics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."repair_paths"
    ADD CONSTRAINT "repair_paths_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."repair_paths"
    ADD CONSTRAINT "repair_paths_weak_topic_id_fkey" FOREIGN KEY ("weak_topic_id") REFERENCES "public"."micro_topics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."revision_queue"
    ADD CONSTRAINT "revision_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_topic_progress"
    ADD CONSTRAINT "student_topic_progress_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."micro_topics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_topic_progress"
    ADD CONSTRAINT "student_topic_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."study_events"
    ADD CONSTRAINT "study_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."study_sessions"
    ADD CONSTRAINT "study_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_dependencies"
    ADD CONSTRAINT "topic_dependencies_prerequisite_topic_id_fkey" FOREIGN KEY ("prerequisite_topic_id") REFERENCES "public"."micro_topics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_dependencies"
    ADD CONSTRAINT "topic_dependencies_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."micro_topics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_graph_rank"
    ADD CONSTRAINT "topic_graph_rank_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."micro_topics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_metadata"
    ADD CONSTRAINT "topic_metadata_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."micro_topics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Service role full access to profiles" ON "public"."profiles" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to user_progress" ON "public"."user_progress" USING (true) WITH CHECK (true);



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can manage their own progress" ON "public"."user_progress" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."daily_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."micro_topics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prep_memory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."repair_paths" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."revision_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_topic_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."study_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."study_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."topic_dependencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."topic_graph_rank" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."topic_metadata" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_progress" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";


















GRANT ALL ON TABLE "public"."daily_logs" TO "anon";
GRANT ALL ON TABLE "public"."daily_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_logs" TO "service_role";



GRANT ALL ON TABLE "public"."daily_tasks" TO "anon";
GRANT ALL ON TABLE "public"."daily_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."micro_topics" TO "anon";
GRANT ALL ON TABLE "public"."micro_topics" TO "authenticated";
GRANT ALL ON TABLE "public"."micro_topics" TO "service_role";



GRANT ALL ON SEQUENCE "public"."micro_topics_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."micro_topics_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."micro_topics_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."prep_memory" TO "anon";
GRANT ALL ON TABLE "public"."prep_memory" TO "authenticated";
GRANT ALL ON TABLE "public"."prep_memory" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."repair_paths" TO "anon";
GRANT ALL ON TABLE "public"."repair_paths" TO "authenticated";
GRANT ALL ON TABLE "public"."repair_paths" TO "service_role";



GRANT ALL ON SEQUENCE "public"."repair_paths_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."repair_paths_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."repair_paths_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."revision_queue" TO "anon";
GRANT ALL ON TABLE "public"."revision_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."revision_queue" TO "service_role";



GRANT ALL ON TABLE "public"."student_topic_progress" TO "anon";
GRANT ALL ON TABLE "public"."student_topic_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."student_topic_progress" TO "service_role";



GRANT ALL ON SEQUENCE "public"."student_topic_progress_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."student_topic_progress_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."student_topic_progress_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."study_events" TO "anon";
GRANT ALL ON TABLE "public"."study_events" TO "authenticated";
GRANT ALL ON TABLE "public"."study_events" TO "service_role";



GRANT ALL ON TABLE "public"."study_sessions" TO "anon";
GRANT ALL ON TABLE "public"."study_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."study_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."topic_dependencies" TO "anon";
GRANT ALL ON TABLE "public"."topic_dependencies" TO "authenticated";
GRANT ALL ON TABLE "public"."topic_dependencies" TO "service_role";



GRANT ALL ON SEQUENCE "public"."topic_dependencies_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."topic_dependencies_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."topic_dependencies_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."topic_graph_rank" TO "anon";
GRANT ALL ON TABLE "public"."topic_graph_rank" TO "authenticated";
GRANT ALL ON TABLE "public"."topic_graph_rank" TO "service_role";



GRANT ALL ON SEQUENCE "public"."topic_graph_rank_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."topic_graph_rank_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."topic_graph_rank_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."topic_metadata" TO "anon";
GRANT ALL ON TABLE "public"."topic_metadata" TO "authenticated";
GRANT ALL ON TABLE "public"."topic_metadata" TO "service_role";



GRANT ALL ON SEQUENCE "public"."topic_metadata_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."topic_metadata_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."topic_metadata_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_progress" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































