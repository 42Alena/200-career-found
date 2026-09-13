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
  getRoleSeed,
  preparedJobDescriptionsForRole,
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
  Testing: ["testing", "unit tests", "end-to-end tests"],
  GraphQL: ["graphql"],
  "Responsive design": ["responsive design", "screen sizes", "devices"],
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
  Postman: ["postman"],
  Agile: ["agile", "scrum"],
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
    targetLocation: "Remote Germany",
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
  const seed = getRoleSeed(roleTitle);

  if (!seed) {
    return { essential: [], preferred: [] };
  }

  const markdown = sources.map((source) => source.markdown.toLowerCase());

  const buildRequirements = (
    skills: string[],
    category: "essential" | "preferred",
  ) =>
    skills.flatMap((name) => {
      const sourceIds = sources
        .filter((source) => pageMentionsSkill(source.markdown.toLowerCase(), name))
        .map((source) => source.id);

      return sourceIds.length > 0
        ? [buildSkillRequirement(roleTitle, name, category, sourceIds)]
        : [];
    });

  return {
    essential: buildRequirements(seed.essentialSkills, "essential"),
    preferred: buildRequirements(seed.preferredSkills, "preferred"),
  };
}

export function generateRecommendations(
  corpus: string,
  jobDescriptions: JobDescriptionSource[],
  candidateRoleTitles?: string[],
): RoleRecommendation[] {
  const ranked = rankRoleSeeds(corpus);
  const requestedRoles = (candidateRoleTitles ?? [])
    .map(getRoleSeed)
    .filter((role): role is (typeof roleSeeds)[number] => Boolean(role));
  const selectedRoles = [...requestedRoles, ...ranked.map(({ role }) => role)]
    .filter(
      (role, index, roles) =>
        roles.findIndex((candidate) => candidate.title === role.title) === index,
    )
    .slice(0, 3);

  return selectedRoles.map((role) => {
    const score = ranked.find((entry) => entry.role.title === role.title)?.score ?? 60;
    const sources = jobDescriptions.filter(
      (source) => source.roleTitle === role.title,
    );
    const roleSources =
      sources.length > 0 ? sources : preparedJobDescriptionsForRole(role.title);
    const requirements = extractSkillRequirements(role.title, roleSources);

    return {
      id: `role_${slugify(role.title)}`,
      title: role.title,
      matchScore: score,
      summary: `A practical path for turning your current experience into ${role.title} portfolio evidence.`,
      matchingStrengths: role.strengths,
      essentialGaps: role.gaps,
      requirementsNeedingConfirmation: role.confirmations,
      requirements,
    };
  });
}

type PhaseTemplate = {
  name: string;
  task: (skill: string, roleTitle: string) => string;
  expectedOutput: (skill: string) => string;
  doneWhen: (skill: string) => string;
};

const PHASE_TEMPLATES: PhaseTemplate[] = [
  {
    name: "Foundation",
    task: (skill) =>
      `Read one focused tutorial or intro on ${skill}. Write a 5-bullet cheatsheet in your own words that you can refer back to.`,
    expectedOutput: () => "A short cheatsheet file (markdown or plain text).",
    doneWhen: (skill) =>
      `You can explain ${skill} in two sentences without looking at the tutorial.`,
  },
  {
    name: "Practice",
    task: (skill) =>
      `Do 2–3 small hands-on exercises with ${skill}. Copy a working example first, then modify one thing at a time until it breaks and you understand why.`,
    expectedOutput: () =>
      "A code/notes file with each exercise and a one-line comment on what you learned.",
    doneWhen: () =>
      "You've intentionally broken something and reproduced the fix from memory.",
  },
  {
    name: "Build",
    task: (skill, roleTitle) =>
      `Add ${skill} to your ${roleTitle} portfolio mini-project. Focus on one visible feature — no polish yet.`,
    expectedOutput: () =>
      "A commit (or dated notes file) that a stranger could open and understand.",
    doneWhen: () =>
      "The feature works end-to-end for the happy path on your machine.",
  },
  {
    name: "Prove it",
    task: (skill) =>
      `Add a test, screenshot, or short write-up that proves your ${skill} work behaves correctly. Handle one edge case.`,
    expectedOutput: () =>
      "A test file, screenshot, or 1-paragraph write-up saved alongside the work.",
    doneWhen: () =>
      "Someone else could open the artifact and see the behaviour without asking you.",
  },
];

function pickPhase(day: number): PhaseTemplate {
  if (day <= 7) return PHASE_TEMPLATES[0]!;
  if (day <= 14) return PHASE_TEMPLATES[1]!;
  if (day <= 21) return PHASE_TEMPLATES[2]!;
  return PHASE_TEMPLATES[3]!;
}

export function buildLearningPlan(
  workspaceId: string,
  recommendation: RoleRecommendation,
  ratings: SkillRating[],
  dailyMinutes: number,
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

  return {
    id: createId("plan"),
    workspaceId,
    roleTitle: recommendation.title,
    generatedAt: new Date().toISOString(),
    days: Array.from({ length: 30 }, (_, index) => {
      const day = index + 1;
      const skill = safeFocusSkills[index % safeFocusSkills.length]!;
      const phase = pickPhase(day);

      return {
        day,
        title: `${phase.name}: ${skill}`,
        task: phase.task(skill, recommendation.title),
        timeEstimateMinutes: dailyMinutes,
        expectedOutput: phase.expectedOutput(skill),
        doneWhen: phase.doneWhen(skill),
        completed: false,
        notes: "",
      };
    }),
  };
}

function pageMentionsSkill(page: string, skill: string) {
  const aliases = skillAliases[skill] ?? [skill.toLowerCase()];
  return aliases.some((alias) => page.includes(alias.toLowerCase()));
}
