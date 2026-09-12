import type { ScrapedProfileSource } from "@/lib/contracts";
import { env } from "@/lib/env";
import {
  defaultRoleTitles,
  getRoleSeed,
  preparedJobDescriptionsForRole,
} from "@/lib/fixtures";

const firecrawlScrapeEndpoint = "https://api.firecrawl.dev/v2/scrape";

export async function sourceJobDescriptions(input: {
  roleTitles?: string[];
  location?: string;
}) {
  const requestedRoles = (input.roleTitles ?? [])
    .map(getRoleSeed)
    .filter(
      (role): role is NonNullable<ReturnType<typeof getRoleSeed>> => Boolean(role),
    );
  const supportedRoles = defaultRoleTitles.map((title) => getRoleSeed(title)!);
  const roles = [...requestedRoles, ...supportedRoles]
    .filter(
      (role, index, candidates) =>
        candidates.findIndex((candidate) => candidate.title === role.title) ===
        index,
    )
    .slice(0, 3);

  return roles.flatMap((role) =>
    preparedJobDescriptionsForRole(role.title, input.location),
  );
}

export async function scrapeProfileUrl(
  url: string,
  kind: "linkedin" | "github",
): Promise<ScrapedProfileSource> {
  const now = new Date().toISOString();

  if (!url || !env.FIRECRAWL_API_KEY) {
    return { url, kind, markdown: "", scrapedAt: now, source: "unavailable" };
  }

  try {
    const response = await fetch(firecrawlScrapeEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        timeout: 30000,
      }),
    });

    if (!response.ok) {
      return { url, kind, markdown: "", scrapedAt: now, source: "unavailable" };
    }

    const body = (await response.json()) as { data?: { markdown?: string } };
    const markdown = body.data?.markdown?.trim() ?? "";

    return markdown
      ? { url, kind, markdown, scrapedAt: now, source: "firecrawl" }
      : { url, kind, markdown: "", scrapedAt: now, source: "unavailable" };
  } catch {
    return { url, kind, markdown: "", scrapedAt: now, source: "unavailable" };
  }
}

export async function scrapeBackgroundProfiles(input: {
  linkedinUrl: string;
  githubUrl: string;
}): Promise<ScrapedProfileSource[]> {
  const jobs: Promise<ScrapedProfileSource>[] = [];

  if (input.linkedinUrl) {
    jobs.push(scrapeProfileUrl(input.linkedinUrl, "linkedin"));
  }

  if (input.githubUrl) {
    jobs.push(scrapeProfileUrl(input.githubUrl, "github"));
  }

  return Promise.all(jobs);
}

