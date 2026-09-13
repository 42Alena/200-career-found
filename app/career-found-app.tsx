"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type {
  AssessmentAnswers,
  JobDescriptionSource,
  LearningPlanDay,
  Profile,
  RoleRecommendation,
  SkillRating,
  SkillRequirement,
  StepKey,
  Workspace,
} from "@/lib/contracts";

const STEPS: { key: StepKey; label: string; short: string }[] = [
  { key: "background", label: "Experience", short: "1" },
  { key: "profile", label: "Profile", short: "2" },
  { key: "assessment", label: "Fit questions", short: "3" },
  { key: "roles", label: "Career paths", short: "4" },
  { key: "skills", label: "Evidence & gaps", short: "5" },
  { key: "plan", label: "30-day plan", short: "6" },
];

const STEP_INDEX: Record<StepKey, number> = STEPS.reduce(
  (acc, step, index) => {
    acc[step.key] = index;
    return acc;
  },
  {} as Record<StepKey, number>,
);

const emptyProfile: Profile = {
  name: "",
  currentRole: "",
  targetLocation: "Remote Germany",
  weeklyHours: 8,
  dailyMinutes: 30,
  background: "",
  goal: "",
};

const emptyAnswers: AssessmentAnswers = {
  preferredWork: "",
  projectExperience: "",
  independentContributions: "",
  careerInterests: "",
};

const emptyChipSelections: Record<keyof AssessmentAnswers, string[]> = {
  preferredWork: [],
  projectExperience: [],
  independentContributions: [],
  careerInterests: [],
};

function combineChipsAndText(chips: string[], text: string): string {
  const trimmedText = text.trim();
  if (chips.length === 0) return trimmedText;
  const chipStr = chips.join(", ");
  return trimmedText ? `${chipStr}. ${trimmedText}` : chipStr;
}

const assessmentQuestions: {
  key: keyof AssessmentAnswers;
  title: string;
  hint: string;
  prompts: string[];
  placeholder: string;
}[] = [
  {
    key: "preferredWork",
    title: "What kind of work do you enjoy most?",
    hint: "Think about the moments you lose track of time. It doesn't have to be technical.",
    prompts: [
      "Building interfaces",
      "Working with data",
      "Testing things",
      "Helping users",
      "Working with systems",
    ],
    placeholder:
      "e.g. I like turning fuzzy briefs into clear structure. I enjoy testing edge cases and finding the one that breaks.",
  },
  {
    key: "projectExperience",
    title: "What have you built, shipped, analyzed, or improved?",
    hint: "Personal, volunteer, side project or work. Rough sketches count.",
    prompts: [
      "Shipped a project",
      "Automated a task",
      "Built a dashboard",
      "Improved a process",
      "Analyzed data",
    ],
    placeholder:
      "e.g. Built a small tool in Python to clean up shift schedules for my team. Automated a weekly report in Sheets.",
  },
  {
    key: "independentContributions",
    title: "Where have you owned something end-to-end?",
    hint: "Decisions you made, fixes you led, docs you wrote — not tasks you were handed.",
    prompts: [
      "Owned a fix",
      "Wrote docs",
      "Made a call",
      "Led onboarding",
      "Ran research",
    ],
    placeholder:
      "e.g. Redesigned the onboarding checklist after noticing new hires kept getting stuck at the same step.",
  },
  {
    key: "careerInterests",
    title: "What would you love to learn — and what would you rather avoid?",
    hint: "Naming the 'no's is as useful as the 'yes'.",
    prompts: [
      "More coding",
      "More analysis",
      "Less meetings",
      "More impact",
      "More independence",
    ],
    placeholder:
      "e.g. Want to learn SQL and build small services. Would rather avoid pure customer-facing sales.",
  },
];

const RATING_CHOICES: {
  value: number;
  label: string;
  meta: string;
}[] = [
  { value: 0, label: "New to this", meta: "Haven't done it yet" },
  { value: 2, label: "With help", meta: "Can do it with guidance" },
  { value: 4, label: "Independently", meta: "I can do this on my own" },
];

const ANALYSIS_STAGES = [
  "Reading your background…",
  "Identifying transferable skills…",
  "Structuring your profile so you can review it…",
];

const PIPELINE_STAGES = [
  "Reviewing your answers…",
  "Analyzing your experience against our prepared job dataset…",
  "Ranking realistic directions and pulling evidence…",
  "Assembling strengths and gaps for each path…",
];

const WEEK_META: {
  range: [number, number];
  title: string;
  tagline: string;
}[] = [
  { range: [1, 7], title: "Week 1", tagline: "Foundation" },
  { range: [8, 14], title: "Week 2", tagline: "Practice" },
  { range: [15, 21], title: "Week 3", tagline: "Build" },
  { range: [22, 30], title: "Week 4", tagline: "Prove it" },
];

type Notice = {
  tone: "info" | "success" | "error";
  message: string;
} | null;

type WorkspacePayload = {
  workspace: Workspace;
};

type BackgroundPayload = WorkspacePayload & {
  profile: Workspace["profile"];
};

type AssessmentPayload = WorkspacePayload & {
  assessment: Workspace["assessment"];
};

type RolesInferPayload = WorkspacePayload & {
  candidateRoleTitles: Workspace["candidateRoleTitles"];
};

type JobDescriptionsPayload = WorkspacePayload & {
  jobDescriptions: Workspace["jobDescriptions"];
};

type RecommendationsPayload = WorkspacePayload & {
  recommendations: RoleRecommendation[];
};

type LearningPlanPayload = WorkspacePayload & {
  learningPlan: Workspace["learningPlan"];
};

export function CareerFoundApp() {
  const [workspaceId, setWorkspaceId] = useState("");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [step, setStep] = useState<StepKey>("background");
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [cvText, setCvText] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [answers, setAnswers] = useState<AssessmentAnswers>(emptyAnswers);
  const [chipSelections, setChipSelections] = useState<
    Record<keyof AssessmentAnswers, string[]>
  >(emptyChipSelections);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [skillRatings, setSkillRatings] = useState<SkillRating[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [busyLabel, setBusyLabel] = useState("");
  const [showOptionalSources, setShowOptionalSources] = useState(false);
  const [view, setView] = useState<"landing" | "app">("landing");
  const [analysis, setAnalysis] = useState<{
    stages: string[];
    heading: string;
    chips: string[];
    grounding?: string;
  } | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    const existingId =
      window.localStorage.getItem("career-found-workspace-id") ??
      createBrowserId("workspace");
    window.localStorage.setItem("career-found-workspace-id", existingId);
    setWorkspaceId(existingId);

    const cached = readCachedWorkspace(existingId);
    if (cached) {
      hydrateWorkspace(cached);
      if (hasProgress(cached)) {
        setView("app");
      }
    }

    void loadWorkspace(existingId, cached, isMounted);

    async function loadWorkspace(
      id: string,
      cachedWorkspace: Workspace | null,
      mounted: boolean,
    ) {
      setBusyLabel("Loading workspace");
      try {
        const payload = await requestJson<WorkspacePayload>(
          `/api/workspace?workspaceId=${encodeURIComponent(id)}`,
        );
        if (!mounted || !isMounted) {
          return;
        }

        const nextWorkspace = hasProgress(payload.workspace)
          ? payload.workspace
          : cachedWorkspace ?? payload.workspace;
        hydrateWorkspace(nextWorkspace);
        if (hasProgress(nextWorkspace)) {
          setView("app");
        }

        if (cachedWorkspace && !hasProgress(payload.workspace)) {
          await saveWorkspace(cachedWorkspace, { silent: true });
        }
      } catch (error) {
        if (isMounted) {
          setNotice(toNotice(error));
          if (!cached) {
            hydrateWorkspace(createClientWorkspace(existingId));
          }
        }
      } finally {
        if (isMounted) {
          setBusyLabel("");
        }
      }
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedRecommendation = useMemo(() => {
    const recommendations = workspace?.recommendations ?? [];
    return (
      recommendations.find((item) => item.id === selectedRoleId) ??
      recommendations[0]
    );
  }, [selectedRoleId, workspace?.recommendations]);

  const activeRatings = useMemo(() => {
    if (!selectedRecommendation) {
      return [];
    }

    return ensureRatingsForRecommendation(selectedRecommendation, skillRatings);
  }, [selectedRecommendation, skillRatings]);

  const planProgress = useMemo(() => {
    const days = workspace?.learningPlan?.days ?? [];
    const completed = days.filter((day) => day.completed).length;
    return { completed, total: days.length };
  }, [workspace?.learningPlan?.days]);

  const maxReachedStep = useMemo(() => {
    return STEP_INDEX[workspace?.currentStep ?? "background"] ?? 0;
  }, [workspace?.currentStep]);

  function hydrateWorkspace(nextWorkspace: Workspace) {
    setWorkspace(nextWorkspace);
    setStep(nextWorkspace.currentStep);
    setProfile({
      ...emptyProfile,
      ...nextWorkspace.profile,
      dailyMinutes: nextWorkspace.profile?.dailyMinutes ?? 30,
    });
    setSelectedRoleId(
      nextWorkspace.selectedRoleId ?? nextWorkspace.recommendations[0]?.id ?? "",
    );
    setSkillRatings(nextWorkspace.skillRatings);

    if (nextWorkspace.background) {
      setCvText(nextWorkspace.background.cvText);
      setLinkedinUrl(nextWorkspace.background.linkedinUrl);
      setGithubUrl(nextWorkspace.background.githubUrl);
    }

    if (nextWorkspace.assessment) {
      setAnswers(nextWorkspace.assessment.answers);
    }

    cacheWorkspace(nextWorkspace);
  }

  async function saveWorkspace(
    nextWorkspace: Workspace,
    options: { silent?: boolean } = {},
  ) {
    const workspaceToSave = {
      ...nextWorkspace,
      updatedAt: new Date().toISOString(),
    };
    setWorkspace(workspaceToSave);
    cacheWorkspace(workspaceToSave);

    try {
      const payload = await requestJson<WorkspacePayload>("/api/workspace", {
        method: "PUT",
        body: JSON.stringify(workspaceToSave),
      });
      setWorkspace(payload.workspace);
      cacheWorkspace(payload.workspace);
      if (!options.silent) {
        setNotice({ tone: "success", message: "Progress saved" });
      }
    } catch (error) {
      if (!options.silent) {
        setNotice(toNotice(error));
      }
    }
  }

  async function handleBackgroundSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspaceId) {
      return;
    }

    if (cvText.trim().length < 20) {
      setNotice({
        tone: "error",
        message: "Add a bit more detail so we can extract something meaningful.",
      });
      return;
    }

    setBusyLabel("Analyzing experience");
    setNotice(null);
    setAnalysis({
      heading: "Reading your story",
      stages: ANALYSIS_STAGES,
      chips: extractChips(cvText),
      grounding:
        "Extraction happens on the text you submitted — no external lookups.",
    });
    try {
      const payload = await requestJson<BackgroundPayload>("/api/background", {
        method: "POST",
        body: JSON.stringify({ workspaceId, cvText, linkedinUrl, githubUrl }),
      });
      hydrateWorkspace(payload.workspace);
      setStep("profile");
    } catch (error) {
      setNotice(toNotice(error));
    } finally {
      setBusyLabel("");
      setAnalysis(null);
    }
  }

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspaceId) {
      return;
    }

    setBusyLabel("Saving profile");
    const nextWorkspace: Workspace = {
      ...(workspace ?? createClientWorkspace(workspaceId)),
      profile,
      currentStep: "assessment",
      updatedAt: new Date().toISOString(),
    };
    await saveWorkspace(nextWorkspace);
    setQuestionIndex(0);
    setStep("assessment");
    setBusyLabel("");
  }

  function handleAssessmentBack() {
    setQuestionIndex((index) => Math.max(0, index - 1));
  }

  async function handleAssessmentNext() {
    const question = assessmentQuestions[questionIndex];
    if (!question) {
      return;
    }

    const combined = combineChipsAndText(
      chipSelections[question.key],
      answers[question.key],
    );

    if (combined.length < 8) {
      setNotice({
        tone: "error",
        message:
          "Pick a suggestion or add a bit more detail before continuing (at least 8 characters).",
      });
      return;
    }

    setNotice(null);

    if (questionIndex < assessmentQuestions.length - 1) {
      setQuestionIndex((index) => index + 1);
      return;
    }

    await handleAssessmentSubmit();
  }

  async function handleAssessmentSubmit() {
    if (!workspaceId) {
      return;
    }

    const combinedAnswers: AssessmentAnswers = {
      preferredWork: combineChipsAndText(
        chipSelections.preferredWork,
        answers.preferredWork,
      ),
      projectExperience: combineChipsAndText(
        chipSelections.projectExperience,
        answers.projectExperience,
      ),
      independentContributions: combineChipsAndText(
        chipSelections.independentContributions,
        answers.independentContributions,
      ),
      careerInterests: combineChipsAndText(
        chipSelections.careerInterests,
        answers.careerInterests,
      ),
    };

    setBusyLabel("Finding paths");
    setNotice(null);
    setAnalysis({
      heading: "Matching you to real roles",
      stages: PIPELINE_STAGES,
      chips: extractChips(
        `${cvText} ${Object.values(combinedAnswers).join(" ")}`,
      ),
      grounding:
        "Grounded in a prepared dataset of real job descriptions — not a live search.",
    });
    try {
      const assessmentPayload = await requestJson<AssessmentPayload>(
        "/api/assessment",
        {
          method: "POST",
          body: JSON.stringify({ workspaceId, answers: combinedAnswers }),
        },
      );
      hydrateWorkspace(assessmentPayload.workspace);

      const rolesPayload = await requestJson<RolesInferPayload>(
        "/api/roles/infer",
        {
          method: "POST",
          body: JSON.stringify({ workspaceId }),
        },
      );
      hydrateWorkspace(rolesPayload.workspace);

      const jobPayload = await requestJson<JobDescriptionsPayload>(
        "/api/job-descriptions/source",
        {
          method: "POST",
          body: JSON.stringify({
            workspaceId,
            roleTitles: rolesPayload.candidateRoleTitles,
            location: profile.targetLocation || "Remote Germany",
          }),
        },
      );
      hydrateWorkspace(jobPayload.workspace);

      const recommendationPayload = await requestJson<RecommendationsPayload>(
        "/api/recommendations/generate",
        {
          method: "POST",
          body: JSON.stringify({ workspaceId }),
        },
      );
      hydrateWorkspace(recommendationPayload.workspace);
      setStep("roles");
      setNotice({
        tone: "success",
        message: "Three paths ready",
      });
    } catch (error) {
      setNotice(toNotice(error));
    } finally {
      setBusyLabel("");
      setAnalysis(null);
    }
  }

  async function handleRoleSelect(recommendation: RoleRecommendation) {
    setSelectedRoleId(recommendation.id);
    const ratings = ensureRatingsForRecommendation(recommendation, skillRatings);
    setSkillRatings(ratings);

    if (workspace) {
      await saveWorkspace(
        {
          ...workspace,
          currentStep: "skills",
          selectedRoleId: recommendation.id,
          skillRatings: ratings,
          updatedAt: new Date().toISOString(),
        },
        { silent: true },
      );
    }

    setStep("skills");
  }

  function updateRating(skill: SkillRequirement, patch: Partial<SkillRating>) {
    setSkillRatings((current) => {
      const next = ensureRatingsForRecommendation(
        selectedRecommendation,
        current,
      ).map((rating) =>
        rating.skillId === skill.id ? { ...rating, ...patch } : rating,
      );
      return next;
    });
  }

  async function handleSaveRatingsAndPlan() {
    if (!workspace || !selectedRecommendation) {
      return;
    }

    setBusyLabel("Building your 30-day plan");
    setNotice(null);
    setAnalysis({
      heading: "Turning gaps into action",
      stages: [
        "Reviewing your skill gaps…",
        "Sequencing daily focus…",
        "Sizing each task to your daily minutes…",
        "Writing done-when criteria for every day…",
      ],
      chips: selectedRecommendation.essentialGaps.slice(0, 6),
      grounding:
        "Plan tailored to your selected path and your rated gaps.",
    });
    try {
      const ratings = ensureRatingsForRecommendation(
        selectedRecommendation,
        skillRatings,
      );
      const savedRatings = await requestJson<WorkspacePayload>(
        "/api/skills/ratings",
        {
          method: "POST",
          body: JSON.stringify({
            workspaceId: workspace.workspaceId,
            selectedRoleId: selectedRecommendation.id,
            ratings,
          }),
        },
      );
      hydrateWorkspace(savedRatings.workspace);

      const planPayload = await requestJson<LearningPlanPayload>(
        "/api/learning-plan/generate",
        {
          method: "POST",
          body: JSON.stringify({
            workspaceId: workspace.workspaceId,
            selectedRoleId: selectedRecommendation.id,
          }),
        },
      );
      hydrateWorkspace(planPayload.workspace);
      setStep("plan");
      setNotice({ tone: "success", message: "Your 30-day plan is ready" });
    } catch (error) {
      setNotice(toNotice(error));
    } finally {
      setBusyLabel("");
      setAnalysis(null);
    }
  }

  function updatePlanDay(day: number, patch: Partial<LearningPlanDay>) {
    if (!workspace?.learningPlan) {
      return;
    }

    const nextWorkspace: Workspace = {
      ...workspace,
      currentStep: "plan",
      learningPlan: {
        ...workspace.learningPlan,
        days: workspace.learningPlan.days.map((planDay) =>
          planDay.day === day ? { ...planDay, ...patch } : planDay,
        ),
      },
      updatedAt: new Date().toISOString(),
    };

    void saveWorkspace(nextWorkspace, { silent: true });
  }

  function toggleDayExpanded(day: number) {
    setExpandedDays((current) => ({ ...current, [day]: !current[day] }));
  }

  function goToStep(nextStep: StepKey) {
    const targetIndex = STEP_INDEX[nextStep];
    if (targetIndex <= maxReachedStep) {
      setStep(nextStep);
      setNotice(null);
    }
  }

  function handleReset() {
    if (!workspaceId) return;
    const fresh = createClientWorkspace(workspaceId);
    hydrateWorkspace(fresh);
    setCvText("");
    setLinkedinUrl("");
    setGithubUrl("");
    setAnswers(emptyAnswers);
    setChipSelections(emptyChipSelections);
    setSkillRatings([]);
    setQuestionIndex(0);
    setSelectedRoleId("");
    setShowOptionalSources(false);
    setExpandedDays({});
    setBusyLabel("");
    setAnalysis(null);
    setNotice(null);
    setView("landing");
    try {
      window.localStorage.removeItem(workspaceStorageKey(workspaceId));
    } catch {
      // ignore storage failures — server-side save below is authoritative
    }
    void saveWorkspace(fresh, { silent: true });
  }

  if (view === "landing") {
    return (
      <>
        <LandingPage onStart={() => setView("app")} />
        {analysis ? (
          <AnalysisOverlay
            heading={analysis.heading}
            stages={analysis.stages}
            chips={analysis.chips}
          />
        ) : null}
      </>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Workflow">
        <div className="sidebar__brand">
          <a
            className="sidebar__brand-link"
            href="/"
            aria-label="Career Found — back to landing"
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
              ) {
                return;
              }
              event.preventDefault();
              setView("landing");
              setNotice(null);
            }}
          >
            <BrandLockup />
          </a>
          <span className="sidebar__brand-tag">
            Experience → evidence → action
          </span>
        </div>

        <nav className="step-nav" aria-label="Steps">
          {STEPS.map((item, index) => {
            const isActive = item.key === step;
            const isComplete = index < maxReachedStep;
            const isLocked = index > maxReachedStep;
            const isBusy = Boolean(busyLabel);
            const stateClass = isActive
              ? "is-active"
              : isComplete
                ? "is-complete"
                : isLocked
                  ? "is-locked"
                  : "";
            return (
              <button
                key={item.key}
                className={`step-link ${stateClass}`.trim()}
                type="button"
                aria-current={isActive ? "step" : undefined}
                aria-disabled={isLocked || isBusy || undefined}
                disabled={isBusy && !isActive}
                onClick={() =>
                  isLocked || isBusy ? undefined : goToStep(item.key)
                }
              >
                <span className="step-link__marker" aria-hidden="true">
                  {isComplete ? "✓" : item.short}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar__footer">
          <span>Built at</span>
          <strong>AI Women Hackathon Hamburg</strong>
          <button type="button" onClick={handleReset}>
            Start over
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div className="workspace-header__meta">
            Step {STEP_INDEX[step] + 1} of {STEPS.length}
            <strong>· {stepLabel(step)}</strong>
          </div>
          <h2 className="workspace-header__title">{screenTitle(step)}</h2>
          <p className="workspace-header__sub">{screenLede(step, profile)}</p>
          {busyLabel || notice ? (
            <div className="workspace-header__status">
              {busyLabel ? <span className="busy">{busyLabel}</span> : null}
              {notice ? (
                <span className={`notice ${notice.tone}`}>{notice.message}</span>
              ) : null}
            </div>
          ) : null}
        </header>

        {step === "background" ? renderBackground() : null}
        {step === "profile" ? renderProfile() : null}
        {step === "assessment" ? renderAssessment() : null}
        {step === "roles" ? renderRoles() : null}
        {step === "skills" ? renderSkills() : null}
        {step === "plan" ? renderPlan() : null}
      </section>

      {analysis ? (
        <AnalysisOverlay
          heading={analysis.heading}
          stages={analysis.stages}
          chips={analysis.chips}
          grounding={analysis.grounding}
        />
      ) : null}
    </main>
  );

  function renderBackground() {
    return (
      <div className="experience">
        <div className="experience__value-strip" role="list">
          <strong>3 paths</strong>
          <span aria-hidden="true">•</span>
          <strong>Real evidence</strong>
          <span aria-hidden="true">•</span>
          <strong>Skill gaps</strong>
          <span aria-hidden="true">•</span>
          <strong>30-day plan</strong>
        </div>

        <form className="experience__form" onSubmit={handleBackgroundSubmit}>
          <div className="experience__label">
            <div className="field-heading">
              <strong>Tell us what you've done</strong>
              <small>It doesn't need to sound like a CV.</small>
            </div>
            <textarea
              className="experience__textarea"
              value={cvText}
              onChange={(event) => setCvText(event.target.value)}
              placeholder="Paste your CV, or describe your work history, education, projects, tools, achievements — anything you think is relevant."
            />
            <VoiceInputButton
              onTranscript={(text) =>
                setCvText((current) => appendValue(current, text))
              }
            />
          </div>

          {showOptionalSources ? (
            <div className="experience__optional">
              <div className="field-heading">
                <strong>Optional profile links</strong>
                <small>We'll read what's public if you add these.</small>
              </div>
              <div className="experience__optional-grid">
                <label>
                  <span>LinkedIn URL</span>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(event) => setLinkedinUrl(event.target.value)}
                    placeholder="https://www.linkedin.com/in/..."
                  />
                </label>
                <label>
                  <span>GitHub URL</span>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(event) => setGithubUrl(event.target.value)}
                    placeholder="https://github.com/..."
                  />
                </label>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="experience__optional-toggle"
              onClick={() => setShowOptionalSources(true)}
            >
              + Add LinkedIn or GitHub URL
            </button>
          )}

          <div className="experience__submit-row">
            <div className="experience__submit-copy">
              <strong>What happens next?</strong>
              <span>
                We extract your experience and skills so you can review them
                before any recommendation is made.
              </span>
            </div>
            <button
              className="cta-primary"
              disabled={Boolean(busyLabel)}
              type="submit"
            >
              Analyze my experience
              <span className="cta-arrow" aria-hidden="true">
                →
              </span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  function renderProfile() {
    return (
      <form className="profile-layout" onSubmit={handleProfileSubmit}>
        <div className="profile-callout">
          <strong>AI drafted this from your background.</strong>
          <span>You stay in control — edit anything before continuing.</span>
        </div>

        <div className="profile-grid">
          <div className="profile-field profile-field--span-3">
            <p className="eyebrow">Name</p>
            <input
              value={profile.name}
              onChange={(event) =>
                setProfile({ ...profile, name: event.target.value })
              }
              placeholder="e.g. Sofia"
            />
          </div>
          <div className="profile-field profile-field--span-3">
            <p className="eyebrow">Current role</p>
            <input
              value={profile.currentRole}
              onChange={(event) =>
                setProfile({ ...profile, currentRole: event.target.value })
              }
              placeholder="Customer support, student, operations…"
            />
          </div>
          <div className="profile-field profile-field--span-4">
            <p className="eyebrow">Target location</p>
            <input
              value={profile.targetLocation}
              onChange={(event) =>
                setProfile({ ...profile, targetLocation: event.target.value })
              }
              placeholder="Remote Germany, Berlin, Hamburg…"
            />
          </div>
          <div className="profile-field profile-field--span-2">
            <p className="eyebrow">Daily learning time</p>
            <select
              value={profile.dailyMinutes}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  dailyMinutes: Number(event.target.value) as 15 | 30 | 60,
                })
              }
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
            </select>
          </div>
          <div className="profile-field profile-field--span-6">
            <p className="eyebrow">Experience & skills</p>
            <textarea
              value={profile.background}
              onChange={(event) =>
                setProfile({ ...profile, background: event.target.value })
              }
              placeholder="Work history, education, languages, tools, strengths…"
            />
            <VoiceInputButton
              onTranscript={(text) =>
                setProfile((p) => ({
                  ...p,
                  background: appendValue(p.background, text),
                }))
              }
            />
          </div>
          <div className="profile-field profile-field--span-6">
            <p className="eyebrow">What you want next</p>
            <textarea
              value={profile.goal}
              onChange={(event) =>
                setProfile({ ...profile, goal: event.target.value })
              }
              placeholder="The kind of IT role or working style you want next."
            />
            <VoiceInputButton
              onTranscript={(text) =>
                setProfile((p) => ({ ...p, goal: appendValue(p.goal, text) }))
              }
            />
          </div>
        </div>

        <div className="experience__submit-row">
          <div className="experience__submit-copy">
            <strong>Next</strong>
            <span>Four short questions to refine your fit.</span>
          </div>
          <button
            className="cta-primary"
            disabled={Boolean(busyLabel)}
            type="submit"
          >
            Looks right — continue
            <span className="cta-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </div>
      </form>
    );
  }

  function renderAssessment() {
    const question = assessmentQuestions[questionIndex];

    if (!question) {
      return null;
    }

    return (
      <div className="assessment">
        <div className="assessment__progress">
          <span className="assessment__progress-count">
            {questionIndex + 1} / {assessmentQuestions.length}
          </span>
          <span className="assessment__dots" aria-hidden="true">
            {assessmentQuestions.map((_, index) => (
              <span
                key={index}
                className={
                  index === questionIndex
                    ? "is-active"
                    : index < questionIndex
                      ? "is-done"
                      : ""
                }
              />
            ))}
          </span>
        </div>

        <div key={questionIndex} className="assessment__card">
          <h3 className="assessment__question">{question.title}</h3>
          <p className="assessment__hint">{question.hint}</p>
          <div className="assessment__prompts" role="group" aria-label="Suggestions">
            {question.prompts.map((prompt) => {
              const isSelected =
                chipSelections[question.key]?.includes(prompt) ?? false;
              return (
                <button
                  key={prompt}
                  type="button"
                  aria-pressed={isSelected}
                  className={
                    isSelected
                      ? "assessment__prompt-chip is-selected"
                      : "assessment__prompt-chip"
                  }
                  onClick={() =>
                    setChipSelections((current) => {
                      const existing = current[question.key] ?? [];
                      const next = existing.includes(prompt)
                        ? existing.filter((item) => item !== prompt)
                        : [...existing, prompt];
                      return { ...current, [question.key]: next };
                    })
                  }
                >
                  {prompt}
                </button>
              );
            })}
          </div>
          <textarea
            className="assessment__textarea"
            required
            minLength={8}
            value={answers[question.key]}
            onChange={(event) =>
              setAnswers({ ...answers, [question.key]: event.target.value })
            }
            placeholder={question.placeholder}
          />
          <div className="assessment__actions">
            <VoiceInputButton
              onTranscript={(text) =>
                setAnswers((current) => ({
                  ...current,
                  [question.key]: appendValue(current[question.key], text),
                }))
              }
            />
            <div className="cluster">
              <button
                className="btn-ghost"
                disabled={Boolean(busyLabel) || questionIndex === 0}
                type="button"
                onClick={handleAssessmentBack}
              >
                Back
              </button>
              <button
                className="cta-primary"
                disabled={Boolean(busyLabel)}
                type="button"
                onClick={() => void handleAssessmentNext()}
              >
                {questionIndex === assessmentQuestions.length - 1
                  ? "Reveal my 3 paths"
                  : "Next"}
                <span className="cta-arrow" aria-hidden="true">
                  →
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderRoles() {
    const recommendations = workspace?.recommendations ?? [];

    if (recommendations.length === 0) {
      return (
        <div className="empty-state">
          <p>Answer a few fit questions and we'll reveal your paths here.</p>
          <button type="button" onClick={() => goToStep("assessment")}>
            Continue to questions
          </button>
        </div>
      );
    }

    return (
      <div className="results">
        <div className="results-lead">
          <p className="eyebrow">Your experience, translated into options</p>
          <h2>Three paths worth exploring</h2>
          <p>
            Grounded in a prepared dataset of real job postings.
            {profile.name ? ` ${profile.name}, ` : " "}
            these are directions worth exploring, not qualification guarantees.
          </p>
        </div>

        <div className="results-grid">
          {recommendations.map((recommendation, index) => {
            const sources =
              workspace?.jobDescriptions.filter(
                (source) => source.roleTitle === recommendation.title,
              ) ?? [];
            const tier = matchTier(recommendation.matchScore, index);
            const userText = [
              cvText,
              profile.background,
              profile.goal,
              profile.currentRole,
              answers.preferredWork,
              answers.projectExperience,
              answers.independentContributions,
              answers.careerInterests,
            ]
              .filter(Boolean)
              .join(" ");
            const evidenceMatches = personalizedEvidence(
              recommendation,
              userText,
            );

            return (
              <article className="role-card" key={recommendation.id}>
                <div className="role-card__header">
                  <span className={`role-card__label ${tier.className}`}>
                    {tier.label}
                  </span>
                  <h3 className="role-card__title">{recommendation.title}</h3>
                  <span className="role-card__meta">
                    Based on {sources.length || 5} prepared job descriptions
                  </span>
                </div>

                <div className="role-card__section role-card__section--reason">
                  <span className="role-card__section-title">
                    Why this fits you
                  </span>
                  <p className="role-card__reason">
                    {recommendation.matchingStrengths[0] ??
                      recommendation.summary}
                  </p>
                </div>

                {evidenceMatches.length > 0 ? (
                  <div className="role-card__section">
                    <span className="role-card__section-title">
                      Matched from your background
                    </span>
                    <ChipCluster
                      variant="strength"
                      items={evidenceMatches}
                    />
                  </div>
                ) : null}

                <div className="role-card__section">
                  <span className="role-card__section-title">
                    Your existing strengths
                  </span>
                  <ChipCluster
                    variant="strength"
                    items={recommendation.matchingStrengths.slice(1, 5)}
                  />
                </div>

                <div className="role-card__section">
                  <span className="role-card__section-title">
                    Skills to build
                  </span>
                  <ChipCluster
                    variant="gap"
                    items={recommendation.essentialGaps.slice(0, 4)}
                  />
                </div>

                {recommendation.requirementsNeedingConfirmation.length > 0 ? (
                  <div className="role-card__section">
                    <span className="role-card__section-title">
                      Things to verify
                    </span>
                    <ChipCluster
                      variant="check"
                      items={recommendation.requirementsNeedingConfirmation.slice(
                        0,
                        3,
                      )}
                    />
                  </div>
                ) : null}

                <button
                  className="role-card__cta"
                  type="button"
                  onClick={() => void handleRoleSelect(recommendation)}
                >
                  Explore this path
                  <span className="cta-arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  function renderSkills() {
    if (!selectedRecommendation) {
      return (
        <div className="empty-state">
          <p>Choose a path to see the evidence behind it.</p>
          <button type="button" onClick={() => goToStep("roles")}>
            Open career paths
          </button>
        </div>
      );
    }

    const sources = (workspace?.jobDescriptions ?? []).filter(
      (source) => source.roleTitle === selectedRecommendation.title,
    );

    const strengthsRatings = activeRatings.filter((r) => r.rating >= 3);
    const gapRatings = activeRatings.filter((r) => r.rating <= 1);

    return (
      <div className="skills-layout">
        <div className="skills-hero">
          <div className="skills-hero__left">
            <p className="eyebrow">Your selected path</p>
            <h3 className="skills-hero__title">
              {selectedRecommendation.title}
            </h3>
            <p className="skills-hero__meta">
              {selectedRecommendation.matchingStrengths[0] ??
                selectedRecommendation.summary}
            </p>
            <div>
              <button
                className="btn-secondary"
                type="button"
                onClick={() => goToStep("roles")}
              >
                Change path
              </button>
            </div>
          </div>
          <div className="skills-hero__right">
            <div className="skills-stat">
              <strong>{sources.length || 5}</strong>
              <span>Real job descriptions analyzed</span>
            </div>
            <div className="skills-stat">
              <strong>
                {selectedRecommendation.requirements.essential.length +
                  selectedRecommendation.requirements.preferred.length}
              </strong>
              <span>Recurring skills identified</span>
            </div>
            <div className="skills-stat">
              <strong>{strengthsRatings.length}</strong>
              <span>Strengths you already bring</span>
            </div>
            <div className="skills-stat">
              <strong>{gapRatings.length}</strong>
              <span>Priority gaps to close</span>
            </div>
          </div>
        </div>

        <div className="skills-columns">
          <section className="skills-column">
            <div>
              <h4 className="skills-column__title">What the role requires</h4>
              <p className="skills-column__hint">
                Essential skills the market repeats across job descriptions.
              </p>
            </div>
            {selectedRecommendation.requirements.essential.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                sources={sources}
                totalSources={sources.length || 5}
                ratings={activeRatings}
                onChange={updateRating}
              />
            ))}
          </section>

          <section className="skills-column skills-column--gap">
            <div>
              <h4 className="skills-column__title">Preferred to stand out</h4>
              <p className="skills-column__hint">
                Nice-to-haves — building even one meaningfully lifts your
                positioning.
              </p>
            </div>
            {selectedRecommendation.requirements.preferred.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                sources={sources}
                totalSources={sources.length || 5}
                ratings={activeRatings}
                onChange={updateRating}
              />
            ))}
            {selectedRecommendation.requirements.preferred.length === 0 ? (
              <p className="skills-column__hint">
                No preferred skills stood out this time.
              </p>
            ) : null}
          </section>
        </div>

        <div className="plan-cta-row">
          <div className="plan-cta-row__copy">
            <strong>Ready to act on this?</strong>
            <span>
              Turn your gaps into a {profile.dailyMinutes}-minute daily plan
              across the next 30 days.
            </span>
          </div>
          <button
            className="cta-primary"
            disabled={Boolean(busyLabel)}
            type="button"
            onClick={() => void handleSaveRatingsAndPlan()}
          >
            Build my 30-day plan
            <span className="cta-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </div>
      </div>
    );
  }

  function renderPlan() {
    const plan = workspace?.learningPlan;

    if (!plan) {
      return (
        <div className="empty-state">
          <p>Rate your skills to generate your 30-day plan.</p>
          <button type="button" onClick={() => goToStep("skills")}>
            Open evidence & gaps
          </button>
        </div>
      );
    }

    const ringValue =
      planProgress.total === 0
        ? 0
        : Math.round((planProgress.completed / planProgress.total) * 100);

    return (
      <div className="plan-layout">
        <section className="plan-summary">
          <div>
            <p className="eyebrow">Your direction</p>
            <h3 className="plan-summary__title">{plan.roleTitle}</h3>
            <p className="plan-summary__sub">
              Built around your selected path, skill gaps, and{" "}
              {profile.dailyMinutes} minutes a day. Progress is saved on this
              device.
            </p>
          </div>
          <div
            className="plan-ring"
            style={{ ["--value" as string]: ringValue } as React.CSSProperties}
            role="img"
            aria-label={`${planProgress.completed} of ${planProgress.total} days complete`}
          >
            <div className="plan-ring__inner">
              <strong>
                {planProgress.completed}/{planProgress.total}
              </strong>
              <span>days</span>
            </div>
          </div>
        </section>

        <div className="plan-weeks">
          {WEEK_META.map((week) => {
            const days = plan.days.filter(
              (day) => day.day >= week.range[0] && day.day <= week.range[1],
            );
            const complete = days.filter((day) => day.completed).length;
            return (
              <section className="plan-week" key={week.title}>
                <div className="plan-week__header">
                  <h4 className="plan-week__title">
                    {week.title}
                    <em>{week.tagline}</em>
                  </h4>
                  <span className="plan-week__progress">
                    {complete} / {days.length} complete
                  </span>
                </div>
                <div className="plan-days">
                  {days.map((day) => {
                    const isOpen = expandedDays[day.day] ?? false;
                    return (
                      <article
                        key={day.day}
                        className={day.completed ? "plan-day is-complete" : "plan-day"}
                      >
                        <div className="plan-day__summary">
                          <span className="plan-day__day">
                            {String(day.day).padStart(2, "0")}
                          </span>
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => toggleDayExpanded(day.day)}
                            style={{
                              textAlign: "left",
                              padding: 0,
                              minHeight: "auto",
                              background: "transparent",
                              border: 0,
                              justifySelf: "start",
                            }}
                          >
                            <div className="plan-day__title">{day.title}</div>
                            <div className="plan-day__meta">
                              {day.timeEstimateMinutes} min · {day.expectedOutput}
                            </div>
                          </button>
                          <input
                            className="plan-day__check"
                            type="checkbox"
                            aria-label={`Mark ${day.title} complete`}
                            checked={day.completed}
                            onChange={(event) =>
                              updatePlanDay(day.day, {
                                completed: event.target.checked,
                              })
                            }
                          />
                        </div>
                        {isOpen ? (
                          <div className="plan-day__body">
                            <p className="plan-day__task">{day.task}</p>
                            <div className="plan-day__output">
                              <strong>Output</strong>
                              <span>{day.expectedOutput}</span>
                            </div>
                            {day.doneWhen ? (
                              <div className="plan-day__output">
                                <strong>Done when</strong>
                                <span>{day.doneWhen}</span>
                              </div>
                            ) : null}
                            <div className="plan-day__notes">
                              <textarea
                                aria-label={`Notes for ${day.title}`}
                                rows={2}
                                value={day.notes}
                                onChange={(event) =>
                                  updatePlanDay(day.day, {
                                    notes: event.target.value,
                                  })
                                }
                                placeholder="Add a note or link to your work"
                              />
                              <VoiceInputButton
                                onTranscript={(text) =>
                                  updatePlanDay(day.day, {
                                    notes: appendValue(day.notes, text),
                                  })
                                }
                              />
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    );
  }
}

/* ---------- Landing ---------- */

function LandingPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="landing">
      <header className="landing-topbar">
        <BrandLockup />
        <div className="landing-topbar__meta">
          Built at AI Women Hackathon Hamburg
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero__copy">
          <span className="landing-eyebrow">A new way to find your fit</span>
          <h1 className="landing-hero__title">
            Not sure which <em>IT role</em> fits your experience?
          </h1>
          <p className="landing-hero__lede">
            Career Found turns what you already know into realistic IT career
            paths. AI reads your background, compares it to real job
            requirements, and shows you what to do next.
          </p>
          <div className="landing-hero__actions">
            <button className="cta-primary" type="button" onClick={onStart}>
              Find my career path
              <span className="cta-arrow" aria-hidden="true">
                →
              </span>
            </button>
            <span className="cta-meta">Takes about 5 minutes</span>
          </div>
          <div className="landing-promises" role="list">
            <span>3 realistic career paths</span>
            <span>Real job evidence</span>
            <span>Personalized 30-day plan</span>
          </div>
        </div>

        <HeroVisual />
      </section>

      <section className="landing-section landing-section--divider">
        <div className="section-lede">
          <p className="eyebrow">The transformation</p>
          <h2>Messy experience becomes a clear direction.</h2>
        </div>
        <div className="journey" role="list">
          <div className="journey-step">
            <span className="journey-step__num">01</span>
            <span className="journey-step__title">Your experience</span>
            <span className="journey-step__meta">
              Work, education, projects, tools.
            </span>
          </div>
          <div className="journey-step journey-step--center">
            <span className="journey-step__num">02</span>
            <span className="journey-step__title">AI analysis</span>
            <span className="journey-step__meta">
              Extracts skills, patterns, and signals.
            </span>
          </div>
          <div className="journey-step">
            <span className="journey-step__num">03</span>
            <span className="journey-step__title">Real job evidence</span>
            <span className="journey-step__meta">
              Compared against real job requirements.
            </span>
          </div>
          <div className="journey-step">
            <span className="journey-step__num">04</span>
            <span className="journey-step__title">Career direction</span>
            <span className="journey-step__meta">
              Three paths that actually fit you.
            </span>
          </div>
          <div className="journey-step">
            <span className="journey-step__num">05</span>
            <span className="journey-step__title">30-day plan</span>
            <span className="journey-step__meta">
              Concrete, daily action for the next month.
            </span>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--divider">
        <div className="section-lede">
          <p className="eyebrow">How it works</p>
          <h2>Four steps, roughly five minutes.</h2>
        </div>
        <div className="how">
          <div className="how-item">
            <span className="how-num">01</span>
            <span className="how-title">Tell us what you've done</span>
            <p className="how-copy">
              Work, education, projects, tools and skills — however messy.
            </p>
          </div>
          <div className="how-item">
            <span className="how-num">02</span>
            <span className="how-title">Discover where you fit</span>
            <p className="how-copy">
              AI compares your experience with real job requirements.
            </p>
          </div>
          <div className="how-item">
            <span className="how-num">03</span>
            <span className="how-title">See the evidence</span>
            <p className="how-copy">
              Understand why a role fits and which skills matter.
            </p>
          </div>
          <div className="how-item">
            <span className="how-num">04</span>
            <span className="how-title">Take action</span>
            <p className="how-copy">
              Get a personalized 30-day plan you can start today.
            </p>
          </div>
        </div>
      </section>

      <div className="landing-trust">
        <span>
          <span className="landing-trust__dot" aria-hidden="true" />
          Recommendations are grounded in a prepared dataset of real job
          postings. Directions to explore, not qualification guarantees.
        </span>
        <button className="cta-primary" type="button" onClick={onStart}>
          Find my career path
          <span className="cta-arrow" aria-hidden="true">
            →
          </span>
        </button>
      </div>
    </div>
  );
}

function BrandLockup() {
  return (
    <div className="brand-lockup">
      <span className="brand-glyph" aria-hidden="true">
        cf
      </span>
      <span className="sidebar__brand-title">Career Found</span>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="hero-visual__grid" />
      <svg className="hero-lines" viewBox="0 0 400 380" preserveAspectRatio="none">
        <path d="M60 60 C 130 90, 170 160, 200 200" />
        <path d="M60 200 C 130 200, 170 200, 200 200" />
        <path d="M60 320 C 130 300, 170 240, 200 200" />
        <path d="M200 200 C 250 180, 300 100, 360 70" />
        <path d="M200 200 C 260 200, 320 200, 360 200" />
        <path d="M200 200 C 260 240, 320 300, 360 330" />
      </svg>

      <span className="hero-chip hero-chip--1">Customer support</span>
      <span className="hero-chip hero-chip--2">Python</span>
      <span className="hero-chip hero-chip--3">Project coordination</span>
      <span className="hero-chip hero-chip--4">SQL</span>
      <span className="hero-chip hero-chip--5">Teaching</span>
      <span className="hero-chip hero-chip--6">Operations</span>

      <div className="hero-node">
        <span>Career Found</span>
        <small>AI analysis</small>
      </div>

      <div className="hero-cards">
        <div className="hero-card hero-card--1">
          <div className="hero-card__label">Strong direction</div>
          <div className="hero-card__title">QA Engineer</div>
          <div className="hero-card__meta">5 job descriptions matched</div>
        </div>
        <div className="hero-card hero-card--2">
          <div className="hero-card__label">Worth exploring</div>
          <div className="hero-card__title">IT Support Specialist</div>
          <div className="hero-card__meta">5 job descriptions matched</div>
        </div>
        <div className="hero-card hero-card--3">
          <div className="hero-card__label">Stretch direction</div>
          <div className="hero-card__title">Junior Backend Dev</div>
          <div className="hero-card__meta">5 job descriptions matched</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Analysis overlay ---------- */

function AnalysisOverlay({
  heading,
  stages,
  chips,
  grounding,
}: {
  heading: string;
  stages: string[];
  chips: string[];
  grounding?: string;
}) {
  const [stageIndex, setStageIndex] = useState(0);
  const [visibleChips, setVisibleChips] = useState<string[]>([]);

  useEffect(() => {
    setStageIndex(0);
    const stageInterval = window.setInterval(() => {
      setStageIndex((current) =>
        current < stages.length - 1 ? current + 1 : current,
      );
    }, 1100);
    return () => window.clearInterval(stageInterval);
  }, [stages]);

  useEffect(() => {
    setVisibleChips([]);
    if (chips.length === 0) return;
    const chipInterval = window.setInterval(() => {
      setVisibleChips((current) => {
        if (current.length >= chips.length) {
          return current;
        }
        return chips.slice(0, current.length + 1);
      });
    }, 260);
    return () => window.clearInterval(chipInterval);
  }, [chips]);

  return (
    <div className="analysis-overlay" role="status" aria-live="polite">
      <div className="analysis-card">
        <div className="analysis-card__glow" aria-hidden="true">
          <span>cf</span>
        </div>
        <h3>{heading}</h3>
        <div className="analysis-card__stage" key={stageIndex}>
          {stages[stageIndex]}
        </div>
        <div className="analysis-card__chips" aria-hidden="true">
          {visibleChips.map((chip, index) => (
            <span
              key={`${chip}-${index}`}
              className="analysis-chip"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {chip}
            </span>
          ))}
        </div>
        <div className="analysis-card__bar" aria-hidden="true">
          <span />
        </div>
        {grounding ? (
          <p className="analysis-card__grounding">{grounding}</p>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- Chip cluster ---------- */

function ChipCluster({
  items,
  variant,
}: {
  items: string[];
  variant: "strength" | "gap" | "check";
}) {
  if (items.length === 0) {
    return <span className="chip chip--check">—</span>;
  }
  return (
    <div className="chip-cluster">
      {items.map((item) => (
        <span key={item} className={`chip chip--${variant}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

/* ---------- Skill card ---------- */

function SkillCard({
  skill,
  sources,
  totalSources,
  ratings,
  onChange,
}: {
  skill: SkillRequirement;
  sources: JobDescriptionSource[];
  totalSources: number;
  ratings: SkillRating[];
  onChange: (skill: SkillRequirement, patch: Partial<SkillRating>) => void;
}) {
  const rating = ratings.find((item) => item.skillId === skill.id) ?? {
    skillId: skill.id,
    skillName: skill.name,
    rating: 0,
    evidence: "",
  };
  const evidenceSources = sources.filter((source) =>
    skill.sourceIds.includes(source.id),
  );

  return (
    <div className="skill-item">
      <div className="skill-item__head">
        <span className="skill-item__name">{skill.name}</span>
        <span className="skill-item__badges">
          <span className={`badge badge--${skill.category}`}>
            {skill.category === "essential" ? "Essential" : "Preferred"}
          </span>
          <span className="badge badge--freq">
            {skill.sourceCount} of {totalSources || 5} jobs
          </span>
        </span>
      </div>
      <p className="skill-item__evidence">{skill.evidence}</p>
      {evidenceSources.length > 0 ? (
        <ul className="skill-item__sources" aria-label={`${skill.name} sources`}>
          {evidenceSources.slice(0, 2).map((source) => (
            <li key={source.id}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.company || source.title} ↗
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="skill-item__rating" role="radiogroup" aria-label={`Rate ${skill.name}`}>
        {RATING_CHOICES.map((choice) => (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={rating.rating === choice.value}
            className={`rating-choice ${rating.rating === choice.value ? "is-selected" : ""}`.trim()}
            onClick={() => onChange(skill, { rating: choice.value })}
          >
            {choice.label}
            <small>{choice.meta}</small>
          </button>
        ))}
      </div>
      <input
        className="skill-item__evidence-input"
        aria-label={`${skill.name} experience`}
        value={rating.evidence}
        onChange={(event) =>
          onChange(skill, { evidence: event.target.value })
        }
        placeholder="Optional: an example from your experience"
      />
    </div>
  );
}

/* ---------- Voice input ---------- */

type DictationState = "idle" | "recording" | "transcribing" | "error";

function useVoiceDictation(onTranscript: (text: string) => void) {
  const [state, setState] = useState<DictationState>("idle");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickSupportedMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        void handleStop(stream, recorder.mimeType || "audio/webm");
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setState("recording");
    } catch {
      setError("Microphone access was denied or unavailable.");
      setState("error");
    }
  }

  function stop() {
    mediaRecorderRef.current?.stop();
  }

  async function handleStop(stream: MediaStream, mimeType: string) {
    stream.getTracks().forEach((track) => track.stop());
    setState("transcribing");
    try {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      const response = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: form,
      });
      const body = (await response.json()) as { text?: string; error?: string };
      if (!response.ok || !body.text) {
        setError(body.error ?? "Could not transcribe audio.");
        setState("error");
        return;
      }
      onTranscript(body.text);
      setState("idle");
    } catch {
      setError("Network error while transcribing.");
      setState("error");
    }
  }

  return { state, error, start, stop };
}

function pickSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }
  const candidates = ["audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function VoiceInputButton({
  onTranscript,
}: {
  onTranscript: (text: string) => void;
}) {
  const { state, error, start, stop } = useVoiceDictation(onTranscript);

  return (
    <span className="voice-input">
      <button
        className="voice-button"
        type="button"
        disabled={state === "transcribing"}
        aria-pressed={state === "recording"}
        onClick={() => (state === "recording" ? stop() : void start())}
      >
        {state === "recording"
          ? "Stop"
          : state === "transcribing"
            ? "Transcribing…"
            : "🎤 Dictate"}
      </button>
      {error ? <small className="voice-error">{error}</small> : null}
    </span>
  );
}

/* ---------- Helpers ---------- */

function appendValue(current: string, addition: string) {
  return current ? `${current} ${addition}`.trim() : addition;
}

function ensureRatingsForRecommendation(
  recommendation: RoleRecommendation | undefined,
  current: SkillRating[],
) {
  if (!recommendation) {
    return current;
  }

  const skills = [
    ...recommendation.requirements.essential,
    ...recommendation.requirements.preferred,
  ];

  return skills.map((skill) => {
    return (
      current.find((rating) => rating.skillId === skill.id) ?? {
        skillId: skill.id,
        skillName: skill.name,
        rating: 0,
        evidence: "",
      }
    );
  });
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const payload = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }

  return payload as T;
}

function createClientWorkspace(workspaceId: string): Workspace {
  return {
    workspaceId,
    currentStep: "background",
    jobDescriptions: [],
    recommendations: [],
    skillRatings: [],
    updatedAt: new Date().toISOString(),
  };
}

function createBrowserId(prefix: string) {
  const id =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${id}`;
}

function cacheWorkspace(workspace: Workspace) {
  window.localStorage.setItem(
    workspaceStorageKey(workspace.workspaceId),
    JSON.stringify(workspace),
  );
}

function readCachedWorkspace(workspaceId: string) {
  const cached = window.localStorage.getItem(workspaceStorageKey(workspaceId));

  if (!cached) {
    return null;
  }

  try {
    return JSON.parse(cached) as Workspace;
  } catch {
    return null;
  }
}

function workspaceStorageKey(workspaceId: string) {
  return `career-found-workspace:${workspaceId}`;
}

function hasProgress(workspace: Workspace) {
  return Boolean(
    workspace.background ||
      workspace.profile ||
      workspace.assessment ||
      workspace.recommendations.length > 0 ||
      workspace.learningPlan,
  );
}

function toNotice(error: unknown): Notice {
  return {
    tone: "error",
    message: error instanceof Error ? error.message : "Something went wrong",
  };
}

function stepLabel(step: StepKey) {
  return STEPS.find((item) => item.key === step)?.label ?? "Workspace";
}

function screenTitle(step: StepKey) {
  switch (step) {
    case "background":
      return "Tell us what you've done.";
    case "profile":
      return "Review your profile.";
    case "assessment":
      return "Four questions to refine your fit.";
    case "roles":
      return "Three paths worth exploring.";
    case "skills":
      return "Your path, backed by market evidence.";
    case "plan":
      return "Your 30-day action plan.";
  }
}

function screenLede(step: StepKey, profile: Profile) {
  switch (step) {
    case "background":
      return "It doesn't need to sound like a CV — messy is fine. We'll extract the structure.";
    case "profile":
      return "AI drafted this from your background. Edit anything before continuing.";
    case "assessment":
      return "Short answers work. Each one sharpens your recommendations.";
    case "roles":
      return profile.name
        ? `${profile.name}, three realistic directions grounded in real job requirements.`
        : "Three realistic directions grounded in real job requirements.";
    case "skills":
      return "Each requirement below is repeated across the prepared job descriptions for this role.";
    case "plan":
      return "A focused roadmap from your gaps to portfolio evidence — one day at a time.";
  }
}

function personalizedEvidence(
  recommendation: RoleRecommendation,
  userText: string,
): string[] {
  if (!userText) return [];
  const haystack = userText.toLowerCase();
  const seen = new Set<string>();
  const matches: string[] = [];
  const candidates = [
    ...recommendation.requirements.essential,
    ...recommendation.requirements.preferred,
  ];
  for (const requirement of candidates) {
    const key = requirement.name.toLowerCase();
    if (seen.has(key)) continue;
    if (haystack.includes(key)) {
      seen.add(key);
      matches.push(requirement.name);
    }
    if (matches.length >= 4) break;
  }
  return matches;
}

function matchTier(score: number, index: number) {
  if (score >= 78 || index === 0) {
    return {
      label: "Strong direction",
      className: "role-card__label--strong",
    };
  }
  if (score >= 60 || index === 1) {
    return {
      label: "Worth exploring",
      className: "role-card__label--explore",
    };
  }
  return {
    label: "Stretch direction",
    className: "role-card__label--stretch",
  };
}

const CHIP_STOPWORDS = new Set([
  "and",
  "the",
  "with",
  "have",
  "from",
  "that",
  "this",
  "for",
  "into",
  "over",
  "under",
  "about",
  "your",
  "you",
  "our",
  "their",
  "they",
  "them",
  "what",
  "when",
  "where",
  "which",
  "while",
  "would",
  "should",
  "could",
  "were",
  "been",
  "being",
  "make",
  "made",
  "using",
  "used",
  "also",
  "some",
  "such",
  "very",
  "just",
  "into",
  "role",
  "team",
  "will",
  "want",
  "like",
]);

function extractChips(source: string) {
  const seen = new Set<string>();
  const chips: string[] = [];
  const words = source.match(/[A-Za-zÄÖÜäöüß+#.]{4,}/g) ?? [];
  for (const raw of words) {
    const word = raw.trim();
    const key = word.toLowerCase();
    if (CHIP_STOPWORDS.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    chips.push(word);
    if (chips.length >= 12) break;
  }
  return chips;
}
