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

const steps: { key: StepKey; label: string }[] = [
  { key: "background", label: "Experience" },
  { key: "profile", label: "Profile" },
  { key: "assessment", label: "Fit questions" },
  { key: "roles", label: "Career paths" },
  { key: "skills", label: "Evidence & gaps" },
  { key: "plan", label: "30-day plan" },
];

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

const assessmentQuestions: {
  key: keyof AssessmentAnswers;
  label: string;
  placeholder: string;
}[] = [
  {
    key: "preferredWork",
    label: "Preferred work",
    placeholder: "Interfaces, data, testing, support, systems",
  },
  {
    key: "projectExperience",
    label: "Project experience",
    placeholder: "What you have built, shipped, analyzed, or improved",
  },
  {
    key: "independentContributions",
    label: "Independent contributions",
    placeholder: "Decisions, ownership, fixes, research, documentation",
  },
  {
    key: "careerInterests",
    label: "Career interests",
    placeholder: "What you want to learn and the work you want to avoid",
  },
];

const ratingLabels = [
  "Not yet",
  "Aware",
  "Practiced",
  "Project use",
  "Ready",
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
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [skillRatings, setSkillRatings] = useState<SkillRating[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [busyLabel, setBusyLabel] = useState("");

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

    setBusyLabel("Analyzing background");
    setNotice(null);
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

    if (answers[question.key].trim().length < 8) {
      setNotice({
        tone: "error",
        message: "Add a bit more detail before continuing (at least 8 characters).",
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

    setBusyLabel("Submitting assessment");
    setNotice(null);
    try {
      const assessmentPayload = await requestJson<AssessmentPayload>(
        "/api/assessment",
        {
          method: "POST",
          body: JSON.stringify({ workspaceId, answers }),
        },
      );
      hydrateWorkspace(assessmentPayload.workspace);

      setBusyLabel("Inferring candidate roles");
      const rolesPayload = await requestJson<RolesInferPayload>(
        "/api/roles/infer",
        {
          method: "POST",
          body: JSON.stringify({ workspaceId }),
        },
      );
      hydrateWorkspace(rolesPayload.workspace);

      setBusyLabel("Sourcing job descriptions");
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

      setBusyLabel("Generating recommendations");
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
        message: "Recommendations are ready",
      });
    } catch (error) {
      setNotice(toNotice(error));
    } finally {
      setBusyLabel("");
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

    setBusyLabel("Saving skill ratings");
    setNotice(null);
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

      setBusyLabel("Generating learning plan");
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
      setNotice({ tone: "success", message: "Learning plan created" });
    } catch (error) {
      setNotice(toNotice(error));
    } finally {
      setBusyLabel("");
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

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Workflow">
        <div className="brand-block">
          <p className="brand-kicker">200</p>
          <h1>Career Found</h1>
          <p>Experience → evidence → action</p>
        </div>

        <nav className="step-nav">
          {steps.map((item, index) => (
            <button
              key={item.key}
              className={item.key === step ? "step-link active" : "step-link"}
              type="button"
              onClick={() => setStep(item.key)}
            >
              <span>{index + 1}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hackathon-mark">
          <span>Built at</span>
          <strong>AI Women Hackathon Hamburg</strong>
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">
              Step {steps.findIndex((item) => item.key === step) + 1} of{" "}
              {steps.length} · {stepLabel(step)}
            </p>
            <h2>{screenTitle(step)}</h2>
          </div>
          <div className="header-status">
            {busyLabel ? <span className="busy">{busyLabel}</span> : null}
            {notice ? (
              <span className={`notice ${notice.tone}`}>{notice.message}</span>
            ) : null}
          </div>
        </header>

        {step === "background" ? renderBackground() : null}
        {step === "profile" ? renderProfile() : null}
        {step === "assessment" ? renderAssessment() : null}
        {step === "roles" ? renderRoles() : null}
        {step === "skills" ? renderSkills() : null}
        {step === "plan" ? renderPlan() : null}
      </section>
    </main>
  );

  function renderBackground() {
    return (
      <div className="landing-layout">
        <section className="landing-promise">
          <p className="value-proposition">
            Get 3 realistic career paths, evidence-backed skill gaps, and a
            personalized 30-day plan.
          </p>
          <div className="value-points" aria-label="What Career Found delivers">
            <div>
              <strong>3</strong>
              <span>career paths</span>
            </div>
            <div>
              <strong>5</strong>
              <span>jobs per path</span>
            </div>
            <div>
              <strong>Real</strong>
              <span>skill evidence</span>
            </div>
            <div>
              <strong>30 days</strong>
              <span>to take action</span>
            </div>
          </div>
          <div className="journey-strip" aria-label="Career Found journey">
            <span>Your experience</span>
            <b aria-hidden="true">→</b>
            <span>Career direction</span>
            <b aria-hidden="true">→</b>
            <span>Real job evidence</span>
            <b aria-hidden="true">→</b>
            <span>Action plan</span>
          </div>
        </section>

        <form
          className="panel form-grid landing-form"
          onSubmit={handleBackgroundSubmit}
        >
          <div className="wide form-intro">
            <p className="eyebrow">Start with what you already know</p>
            <h3>Tell us about your experience</h3>
          </div>
          <label className="wide">
            Resume / experience
            <textarea
              className="large-text"
              value={cvText}
              onChange={(event) => setCvText(event.target.value)}
              placeholder="Paste or dictate your resume, work history, education, tools, and achievements"
            />
            <VoiceInputButton
              onTranscript={(text) =>
                setCvText((current) => appendValue(current, text))
              }
            />
          </label>
          <div className="wide optional-divider">
            <span>Optional profiles</span>
          </div>
          <label>
            LinkedIn profile URL
            <input
              type="url"
              value={linkedinUrl}
              onChange={(event) => setLinkedinUrl(event.target.value)}
              placeholder="https://www.linkedin.com/in/..."
            />
          </label>
          <label>
            GitHub profile URL
            <input
              type="url"
              value={githubUrl}
              onChange={(event) => setGithubUrl(event.target.value)}
              placeholder="https://github.com/..."
            />
          </label>
          <div className="actions wide">
            <div className="next-step-copy">
              <strong>Next</strong>
              <span>Review the profile we extract</span>
            </div>
            <button
              className="primary-action"
              disabled={Boolean(busyLabel)}
              type="submit"
            >
              Analyze my experience
            </button>
          </div>
        </form>
      </div>
    );
  }

  function renderProfile() {
    return (
      <form className="panel form-grid" onSubmit={handleProfileSubmit}>
        <p className="wide hint">
          We drafted this from your background. Edit anything before continuing.
        </p>
        <label>
          Name
          <input
            value={profile.name}
            onChange={(event) =>
              setProfile({ ...profile, name: event.target.value })
            }
            placeholder="Sofia"
          />
          <VoiceInputButton
            onTranscript={(text) =>
              setProfile((p) => ({ ...p, name: appendValue(p.name, text) }))
            }
          />
        </label>
        <label>
          Current role
          <input
            value={profile.currentRole}
            onChange={(event) =>
              setProfile({ ...profile, currentRole: event.target.value })
            }
            placeholder="Customer support, student, operations"
          />
          <VoiceInputButton
            onTranscript={(text) =>
              setProfile((p) => ({
                ...p,
                currentRole: appendValue(p.currentRole, text),
              }))
            }
          />
        </label>
        <label>
          Target location
          <input
            value={profile.targetLocation}
            onChange={(event) =>
              setProfile({ ...profile, targetLocation: event.target.value })
            }
            placeholder="Remote Germany, Berlin, Hamburg, Munich, Frankfurt"
          />
          <VoiceInputButton
            onTranscript={(text) =>
              setProfile((p) => ({
                ...p,
                targetLocation: appendValue(p.targetLocation, text),
              }))
            }
          />
        </label>
        <label>
          Learning time
          <select
            value={profile.dailyMinutes}
            onChange={(event) =>
              setProfile({
                ...profile,
                dailyMinutes: Number(event.target.value) as 15 | 30 | 60,
              })
            }
          >
            <option value={15}>15 minutes/day</option>
            <option value={30}>30 minutes/day</option>
            <option value={60}>60 minutes/day</option>
          </select>
        </label>
        <label className="wide">
          Background
          <textarea
            value={profile.background}
            onChange={(event) =>
              setProfile({ ...profile, background: event.target.value })
            }
            placeholder="Work history, education, languages, tools, strengths"
          />
          <VoiceInputButton
            onTranscript={(text) =>
              setProfile((p) => ({
                ...p,
                background: appendValue(p.background, text),
              }))
            }
          />
        </label>
        <label className="wide">
          Goal
          <textarea
            value={profile.goal}
            onChange={(event) =>
              setProfile({ ...profile, goal: event.target.value })
            }
            placeholder="The kind of IT role or working style you want next"
          />
          <VoiceInputButton
            onTranscript={(text) =>
              setProfile((p) => ({ ...p, goal: appendValue(p.goal, text) }))
            }
          />
        </label>
        <div className="actions wide">
          <button disabled={Boolean(busyLabel)} type="submit">
            Continue to fit questions
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
      <div className="panel assessment-conversation">
        <p className="eyebrow">
          Question {questionIndex + 1} of {assessmentQuestions.length}
        </p>
        <label className="wide">
          {question.label}
          <textarea
            className="large-text"
            required
            minLength={8}
            value={answers[question.key]}
            onChange={(event) =>
              setAnswers({ ...answers, [question.key]: event.target.value })
            }
            placeholder={question.placeholder}
          />
          <VoiceInputButton
            onTranscript={(text) =>
              setAnswers((current) => ({
                ...current,
                [question.key]: appendValue(current[question.key], text),
              }))
            }
          />
        </label>
        <div className="actions wide">
          <button
            className="button-secondary"
            disabled={Boolean(busyLabel) || questionIndex === 0}
            type="button"
            onClick={handleAssessmentBack}
          >
            Back
          </button>
          <button
            disabled={Boolean(busyLabel)}
            type="button"
            onClick={() => void handleAssessmentNext()}
          >
            {questionIndex === assessmentQuestions.length - 1
              ? "See my 3 career paths"
              : "Next question"}
          </button>
        </div>
      </div>
    );
  }

  function renderRoles() {
    const recommendations = workspace?.recommendations ?? [];

    if (recommendations.length === 0) {
      return (
        <div className="panel empty-state">
          <p>Submit the assessment to generate suggested roles.</p>
          <button type="button" onClick={() => setStep("assessment")}>
            Open assessment
          </button>
        </div>
      );
    }

    return (
      <div className="roles-layout">
        <section className="result-context">
          <div>
            <p className="eyebrow">Your experience, translated into options</p>
            <h3>
              {profile.name
                ? `${profile.name}, compare your 3 realistic directions.`
                : "Compare your 3 realistic directions."}
            </h3>
          </div>
          <p>
            Each path connects your background to recurring requirements from
            five job descriptions.
          </p>
        </section>

        <div className="role-grid">
          {recommendations.map((recommendation) => {
            const sources =
              workspace?.jobDescriptions.filter(
                (source) => source.roleTitle === recommendation.title,
              ) ?? [];

            return (
              <article className="role-card" key={recommendation.id}>
                <div className="role-card-header">
                  <div>
                    <p className="eyebrow">
                      Based on {sources.length} job descriptions
                    </p>
                    <h3>{recommendation.title}</h3>
                  </div>
                  <div className="match-score">
                    <span>Experience match</span>
                    <strong>{recommendation.matchScore}%</strong>
                  </div>
                </div>
                <div className="role-fit-summary">
                  <span>Why it fits you</span>
                  <p>
                    {recommendation.matchingStrengths[0] ??
                      recommendation.summary}
                  </p>
                </div>
                <ListBlock
                  title="Your existing strengths"
                  items={recommendation.matchingStrengths.slice(1)}
                />
                <ListBlock
                  title="Skills to build"
                  items={recommendation.essentialGaps}
                />
                <ListBlock
                  title="Check before choosing"
                  items={recommendation.requirementsNeedingConfirmation}
                />
                <button
                  className="role-card-action"
                  type="button"
                  onClick={() => void handleRoleSelect(recommendation)}
                >
                  Choose this path
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
        <div className="panel empty-state">
          <p>Select a role to assess skills.</p>
          <button type="button" onClick={() => setStep("roles")}>
            Open roles
          </button>
        </div>
      );
    }

    const sources = (workspace?.jobDescriptions ?? []).filter(
      (source) => source.roleTitle === selectedRecommendation.title,
    );

    return (
      <div className="skills-layout">
        <section className="selected-path-summary">
          <div className="selected-path-heading">
            <div>
              <p className="eyebrow">Your selected path</p>
              <h3>{selectedRecommendation.title}</h3>
            </div>
            <div className="selected-path-actions">
              <div className="match-score">
                <span>Experience match</span>
                <strong>{selectedRecommendation.matchScore}%</strong>
              </div>
              <button
                className="button-secondary"
                type="button"
                onClick={() => setStep("roles")}
              >
                Change path
              </button>
            </div>
          </div>

          <div className="path-summary-grid">
            <article className="path-proof-card why-fit-card">
              <p className="eyebrow">Why it fits</p>
              <p>
                {selectedRecommendation.matchingStrengths[0] ??
                  selectedRecommendation.summary}
              </p>
            </article>
            <article className="path-proof-card market-proof-card">
              <p className="eyebrow">Market evidence</p>
              <strong>{sources.length} job descriptions analyzed</strong>
              <span>Linked sources below</span>
            </article>
            <div className="path-proof-card">
              <ListBlock
                title="Your existing strengths"
                items={selectedRecommendation.matchingStrengths.slice(1)}
              />
            </div>
            <div className="path-proof-card gaps-card">
              <ListBlock
                title="Your main gaps"
                items={selectedRecommendation.essentialGaps}
              />
            </div>
          </div>
        </section>

        <section className="panel evidence-panel">
          <div className="market-evidence">
            <div>
              <p className="eyebrow">Market evidence</p>
              <strong>Requirements repeated across real job descriptions</strong>
            </div>
            <p>
              These are not generic AI suggestions. Every frequency below is
              connected to the linked job sources where it appeared.
            </p>
          </div>

          <div
            className="evidence-flow"
            aria-label="How skill gaps are calculated"
          >
            <span>Real jobs</span>
            <b aria-hidden="true">→</b>
            <span>Recurring skills</span>
            <b aria-hidden="true">→</b>
            <span>Your current level</span>
            <b aria-hidden="true">→</b>
            <span>Your gap</span>
          </div>

          <SkillSection
            sources={sources}
            requirements={selectedRecommendation.requirements.essential}
            ratings={activeRatings}
            title="Essential skills"
            onChange={updateRating}
          />
          <SkillSection
            sources={sources}
            requirements={selectedRecommendation.requirements.preferred}
            ratings={activeRatings}
            title="Preferred skills"
            onChange={updateRating}
          />

          <div className="actions plan-cta-row">
            <div className="next-step-copy">
              <strong>Next</strong>
              <span>
                Turn your gaps into a {profile.dailyMinutes}-minute daily plan
              </span>
            </div>
            <button
              className="primary-action"
              disabled={Boolean(busyLabel)}
              type="button"
              onClick={() => void handleSaveRatingsAndPlan()}
            >
              Build my 30-day plan
            </button>
          </div>
        </section>
      </div>
    );
  }

  function renderPlan() {
    const plan = workspace?.learningPlan;

    if (!plan) {
      return (
        <div className="panel empty-state">
          <p>Complete the skills assessment to create a 30-day plan.</p>
          <button type="button" onClick={() => setStep("skills")}>
            Open skills
          </button>
        </div>
      );
    }

    return (
      <div className="plan-layout">
        <section className="panel plan-summary">
          <div className="plan-summary-heading">
            <div>
              <p className="eyebrow">Your career direction</p>
              <h3>{plan.roleTitle}</h3>
            </div>
            <div className="plan-commitment">
              <strong>{profile.dailyMinutes} min</strong>
              <span>per day</span>
            </div>
          </div>
          <div className="plan-progress-copy">
            <strong>
              {planProgress.completed} of {planProgress.total} days complete
            </strong>
            <span>
              Your focused roadmap from skill gaps to portfolio evidence.
            </span>
          </div>
          <progress max={planProgress.total} value={planProgress.completed} />
        </section>

        <section className="plan-list">
          {plan.days.map((day) => (
            <article
              className={day.completed ? "plan-day completed" : "plan-day"}
              key={day.day}
            >
              <label className="check-row">
                <input
                  checked={day.completed}
                  type="checkbox"
                  onChange={(event) =>
                    updatePlanDay(day.day, { completed: event.target.checked })
                  }
                />
                <span>{day.title}</span>
              </label>
              <p>{day.task}</p>
              <div className="plan-meta">
                <span className="duration-chip">
                  {day.timeEstimateMinutes} min
                </span>
                <span>
                  <strong>Output:</strong> {day.expectedOutput}
                </span>
              </div>
              <div className="plan-notes-row">
                <textarea
                  aria-label={`Notes for ${day.title}`}
                  className="plan-notes"
                  rows={2}
                  value={day.notes}
                  onChange={(event) =>
                    updatePlanDay(day.day, { notes: event.target.value })
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
            </article>
          ))}
        </section>
      </div>
    );
  }
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="list-block">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function SkillSection({
  title,
  sources,
  requirements,
  ratings,
  onChange,
}: {
  title: string;
  sources: JobDescriptionSource[];
  requirements: SkillRequirement[];
  ratings: SkillRating[];
  onChange: (skill: SkillRequirement, patch: Partial<SkillRating>) => void;
}) {
  return (
    <section className="skill-section">
      <div className="skill-section-heading">
        <h4>{title}</h4>
        <span>Rate your level and add an example if you have one.</span>
      </div>
      <div className="skill-list">
        {requirements.map((skill) => {
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
            <div className="skill-row" key={skill.id}>
              <div className="skill-details">
                <div className="skill-heading">
                  <strong>{skill.name}</strong>
                  <span className={`skill-category ${skill.category}`}>
                    {skill.category === "essential" ? "Essential" : "Preferred"}
                  </span>
                  <span className="source-count">
                    Found in {skill.sourceCount} of {sources.length || 5} jobs
                  </span>
                </div>
                <p>{skill.evidence}</p>
                <ul className="evidence-links" aria-label={`${skill.name} sources`}>
                  {evidenceSources.slice(0, 2).map((source) => (
                    <li key={source.id}>
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.company} · {source.title} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="skill-rating-controls">
                <label className="level-field">
                  <span>Your current level</span>
                  <select
                    aria-label={`Rate your ${skill.name} skill`}
                    value={rating.rating}
                    onChange={(event) =>
                      onChange(skill, { rating: Number(event.target.value) })
                    }
                  >
                    {ratingLabels.map((label, index) => (
                      <option key={label} value={index}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="experience-field">
                  <span>Evidence from your experience</span>
                  <input
                    aria-label={`${skill.name} experience`}
                    value={rating.evidence}
                    onChange={(event) =>
                      onChange(skill, { evidence: event.target.value })
                    }
                    placeholder="Optional example"
                  />
                </label>
                <VoiceInputButton
                  onTranscript={(text) =>
                    onChange(skill, {
                      evidence: appendValue(rating.evidence, text),
                    })
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Records a short clip and posts it to /api/voice/transcribe (ElevenLabs STT).
 * Typing remains the fallback path whenever recording/transcription fails.
 */
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
  return steps.find((item) => item.key === step)?.label ?? "Workspace";
}

function screenTitle(step: StepKey) {
  switch (step) {
    case "background":
      return "Find the IT role that fits your experience.";
    case "profile":
      return "Review your profile";
    case "assessment":
      return "Four questions to refine your fit";
    case "roles":
      return "3 career paths for you";
    case "skills":
      return "Your path, backed by market evidence";
    case "plan":
      return "Your 30-day action plan";
  }
}
