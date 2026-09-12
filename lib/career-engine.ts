import {
  type AssessmentAnswers,
  type AssessmentInput,
  type AssessmentSnapshot,
  type BackgroundIntakeInput,
  type BackgroundSnapshot,
  type ExtractedProfile,
  type JobDescriptionSource,
  type LearningPlan,
  type Profile,
  type RoleRecommendation,
  type ScrapedProfileSource,
  type SkillRating,
  type SkillRequirement,
} from "@/lib/contracts";
import {
  buildSkillRequirement,
  fallbackJobDescriptionsForRole,
  getRoleSeed,
  roleSeeds,
} from "@/lib/fixtures";
import { createId, slugify } from "@/lib/ids";

const skillAliases: Record<string, string[]> = {
  HTML: ["html", "semantic markup"],
  CSS: ["css", "responsive design", "layout", "flexbox", "grid"],
  JavaScript: ["javascript", "js", "ecmascript"],
  TypeScript: ["typescript", "ts"],
  React: ["react", "react.js", "reactjs"],
  "Next.js": ["next.js", "nextjs", "next"],
  Git: ["git", "github", "version control"],
  "REST APIs": ["rest", "api", "json", "http"],
  Accessibility: ["accessibility", "a11y", "wcag"],
  "Testing Library": ["testing library", "unit tests", "component tests"],
  Figma: ["figma", "design handoff"],
  "Tailwind CSS": ["tailwind", "tailwind css"],
  "Test cases": ["test case", "test cases", "test plan"],
  "Bug reports": ["bug report", "defect", "reproduction steps"],
  Playwright: ["playwright"],
  Selenium: ["selenium"],
  "API testing": ["api testing", "postman"],
  "Browser devtools": ["browser devtools", "devtools", "chrome devtools"],
  "Regression testing": ["regression"],
  CI: ["ci", "github actions", "continuous integration"],
  SQL: ["sql", "postgres", "mysql", "database"],
  Spreadsheets: ["spreadsheet", "excel", "google sheets"],
  "Data cleaning": ["data cleaning", "clean data", "etl"],
  Dashboards: ["dashboard", "reporting"],
  Charts: ["chart", "visualization", "visualisation"],
  "Business questions": ["business question", "requirements", "stakeholder"],
  "Basic statistics": ["statistics", "mean", "median", "percentile"],
  Presentation: ["presentation", "storytelling", "communicate insights"],
  Python: ["python", "pandas", "notebook"],
  "Power BI": ["power bi"],
  Tableau: ["tableau"],
  dbt: ["dbt"],
  "A/B testing": ["a/b", "ab testing", "experiment"],
  Troubleshooting: ["troubleshooting", "diagnose", "root cause"],
  Ticketing: ["ticket", "zendesk", "jira service"],
  Windows: ["windows"],
  macOS: ["macos", "mac os", "apple"],
  "Networking basics": ["networking", "dns", "tcp", "vpn"],
  "Customer communication": ["customer communication", "customer support"],
  Documentation: ["documentation", "knowledge base"],
  "SaaS administration": ["saas", "admin console"],
  ITIL: ["itil"],
  "Active Directory": ["active directory", "entra", "azure ad"],
  MDM: ["mdm", "jamf", "intune"],
  Linux: ["linux", "unix"],
  "Security basics": ["security", "mfa", "least privilege"],
};

export function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function buildAssessmentSnapshot(
  input: AssessmentInput,
): AssessmentSnapshot {
  return {
    id: createId("assessment"),
    workspaceId: input.workspaceId,
    submittedAt: new Date().toISOString(),
    answers: input.answers,
  };
}

export function buildBackgroundSnapshot(
  input: BackgroundIntakeInput,
  scrapedSources: ScrapedProfileSource[],
): BackgroundSnapshot {
  return {
    id: createId("background"),
    workspaceId: input.workspaceId,
    submittedAt: new Date().toISOString(),
    cvText: normalizeText(input.cvText),
    linkedinUrl: input.linkedinUrl,
    githubUrl: input.githubUrl,
    scrapedSources,
  };
}

export function buildFallbackProfile(input: {
  cvText: string;
  scrapedSources: ScrapedProfileSource[];
}): ExtractedProfile {
  const combined = normalizeText(
    [input.cvText, ...input.scrapedSources.map((source) => source.markdown)].join(
      " ",
    ),
  );

  return {
    name: "",
    currentRole: "",
    targetLocation: "Remote",
    background: combined.slice(0, 600),
    goal: "",
  };
}

export function buildCandidateCorpus(input: {
  profile?: Profile;
  background?: BackgroundSnapshot;
  answers?: AssessmentAnswers;
}) {
  return normalizeText(
    [
      input.profile?.currentRole,
      input.profile?.background,
      input.profile?.goal,
      input.background?.cvText,
      ...(input.background?.scrapedSources.map((source) => source.markdown) ??
        []),
      input.answers?.preferredWork,
      input.answers?.projectExperience,
      input.answers?.independentContributions,
      input.answers?.careerInterests,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" "),
  ).toLowerCase();
}

export function rankRoleSeeds(corpus: string) {
  return roleSeeds
    .map((role) => {
      const keywordScore = role.keywords.reduce((score, keyword) => {
        return corpus.includes(keyword) ? score + 12 : score;
      }, 0);
      const skillScore = [...role.essentialSkills, ...role.preferredSkills].reduce(
        (score, skill) => {
          const aliases = skillAliases[skill] ?? [skill.toLowerCase()];
          return aliases.some((alias) => corpus.includes(alias.toLowerCase()))
            ? score + 5
            : score;
        },
        0,
      );

      return {
        role,
        score: Math.min(98, 48 + keywordScore + skillScore),
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function extractSkillRequirements(
  roleTitle: string,
  sources: JobDescriptionSource[],
): { essential: SkillRequirement[]; preferred: SkillRequirement[] } {
  const seed = roleSeeds.find((role) => role.title === roleTitle) ?? roleSeeds[0]!;
  const markdown = sources.map((source) => source.markdown.toLowerCase());
  const allEssential = new Map<string, number>();
  const allPreferred = new Map<string, number>();

  for (const skill of seed.essentialSkills) {
    const count = countSkillMentions(markdown, skill);
    allEssential.set(skill, Math.max(1, count));
  }

  for (const skill of seed.preferredSkills) {
    const count = countSkillMentions(markdown, skill);
    allPreferred.set(skill, Math.max(1, count));
  }

  return {
    essential: Array.from(allEssential, ([name, sourceCount]) =>
      buildSkillRequirement(roleTitle, name, "essential", sourceCount),
    ),
    preferred: Array.from(allPreferred, ([name, sourceCount]) =>
      buildSkillRequirement(roleTitle, name, "preferred", sourceCount),
    ),
  };
}

export function generateRecommendations(
  corpus: string,
  jobDescriptions: JobDescriptionSource[],
  candidateRoleTitles?: string[],
): RoleRecommendation[] {
  const ranked =
    candidateRoleTitles && candidateRoleTitles.length > 0
      ? candidateRoleTitles.slice(0, 3).map((title) => ({
          title,
          role: getRoleSeed(title),
          score: rankRoleSeeds(corpus).find(
            (entry) => entry.role.title === getRoleSeed(title).title,
          )?.score ?? 60,
        }))
      : rankRoleSeeds(corpus)
          .slice(0, 3)
          .map(({ role, score }) => ({ title: role.title, role, score }));

  return ranked.map(({ title, role, score }) => {
    const sources = jobDescriptions.filter(
      (source) => source.roleTitle === title,
    );
    const roleSources =
      sources.length > 0 ? sources : fallbackJobDescriptionsForRole(title);
    const requirements = extractSkillRequirements(role.title, roleSources);

    return {
      id: `role_${slugify(title)}`,
      title,
      matchScore: score,
      summary: `A practical path for turning your current experience into ${title} portfolio evidence.`,
      matchingStrengths: role.strengths,
      essentialGaps: role.gaps,
      requirementsNeedingConfirmation: role.confirmations,
      requirements,
    };
  });
}

export function buildLearningPlan(
  workspaceId: string,
  recommendation: RoleRecommendation,
  ratings: SkillRating[],
  weeklyHours: number,
): LearningPlan {
  const lowRatedSkillNames = ratings
    .filter((rating) => rating.rating < 3)
    .map((rating) => rating.skillName);
  const essentialSkillNames = recommendation.requirements.essential.map(
    (skill) => skill.name,
  );
  const focusSkills =
    lowRatedSkillNames.length > 0 ? lowRatedSkillNames : essentialSkillNames;
  const safeFocusSkills =
    focusSkills.length > 0 ? focusSkills : [recommendation.title];
  const minutesPerDay = Math.max(30, Math.round((weeklyHours * 60) / 5));
  const phases = [
    "Understand the role and set up a small project",
    "Practice the core workflow",
    "Build portfolio evidence",
    "Add quality, polish, and review",
    "Package the result for applications",
  ];

  return {
    id: createId("plan"),
    workspaceId,
    roleTitle: recommendation.title,
    generatedAt: new Date().toISOString(),
    days: Array.from({ length: 30 }, (_, index) => {
      const day = index + 1;
      const skill = safeFocusSkills[index % safeFocusSkills.length]!;
      const phase = phases[Math.min(phases.length - 1, Math.floor(index / 6))]!;

      return {
        day,
        title: `Day ${day}: ${skill}`,
        task: `${phase}. Work specifically on ${skill.toLowerCase()} and record what changed.`,
        timeEstimateMinutes: minutesPerDay,
        expectedOutput:
          day % 5 === 0
            ? "A short reflection with screenshots, links, or notes showing progress."
            : "A concrete artifact: code, notes, test cases, dashboard, or written explanation.",
        completed: false,
        notes: "",
      };
    }),
  };
}

function countSkillMentions(markdown: string[], skill: string) {
  const aliases = skillAliases[skill] ?? [skill.toLowerCase()];
  return markdown.reduce((count, page) => {
    return count + (aliases.some((alias) => page.includes(alias)) ? 1 : 0);
  }, 0);
}
