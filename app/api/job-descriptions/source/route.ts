import { SourceJobDescriptionsRequestSchema } from "@/lib/contracts";
import { parseJsonRequest } from "@/lib/api";
import { sourceJobDescriptions } from "@/lib/firecrawl";
import { updateWorkspace } from "@/lib/workspace-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await parseJsonRequest(
    request,
    SourceJobDescriptionsRequestSchema,
  );

  if (!parsed.success) {
    return parsed.response;
  }

  const jobDescriptions = await sourceJobDescriptions({
    roleTitles: parsed.data.roleTitles,
    location: parsed.data.location,
  });
  const workspace = await updateWorkspace(parsed.data.workspaceId, (current) => ({
    ...current,
    jobDescriptions,
  }));

  return Response.json({ jobDescriptions, workspace });
}
