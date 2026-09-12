import type { JobDescriptionSource, ScrapedProfileSource } from "@/lib/contracts";
import { env } from "@/lib/env";
import {
  defaultRoleTitles,
  fallbackJobDescriptionsForRole,
} from "@/lib/fixtures";
import { createId } from "@/lib/ids";

const firecrawlSearchEndpoint = "https://api.firecrawl.dev/v2/search";
const firecrawlScrapeEndpoint = "https://api.firecrawl.dev/v2/scrape";

type FirecrawlSearchResult = {
  title?: string;
  description?: string;
  url?: string;
  markdown?: string;
  metadata?: {
    title?: string;
    sourceURL?: string;
    url?: string;
  };
};

type FirecrawlSearchResponse = {
  success?: boolean;
  data?: {
    web?: FirecrawlSearchResult[];
  };
};

export async function sourceJobDescriptions(input: {
  roleTitles?: string[];
  location?: string;
}) {
  const roleTitles =
    input.roleTitles && input.roleTitles.length > 0
      ? input.roleTitles
      : defaultRoleTitles;

  const perRole = await Promise.all(
    roleTitles.map((roleTitle) =>
      sourceJobDescriptionsForRole(roleTitle, input.location),
    ),
  );

  return perRole.flat();
}

async function sourceJobDescriptionsForRole(
  roleTitle: string,
  location = "Remote",
): Promise<JobDescriptionSource[]> {
  if (!env.FIRECRAWL_API_KEY) {
    return fallbackJobDescriptionsForRole(roleTitle, location);
  }

  try {
    const response = await fetch(firecrawlSearchEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `"${roleTitle}" job description ${location}`,
        limit: 5,
        sources: ["web"],
        country: "US",
        ignoreInvalidURLs: true,
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true,
          timeout: 30000,
        },
      }),
    });

    if (!response.ok) {
      return fallbackJobDescriptionsForRole(roleTitle, location);
    }

    const body = (await response.json()) as FirecrawlSearchResponse;
    const sources = (body.data?.web ?? [])
      .map((result) => toJobDescriptionSource(result, roleTitle, location))
      .filter((source): source is JobDescriptionSource => source !== null)
      .slice(0, 5);

    if (sources.length === 0) {
      return fallbackJobDescriptionsForRole(roleTitle, location);
    }

    if (sources.length < 5) {
      return [
        ...sources,
        ...fallbackJobDescriptionsForRole(roleTitle, location).slice(
          sources.length,
        ),
      ];
    }

    return sources;
  } catch {
    return fallbackJobDescriptionsForRole(roleTitle, location);
  }
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

function toJobDescriptionSource(
  result: FirecrawlSearchResult,
  roleTitle: string,
  location: string,
): JobDescriptionSource | null {
  const markdown = result.markdown?.trim() || result.description?.trim() || "";

  if (markdown.length < 80) {
    return null;
  }

  return {
    id: createId("jd"),
    roleTitle,
    title: result.title || result.metadata?.title || `${roleTitle} job`,
    company: "",
    location,
    url: result.url || result.metadata?.sourceURL || result.metadata?.url || "",
    markdown,
    source: "firecrawl",
    scrapedAt: new Date().toISOString(),
  };
}
