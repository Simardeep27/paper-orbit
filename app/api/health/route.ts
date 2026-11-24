import { getHealth } from "@/lib/providers";
import { apiJson, handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await getHealth();
    return apiJson(health);
  } catch (error) {
    return handleApiError(error);
  }
}
