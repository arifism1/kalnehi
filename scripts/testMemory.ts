import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

console.log("Starting preparation memory test...");

// Explicitly load .env.local so the script behaves like the Next.js app
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Make sure they are set in .env.local or your shell before running this script."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

async function runTest() {
  const { data, error } = await supabase
    .from("user_topic_progress")
    .insert({
      user_id: "11111111-1111-1111-1111-111111111111",
      topic_id: 1,
      status: "studying",
      mastery_score: 0.6,
      questions_attempted: 20,
      accuracy: 0.75,
    })
    .select();

  if (error) {
    console.error("Error inserting:", error);
    return;
  }

  console.log("Inserted row:", data);
}

runTest().catch((err) => {
  console.error("Unexpected error in testMemory:", err);
  process.exit(1);
});