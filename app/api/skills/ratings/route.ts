import { SaveSkillRatingsRequestSchema } from "@/lib/contracts";
import { parseJsonRequest } from "@/lib/api";
import { updateWorkspace } from "@/lib/workspace-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await parseJsonRequest(request, SaveSkillRatingsRequestSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const workspace = await updateWorkspace(parsed.data.workspaceId, (current) => ({
    ...current,
    currentStep: "skills",
    selectedRoleId: parsed.data.selectedRoleId,
    skillRatings: parsed.data.ratings,
  }));

  return Response.json({ workspace, ratings: workspace.skillRatings });
}
