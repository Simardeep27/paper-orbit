import { AppError } from "@/lib/server/errors";
import { resolveRequestSchema, firstIssueMessage } from "@/lib/schemas";
import { resolvePaper } from "@/lib/providers";
import { apiJson, handleApiError, searchParamsFrom } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const params = searchParamsFrom(request);
    const parsed = resolveRequestSchema.safeParse({
      id: params.get("id") ?? "",
      mode: params.get("mode") ?? undefined,
    });
    if (!parsed.success) {
      throw new AppError("INVALID_INPUT", firstIssueMessage(parsed.error));
    }
    const result = await resolvePaper(parsed.data.id, parsed.data.mode);
    return apiJson(result);
  } catch (error) {
    return handleApiError(error);
  }
}
