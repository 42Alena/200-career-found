import type { JobDescriptionSource, SkillRequirement } from "@/lib/contracts";
import { slugify } from "@/lib/ids";
import preparedJobMarketData from "@/lib/job-market-data.json";

const JOB_SAMPLE_SIZE = 5;

type RoleSeed = {
  title: string;
  keywords: string[];
  strengths: string[];
  gaps: string[];
  confirmations: string[];
  essentialSkills: string[];
  preferredSkills: string[];
};

export const roleSeeds: RoleSeed[] = [
  {
    title: "Junior Frontend Developer",
    keywords: [
      "frontend",
      "react",
      "javascript",
      "typescript",
      "css",
      "ui",
      "web",
      "component",
      "figma",
    ],
    strengths: [
      "You mention hands-on project work and visible user-facing outcomes.",
      "Your interests point toward building interfaces and iterating with feedback.",
      "Your background can transfer into clear communication around product details.",
    ],
    gaps: [
      "Build confidence with TypeScript, React state, and API integration.",
      "Practice turning designs into responsive, accessible screens.",
      "Create deployable portfolio projects with tests and reviewable code.",
    ],
    confirmations: [
      "Confirm comfort working through visual ambiguity and browser debugging.",
      "Confirm you can show at least one deployed interface with source code.",
    ],
    essentialSkills: [
      "HTML",
      "CSS",
      "JavaScript",
      "TypeScript",
      "React",
      "Git",
      "REST APIs",
      "Responsive design",
    ],
    preferredSkills: [
      "Next.js",
      "Accessibility",
      "Testing",
      "Tailwind CSS",
      "GraphQL",
    ],
  },
  {
    title: "QA Automation Tester",
    keywords: [
      "qa",
      "quality",
      "testing",
      "automation",
      "detail",
      "bug",
      "process",
      "playwright",
      "selenium",
    ],
    strengths: [
      "You show attention to detail and interest in structured problem solving.",
      "Your project history suggests patience with repeatable workflows.",
      "This path rewards clear written evidence and careful reproduction steps.",
    ],
    gaps: [
      "Practice test design, browser automation, and API test coverage.",
      "Learn how to report defects with precise reproduction details.",
      "Build a small portfolio that includes manual and automated tests.",
    ],
    confirmations: [
      "Confirm you enjoy investigating failures without immediate answers.",
      "Confirm you can document expected versus actual behavior clearly.",
    ],
    essentialSkills: [
      "Test cases",
      "Bug reports",
      "JavaScript",
      "Playwright",
      "API testing",
      "Git",
      "Regression testing",
      "CI",
    ],
    preferredSkills: ["Selenium", "SQL", "Postman", "Agile", "TypeScript"],
  },
  {
    title: "Data Analyst",
    keywords: [
      "data",
      "analysis",
      "spreadsheet",
      "sql",
      "dashboard",
      "report",
      "excel",
      "python",
      "metrics",
    ],
    strengths: [
      "Your background can translate into asking useful business questions.",
      "You seem oriented toward patterns, evidence, and practical outcomes.",
      "This path allows visible progress through reports and dashboards.",
    ],
    gaps: [
      "Strengthen SQL, spreadsheet modeling, and data cleaning habits.",
      "Practice explaining insights with charts and concise recommendations.",
      "Build a portfolio case study using a public dataset.",
    ],
    confirmations: [
      "Confirm you are comfortable with repetitive data cleaning work.",
      "Confirm you can explain a chart in plain language.",
    ],
    essentialSkills: [
      "SQL",
      "Spreadsheets",
      "Data cleaning",
      "Dashboards",
      "Charts",
      "Business questions",
      "Basic statistics",
      "Presentation",
    ],
    preferredSkills: ["Python", "Power BI", "Tableau", "dbt", "A/B testing"],
  },
];

export const defaultRoleTitles = roleSeeds.map((role) => role.title);

export function getRoleSeed(title: string) {
  return roleSeeds.find(
    (role) => role.title.toLowerCase() === title.trim().toLowerCase(),
  );
}

export function buildSkillRequirement(
  roleTitle: string,
  name: string,
  category: "essential" | "preferred",
  sourceIds: string[],
): SkillRequirement {
  return {
    id: `${slugify(roleTitle)}-${category}-${slugify(name)}`,
    name,
    category,
    evidence:
      category === "essential"
        ? `${name} is a core requirement across the analyzed ${roleTitle} postings.`
        : `${name} is a useful differentiator in the analyzed ${roleTitle} postings.`,
    sourceCount: sourceIds.length,
    sourceIds,
  };
}

export function preparedJobDescriptionsForRole(
  roleTitle: string,
  location = "Remote",
): JobDescriptionSource[] {
  const seed = getRoleSeed(roleTitle);
  const preparedRole = preparedJobMarketData.find(
    (entry) => entry.roleTitle === seed?.title,
  );
  const now = new Date().toISOString();

  return (preparedRole?.jobs ?? []).slice(0, JOB_SAMPLE_SIZE).map((job) => {
    return {
      id: job.id,
      roleTitle: preparedRole?.roleTitle ?? roleTitle,
      title: job.title,
      company: job.company,
      location: job.location || location,
      url: job.url,
      markdown: [
        `# ${job.title} at ${job.company}`,
        `Essential skills: ${job.essentialSkills.join(", ")}.`,
        `Preferred skills: ${job.preferredSkills.join(", ")}.`,
      ].join("\n\n"),
      source: "fixture",
      scrapedAt: now,
    };
  });
}
