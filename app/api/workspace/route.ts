import { WorkspaceSchema } from "@/lib/contracts";
import { badRequest, parseJsonRequest } from "@/lib/api";
import { getWorkspace, saveWorkspace } from "@/lib/workspace-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");

  if (!workspaceId) {
    return badRequest("workspaceId is required");
  }

  const workspace = await getWorkspace(workspaceId);
  return Response.json({ workspace });
}

export async function PUT(request: Request) {
  const parsed = await parseJsonRequest(request, WorkspaceSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const workspace = await saveWorkspace(parsed.data);
  return Response.json({ workspace });
}
