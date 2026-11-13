import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AuthGate } from "./components/AuthGate";
import { LandingPage, StudioPage, type StudioView } from "./components/storyforge/studio";
import { StudioContext } from "./components/storyforge/StudioContext";
import type { StudioContextValue } from "./components/storyforge/StudioContext";
import { useAuth } from "./lib/auth/AuthProvider";
import {
  useCreateProject,
  useDeleteProject,
  useProject,
  useProjects,
  useUpdateProject,
} from "./hooks/useStoryforge";
import type { CreateProjectInput, Project, UpdateProjectInput } from "./types/api";

const routeViews: Record<string, StudioView> = {
  "/dashboard": "dashboard",
  "/characters": "characters",
  "/world": "world",
  "/memory": "memory",
  "/continuity": "continuity",
  "/editor": "editor",
  "/assistant": "assistant",
  "/relationships": "relationships",
  "/qna": "qna",
};

function readStoredValue(key: string): unknown {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) as unknown : null;
  } catch (error) {
    console.warn(`Unable to restore StoryForge selection from local storage (${key}).`, error);
    return null;
  }
}

function readStoredProjectId(key: string): string | null {
  const stored = readStoredValue(key);
  return typeof stored === "string" ? stored : null;
}

function readStoredConversationIds(key: string): Record<string, string> {
  const stored = readStoredValue(key);
  if (typeof stored !== "object" || stored === null || Array.isArray(stored)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(stored).filter((entry): entry is [string, string] => typeof entry[1] === "string" && Boolean(entry[1]))
  );
}

function writeStoredValue(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Unable to persist StoryForge selection to local storage (${key}).`, error);
  }
}

function removeStoredValue(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Unable to clear StoryForge selection from local storage (${key}).`, error);
  }
}

function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="font-tech text-xs uppercase tracking-[0.18em] text-antique">404 · Page not found</p>
        <h1 className="mt-3 font-display text-4xl">This page is not in the library.</h1>
        <a href="/" className="mt-6 inline-flex items-center gap-2 text-sm text-lavender"><ArrowLeft size={15} /> Return home</a>
      </div>
    </main>
  );
}

function App() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  if (pathname === "/") {
    return <LandingPage />;
  }
  const view = routeViews[pathname];
  if (!view) {
    return <NotFound />;
  }
  return (
    <AuthGate>
      <AuthenticatedStudio view={view} />
    </AuthGate>
  );
}

function AuthenticatedStudio({ view }: { view: StudioView }) {
  const { user, signOut } = useAuth();
  const userId = user?.id ?? "";
  const projectStorageKey = `storyforge:selected-project:${userId}`;
  const conversationStorageKey = `storyforge:assistant-conversations:${userId}`;
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() =>
    userId ? readStoredProjectId(projectStorageKey) : null
  );
  const [conversationIds, setConversationIds] = useState<Record<string, string>>(() =>
    userId ? readStoredConversationIds(conversationStorageKey) : {}
  );
  const [projectEditorOpen, setProjectEditorOpen] = useState(false);
  const [projectEditorProject, setProjectEditorProject] = useState<Project | null>(null);
  const [projectEditorSubmitting, setProjectEditorSubmitting] = useState(false);
  const [projectEditorError, setProjectEditorError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeIsError, setNoticeIsError] = useState(false);
  const projectsQuery = useProjects();
  const projects = projectsQuery.data ?? [];
  const selectedProjectQuery = useProject(selectedProjectId);
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  useEffect(() => {
    if (!userId || !projectsQuery.isSuccess) {
      return;
    }
    if (projects.length === 0) {
      if (selectedProjectId !== null) {
        setSelectedProjectId(null);
        writeStoredValue(projectStorageKey, null);
      }
    } else if (!projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(projects[0].id);
      writeStoredValue(projectStorageKey, projects[0].id);
    }
  }, [projectStorageKey, projects, projectsQuery.isSuccess, selectedProjectId, userId]);

  useEffect(() => {
    if (userId) {
      writeStoredValue(projectStorageKey, selectedProjectId);
      writeStoredValue(conversationStorageKey, conversationIds);
    }
  }, [conversationIds, conversationStorageKey, projectStorageKey, selectedProjectId, userId]);

  function selectProject(projectId: string | null) {
    setSelectedProjectId(projectId);
    setNotice(null);
    if (userId) {
      writeStoredValue(projectStorageKey, projectId);
    }
  }

  function openCreateProject() {
    setProjectEditorProject(null);
    setProjectEditorError(null);
    setProjectEditorOpen(true);
  }

  function openEditProject(project: Project) {
    setProjectEditorProject(project);
    setProjectEditorError(null);
    setProjectEditorOpen(true);
  }

  function closeProjectEditor() {
    if (projectEditorSubmitting) {
      return;
    }
    setProjectEditorOpen(false);
    setProjectEditorError(null);
  }

  async function submitProject(input: CreateProjectInput | UpdateProjectInput) {
    setProjectEditorError(null);
    setProjectEditorSubmitting(true);
    const values: CreateProjectInput = {
      title: input.title?.trim() ?? "",
      description: input.description?.trim() || null,
      genre: input.genre?.trim() || null,
    };
    try {
      if (projectEditorProject) {
        await updateProjectMutation.mutateAsync({ projectId: projectEditorProject.id, input: values });
        setNotice("Project changes saved.");
        setNoticeIsError(false);
      } else {
        const created = await createProjectMutation.mutateAsync(values);
        selectProject(created.id);
        setNotice("Project created.");
        setNoticeIsError(false);
      }
      setProjectEditorOpen(false);
    } catch (error) {
      setProjectEditorError(error instanceof Error ? error.message : "Unable to save the project.");
    } finally {
      setProjectEditorSubmitting(false);
    }
  }

  async function confirmAndDeleteProject(project: Project) {
    if (!window.confirm(`Delete “${project.title}”? This cannot be undone.`)) {
      return;
    }
    setNotice(null);
    try {
      await deleteProjectMutation.mutateAsync(project.id);
      if (selectedProjectId === project.id) {
        selectProject(null);
      }
      setNotice("Project deleted.");
      setNoticeIsError(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to delete the project.");
      setNoticeIsError(true);
    }
  }

  async function handleSignOut() {
    setNotice(null);
    try {
      await signOut();
      removeStoredValue(projectStorageKey);
      removeStoredValue(conversationStorageKey);
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to sign out.");
      setNoticeIsError(true);
      return false;
    }
  }

  function setConversationId(projectId: string, conversationId: string | null) {
    const next = { ...conversationIds };
    if (conversationId) {
      next[projectId] = conversationId;
    } else {
      delete next[projectId];
    }
    setConversationIds(next);
    if (userId) {
      writeStoredValue(conversationStorageKey, next);
    }
  }

  function openConversation(projectId: string, conversationId: string) {
    selectProject(projectId);
    setConversationId(projectId, conversationId);
  }

  function startNewConversation(projectId: string) {
    setConversationId(projectId, null);
  }

  const contextValue: StudioContextValue = {
    userName: user?.name ?? null,
    userEmail: user?.email ?? null,
    projects,
    selectedProjectId,
    selectedProject: selectedProjectQuery.data ?? null,
    selectedProjectLoading: selectedProjectQuery.isLoading,
    selectedProjectError: selectedProjectQuery.error instanceof Error ? selectedProjectQuery.error : null,
    projectsLoading: projectsQuery.isLoading,
    projectsError: projectsQuery.error instanceof Error ? projectsQuery.error : null,
    retryProjects: () => { void projectsQuery.refetch(); },
    notice,
    noticeIsError,
    projectEditorOpen,
    projectEditorProject,
    projectEditorSubmitting,
    projectEditorError,
    selectProject,
    openCreateProject,
    openEditProject,
    closeProjectEditor,
    submitProject,
    deleteProject: (project) => { void confirmAndDeleteProject(project); },
    signOut: handleSignOut,
    openConversation,
    startNewConversation,
    conversationIdForProject: (projectId) => conversationIds[projectId] ?? null,
    setConversationId,
  };

  return (
    <StudioContext.Provider value={contextValue}>
      <StudioPage view={view} />
    </StudioContext.Provider>
  );
}

export default App;
