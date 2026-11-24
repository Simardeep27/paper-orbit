import { AppError } from "@/lib/server/errors";
import { neighborhoodRequestSchema, firstIssueMessage } from "@/lib/schemas";
import { getNeighborhood } from "@/lib/providers";
import { apiJson, handleApiError, searchParamsFrom } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const params = searchParamsFrom(request);
    const parsed = neighborhoodRequestSchema.safeParse({
      paperId: params.get("paperId") ?? "",
      mode: params.get("mode") ?? undefined,
    });
    if (!parsed.success) {
      throw new AppError("INVALID_INPUT", firstIssueMessage(parsed.error));
    }
    const neighborhood = await getNeighborhood(
      parsed.data.paperId,
      parsed.data.mode,
    );
    return apiJson(neighborhood);
  } catch (error) {
    return handleApiError(error);
  }
}
