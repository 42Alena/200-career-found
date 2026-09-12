import type { JobDescriptionSource, SkillRequirement } from "@/lib/contracts";
import { slugify } from "@/lib/ids";

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
      "Testing Library",
      "Figma",
      "Tailwind CSS",
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
      "Browser devtools",
      "Regression testing",
    ],
    preferredSkills: ["Selenium", "CI", "SQL", "Postman", "Agile"],
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
  {
    title: "Technical Support Specialist",
    keywords: [
      "support",
      "customer",
      "troubleshooting",
      "communication",
      "tickets",
      "systems",
      "helpdesk",
      "documentation",
    ],
    strengths: [
      "You can use communication and empathy as technical advantages.",
      "Your experience may fit practical troubleshooting and user support.",
      "This path gives a realistic first step into IT teams.",
    ],
    gaps: [
      "Build fundamentals in networking, operating systems, and ticket workflows.",
      "Practice structured diagnosis and concise escalation notes.",
      "Learn common SaaS, identity, and device-management concepts.",
    ],
    confirmations: [
      "Confirm comfort handling repeated questions and urgent requests.",
      "Confirm you can explain technical steps calmly to non-technical users.",
    ],
    essentialSkills: [
      "Troubleshooting",
      "Ticketing",
      "Windows",
      "macOS",
      "Networking basics",
      "Customer communication",
      "Documentation",
      "SaaS administration",
    ],
    preferredSkills: ["ITIL", "Active Directory", "MDM", "Linux", "Security basics"],
  },
];

export const defaultRoleTitles = roleSeeds.slice(0, 3).map((role) => role.title);

export function getRoleSeed(title: string) {
  const normalized = title.toLowerCase();
  return (
    roleSeeds.find((role) => role.title.toLowerCase() === normalized) ??
    roleSeeds.find((role) => normalized.includes(role.title.toLowerCase())) ??
    roleSeeds[0]!
  );
}

export function buildSkillRequirement(
  roleTitle: string,
  name: string,
  category: "essential" | "preferred",
  sourceCount = 1,
): SkillRequirement {
  return {
    id: `${slugify(roleTitle)}-${category}-${slugify(name)}`,
    name,
    category,
    evidence:
      category === "essential"
        ? `${name} appears as a core requirement for ${roleTitle}.`
        : `${name} appears as a useful bonus skill for ${roleTitle}.`,
    sourceCount,
  };
}

export function fallbackJobDescriptionsForRole(
  roleTitle: string,
  location = "Remote",
): JobDescriptionSource[] {
  const seed = getRoleSeed(roleTitle);
  const now = new Date().toISOString();

  return Array.from({ length: 5 }, (_, index) => {
    const essentials = seed.essentialSkills
      .slice(index % 3, index % 3 + 5)
      .join(", ");
    const preferred = seed.preferredSkills
      .slice(index % 2, index % 2 + 3)
      .join(", ");

    return {
      id: `${slugify(seed.title)}-fixture-${index + 1}`,
      roleTitle: seed.title,
      title: `${seed.title} opening ${index + 1}`,
      company: `Market sample ${index + 1}`,
      location,
      url: "",
      markdown: [
        `# ${seed.title}`,
        `Location: ${location}`,
        `Essential skills: ${essentials}.`,
        `Preferred skills: ${preferred}.`,
        "Responsibilities include shipping practical work, communicating clearly, and learning from review.",
      ].join("\n\n"),
      source: "fixture",
      scrapedAt: now,
    };
  });
}
