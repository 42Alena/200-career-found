import { BackgroundIntakeInputSchema } from "@/lib/contracts";
import { parseJsonRequest } from "@/lib/api";
import { extractProfileFromBackground } from "@/lib/ai";
import { buildBackgroundSnapshot, buildFallbackProfile } from "@/lib/career-engine";
import { scrapeBackgroundProfiles } from "@/lib/firecrawl";
import { updateWorkspace } from "@/lib/workspace-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await parseJsonRequest(request, BackgroundIntakeInputSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const scrapedSources = await scrapeBackgroundProfiles({
    linkedinUrl: parsed.data.linkedinUrl,
    githubUrl: parsed.data.githubUrl,
  });

  const background = buildBackgroundSnapshot(parsed.data, scrapedSources);

  await updateWorkspace(parsed.data.workspaceId, (current) => ({
    ...current,
    currentStep: "profile",
    background,
  }));

  const fallbackProfile = buildFallbackProfile({
    cvText: background.cvText,
    scrapedSources,
  });

  const workspaceWithFallbackProfile = await updateWorkspace(
    parsed.data.workspaceId,
    (current) => ({
      ...current,
      profile: {
        ...fallbackProfile,
        weeklyHours: current.profile?.weeklyHours ?? 8,
      },
    }),
  );

  const aiProfile = await extractProfileFromBackground({
    cvText: background.cvText,
    scrapedSources,
  });

  if (!aiProfile) {
    return Response.json({
      workspace: workspaceWithFallbackProfile,
      profile: workspaceWithFallbackProfile.profile,
    });
  }

  const finalWorkspace = await updateWorkspace(
    parsed.data.workspaceId,
    (current) => ({
      ...current,
      profile: {
        ...aiProfile,
        weeklyHours: current.profile?.weeklyHours ?? 8,
      },
    }),
  );

  return Response.json({
    workspace: finalWorkspace,
    profile: finalWorkspace.profile,
  });
}
