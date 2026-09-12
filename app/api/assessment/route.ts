import { AssessmentInputSchema } from "@/lib/contracts";
import { parseJsonRequest } from "@/lib/api";
import { buildAssessmentSnapshot } from "@/lib/career-engine";
import { updateWorkspace } from "@/lib/workspace-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await parseJsonRequest(request, AssessmentInputSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const assessment = buildAssessmentSnapshot(parsed.data);
  const workspace = await updateWorkspace(parsed.data.workspaceId, (current) => ({
    ...current,
    currentStep: "roles",
    assessment,
  }));

  return Response.json({ assessment, workspace });
}
