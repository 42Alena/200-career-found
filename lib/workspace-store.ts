import { eq } from "drizzle-orm";

import { WorkspaceSchema, type Workspace } from "@/lib/contracts";
import { getDb } from "@/lib/db/client";
import { workspaces } from "@/lib/db/schema";

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
  const db = getDb();

  if (db) {
    try {
      const rows = await db
        .select({ payload: workspaces.payload })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1);
      const payload = rows[0]?.payload;

      if (payload) {
        return WorkspaceSchema.parse(payload);
      }
    } catch (error) {
      console.error("Unable to read workspace from Postgres", error);
    }
  }

  return memoryStore().get(workspaceId) ?? createEmptyWorkspace(workspaceId);
}

export async function saveWorkspace(workspace: Workspace) {
  const nextWorkspace = WorkspaceSchema.parse({
    ...workspace,
    updatedAt: new Date().toISOString(),
  });
  const db = getDb();

  if (db) {
    try {
      await db
        .insert(workspaces)
        .values({
          id: nextWorkspace.workspaceId,
          payload: nextWorkspace,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: workspaces.id,
          set: {
            payload: nextWorkspace,
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      console.error("Unable to save workspace to Postgres", error);
    }
  }

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
