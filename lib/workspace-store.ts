import { WorkspaceSchema, type Workspace } from "@/lib/contracts";

type GlobalStore = typeof globalThis & {
  careerFoundWorkspaces?: Map<string, Workspace>;
};

function memoryStore() {
  const globalStore = globalThis as GlobalStore;
  globalStore.careerFoundWorkspaces ??= new Map<string, Workspace>();
  return globalStore.careerFoundWorkspaces;
}

export function createEmptyWorkspace(workspaceId: string): Workspace {
  return {
    workspaceId,
    currentStep: "background",
    jobDescriptions: [],
    recommendations: [],
    skillRatings: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function getWorkspace(workspaceId: string) {
  return memoryStore().get(workspaceId) ?? createEmptyWorkspace(workspaceId);
}

export async function saveWorkspace(workspace: Workspace) {
  const nextWorkspace = WorkspaceSchema.parse({
    ...workspace,
    updatedAt: new Date().toISOString(),
  });
  memoryStore().set(nextWorkspace.workspaceId, nextWorkspace);
  return nextWorkspace;
}

export async function updateWorkspace(
  workspaceId: string,
  updater: (workspace: Workspace) => Workspace,
) {
  const workspace = await getWorkspace(workspaceId);
  return saveWorkspace(updater(workspace));
}
