import { z } from "zod";

export const StepKeySchema = z.enum([
  "background",
  "profile",
  "assessment",
  "roles",
  "skills",
  "plan",
]);

export const ProfileSchema = z.object({
  name: z.string().trim().optional().default(""),
  currentRole: z.string().trim().optional().default(""),
  targetLocation: z.string().trim().optional().default("Remote Germany"),
  weeklyHours: z.coerce.number().int().min(1).max(60).default(8),
  dailyMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]).default(30),
  background: z.string().trim().optional().default(""),
  goal: z.string().trim().optional().default(""),
});

export const AssessmentAnswersSchema = z.object({
  preferredWork: z.string().trim().min(8),
  projectExperience: z.string().trim().min(8),
  independentContributions: z.string().trim().min(8),
  careerInterests: z.string().trim().min(8),
});

export const AssessmentInputSchema = z.object({
  workspaceId: z.string().min(1),
  answers: AssessmentAnswersSchema,
});

export const AssessmentSnapshotSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  submittedAt: z.string().min(1),
  answers: AssessmentAnswersSchema,
});

export const BackgroundIntakeInputSchema = z.object({
  workspaceId: z.string().min(1),
  cvText: z.string().trim().optional().default(""),
  linkedinUrl: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal(""))
    .default(""),
  githubUrl: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal(""))
    .default(""),
});

export const ScrapedProfileSourceSchema = z.object({
  url: z.string().min(1),
  kind: z.enum(["linkedin", "github"]),
  markdown: z.string().default(""),
  scrapedAt: z.string().min(1),
  source: z.enum(["firecrawl", "unavailable"]).default("unavailable"),
});

export const BackgroundSnapshotSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  submittedAt: z.string().min(1),
  cvText: z.string().default(""),
  linkedinUrl: z.string().default(""),
  githubUrl: z.string().default(""),
  scrapedSources: z.array(ScrapedProfileSourceSchema).default([]),
});

export const ExtractedProfileSchema = ProfileSchema.omit({
  weeklyHours: true,
  dailyMinutes: true,
});

export const ExtractProfileRequestSchema = z.object({
  workspaceId: z.string().min(1),
});

export const InferCandidateRolesRequestSchema = z.object({
  workspaceId: z.string().min(1),
});

export const TranscribeAudioResponseSchema = z.object({
  text: z.string(),
});

export const JobDescriptionSourceSchema = z.object({
  id: z.string().min(1),
  roleTitle: z.string().min(1),
  title: z.string().min(1),
  company: z.string().optional().default(""),
  location: z.string().optional().default(""),
  url: z.string().optional().default(""),
  markdown: z.string().min(1),
  source: z.enum(["firecrawl", "fixture"]).default("fixture"),
  scrapedAt: z.string().min(1),
});

export const SkillCategorySchema = z.enum(["essential", "preferred"]);

export const SkillRequirementSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: SkillCategorySchema,
  evidence: z.string().min(1),
  sourceCount: z.number().int().min(1).default(1),
  sourceIds: z.array(z.string().min(1)).default([]),
});

export const RoleRecommendationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  matchScore: z.number().int().min(0).max(100),
  summary: z.string().min(1),
  matchingStrengths: z.array(z.string().min(1)).min(1),
  essentialGaps: z.array(z.string().min(1)).min(1),
  requirementsNeedingConfirmation: z.array(z.string().min(1)).min(1),
  requirements: z.object({
    essential: z.array(SkillRequirementSchema),
    preferred: z.array(SkillRequirementSchema),
  }),
});

export const SkillRatingSchema = z.object({
  skillId: z.string().min(1),
  skillName: z.string().min(1),
  rating: z.number().int().min(0).max(4),
  evidence: z.string().trim().optional().default(""),
});

export const LearningPlanDaySchema = z.object({
  day: z.number().int().min(1).max(30),
  title: z.string().min(1),
  task: z.string().min(1),
  timeEstimateMinutes: z.number().int().min(15).max(360),
  expectedOutput: z.string().min(1),
  completed: z.boolean().default(false),
  notes: z.string().optional().default(""),
});

export const LearningPlanSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  roleTitle: z.string().min(1),
  generatedAt: z.string().min(1),
  days: z.array(LearningPlanDaySchema).length(30),
});

export const WorkspaceSchema = z.object({
  workspaceId: z.string().min(1),
  background: BackgroundSnapshotSchema.optional(),
  profile: ProfileSchema.optional(),
  currentStep: StepKeySchema.default("background"),
  assessment: AssessmentSnapshotSchema.optional(),
  candidateRoleTitles: z.array(z.string().min(1)).max(5).optional(),
  jobDescriptions: z.array(JobDescriptionSourceSchema).default([]),
  recommendations: z.array(RoleRecommendationSchema).default([]),
  selectedRoleId: z.string().optional(),
  skillRatings: z.array(SkillRatingSchema).default([]),
  learningPlan: LearningPlanSchema.optional(),
  updatedAt: z.string().min(1),
});

export const SourceJobDescriptionsRequestSchema = z.object({
  workspaceId: z.string().min(1),
  roleTitles: z.array(z.string().min(1)).max(5).optional(),
  location: z.string().optional().default("Remote Germany"),
});

export const GenerateRecommendationsRequestSchema = z.object({
  workspaceId: z.string().min(1),
});

export const SaveSkillRatingsRequestSchema = z.object({
  workspaceId: z.string().min(1),
  selectedRoleId: z.string().min(1),
  ratings: z.array(SkillRatingSchema),
});

export const GenerateLearningPlanRequestSchema = z.object({
  workspaceId: z.string().min(1),
  selectedRoleId: z.string().min(1),
});

export type StepKey = z.infer<typeof StepKeySchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type AssessmentAnswers = z.infer<typeof AssessmentAnswersSchema>;
export type AssessmentInput = z.infer<typeof AssessmentInputSchema>;
export type AssessmentSnapshot = z.infer<typeof AssessmentSnapshotSchema>;
export type BackgroundIntakeInput = z.infer<typeof BackgroundIntakeInputSchema>;
export type ScrapedProfileSource = z.infer<typeof ScrapedProfileSourceSchema>;
export type BackgroundSnapshot = z.infer<typeof BackgroundSnapshotSchema>;
export type ExtractedProfile = z.infer<typeof ExtractedProfileSchema>;
export type JobDescriptionSource = z.infer<typeof JobDescriptionSourceSchema>;
export type SkillCategory = z.infer<typeof SkillCategorySchema>;
export type SkillRequirement = z.infer<typeof SkillRequirementSchema>;
export type RoleRecommendation = z.infer<typeof RoleRecommendationSchema>;
export type SkillRating = z.infer<typeof SkillRatingSchema>;
export type LearningPlanDay = z.infer<typeof LearningPlanDaySchema>;
export type LearningPlan = z.infer<typeof LearningPlanSchema>;
export type Workspace = z.infer<typeof WorkspaceSchema>;
