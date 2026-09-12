import { InferCandidateRolesRequestSchema } from "@/lib/contracts";
import { badRequest, parseJsonRequest } from "@/lib/api";
import { buildCandidateCorpus, rankRoleSeeds } from "@/lib/career-engine";
import { getWorkspace, updateWorkspace } from "@/lib/workspace-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await parseJsonRequest(
    request,
    InferCandidateRolesRequestSchema,
  );

  if (!parsed.success) {
    return parsed.response;
  }

  const workspace = await getWorkspace(parsed.data.workspaceId);

  if (!workspace.profile || !workspace.assessment) {
    return badRequest("Complete profile and assessment before inferring roles");
  }

  const corpus = buildCandidateCorpus({
    profile: workspace.profile,
    background: workspace.background,
    answers: workspace.assessment.answers,
  });
  const candidateRoleTitles = rankRoleSeeds(corpus)
    .slice(0, 3)
    .map((entry) => entry.role.title);

  const finalWorkspace = await updateWorkspace(
    parsed.data.workspaceId,
    (current) => ({
      ...current,
      candidateRoleTitles,
    }),
  );

  return Response.json({
    candidateRoleTitles,
    workspace: finalWorkspace,
  });
}
