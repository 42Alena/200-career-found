import { GenerateLearningPlanRequestSchema } from "@/lib/contracts";
import { badRequest, parseJsonRequest } from "@/lib/api";
import { buildLearningPlan } from "@/lib/career-engine";
import { generateLearningPlanWithAi } from "@/lib/ai";
import { updateWorkspace } from "@/lib/workspace-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await parseJsonRequest(
    request,
    GenerateLearningPlanRequestSchema,
  );

  if (!parsed.success) {
    return parsed.response;
  }

  let fallbackPlan = null;
  const workspace = await updateWorkspace(parsed.data.workspaceId, (current) => {
    const recommendation = current.recommendations.find(
      (item) => item.id === parsed.data.selectedRoleId,
    );

    if (!recommendation) {
      return current;
    }

    fallbackPlan = buildLearningPlan(
      parsed.data.workspaceId,
      recommendation,
      current.skillRatings,
      current.profile?.weeklyHours ?? 8,
    );

    return {
      ...current,
      currentStep: "plan",
      selectedRoleId: parsed.data.selectedRoleId,
      learningPlan: fallbackPlan,
    };
  });

  const selectedRecommendation = workspace.recommendations.find(
    (item) => item.id === parsed.data.selectedRoleId,
  );

  if (!selectedRecommendation || !fallbackPlan) {
    return badRequest("Select a recommended role before generating a plan");
  }

  const aiPlan = await generateLearningPlanWithAi({
    workspaceId: parsed.data.workspaceId,
    recommendation: selectedRecommendation,
    ratings: workspace.skillRatings,
    weeklyHours: workspace.profile?.weeklyHours ?? 8,
    fallbackPlan,
  });

  if (!aiPlan) {
    return Response.json({ learningPlan: fallbackPlan, workspace });
  }

  const nextWorkspace = await updateWorkspace(
    parsed.data.workspaceId,
    (current) => ({
      ...current,
      currentStep: "plan",
      learningPlan: aiPlan,
    }),
  );

  return Response.json({ learningPlan: aiPlan, workspace: nextWorkspace });
}
