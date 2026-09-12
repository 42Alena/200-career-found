import { GenerateRecommendationsRequestSchema } from "@/lib/contracts";
import { badRequest, parseJsonRequest } from "@/lib/api";
import { buildCandidateCorpus, generateRecommendations } from "@/lib/career-engine";
import { generateRecommendationsWithAi } from "@/lib/ai";
import { updateWorkspace } from "@/lib/workspace-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await parseJsonRequest(
    request,
    GenerateRecommendationsRequestSchema,
  );

  if (!parsed.success) {
    return parsed.response;
  }

  let generated = null;
  const workspace = await updateWorkspace(parsed.data.workspaceId, (current) => {
    if (!current.assessment) {
      return current;
    }

    const corpus = buildCandidateCorpus({
      profile: current.profile,
      background: current.background,
      answers: current.assessment.answers,
    });

    generated = generateRecommendations(
      corpus,
      current.jobDescriptions,
      current.candidateRoleTitles,
    );

    return {
      ...current,
      currentStep: "roles",
      recommendations: generated,
      selectedRoleId: generated[0]?.id,
    };
  });

  if (!workspace.assessment || !generated) {
    return badRequest("Submit an assessment before generating recommendations");
  }

  const aiRecommendations = await generateRecommendationsWithAi({
    profile: workspace.profile ?? {
      name: "",
      currentRole: "",
      targetLocation: "Remote",
      weeklyHours: 8,
      background: "",
      goal: "",
    },
    background: workspace.background,
    assessment: workspace.assessment,
    jobDescriptions: workspace.jobDescriptions,
    fallbackRecommendations: generated,
  });

  if (!aiRecommendations) {
    return Response.json({ recommendations: generated, workspace });
  }

  const nextWorkspace = await updateWorkspace(
    parsed.data.workspaceId,
    (current) => ({
      ...current,
      recommendations: aiRecommendations,
      selectedRoleId: aiRecommendations[0]?.id,
    }),
  );

  return Response.json({
    recommendations: aiRecommendations,
    workspace: nextWorkspace,
  });
}
