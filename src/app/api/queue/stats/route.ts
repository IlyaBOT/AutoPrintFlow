import { jsonSuccess } from "@/lib/http";
import { getQueueStatsFromDb } from "@/lib/queue-data";

export async function GET() {
  const stats = await getQueueStatsFromDb();
  return jsonSuccess(stats);
}
