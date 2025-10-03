import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
console.log("MONGODB_URI:", process.env.MONGODB_URI);
import cron from "node-cron";
import { precomputeTopCommentsAndReplies } from "@/workers/precomputeTopComments";
async function runImmediately() {
  await precomputeTopCommentsAndReplies();
  console.log("✅ Precompute done on startup");
}

// Run once immediately
runImmediately();

// Then schedule every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  console.log("Running precompute worker...");
  await precomputeTopCommentsAndReplies();
});
