import { AppError } from "@/lib/server/errors";
import { searchRequestSchema, firstIssueMessage } from "@/lib/schemas";
import { searchPapers } from "@/lib/providers";
import { apiJson, handleApiError, searchParamsFrom } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const params = searchParamsFrom(request);
    const parsed = searchRequestSchema.safeParse({
      q: params.get("q") ?? "",
      offset: params.get("offset") ?? 0,
      mode: params.get("mode") ?? undefined,
    });
    if (!parsed.success) {
      throw new AppError("INVALID_INPUT", firstIssueMessage(parsed.error));
    }
    const result = await searchPapers(
      parsed.data.q,
      parsed.data.offset,
      parsed.data.mode,
    );
    return apiJson(result);
  } catch (error) {
    return handleApiError(error);
  }
}
