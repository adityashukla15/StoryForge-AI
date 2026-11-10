import { createContext, useContext } from "react";
import type { Project } from "../../types/api";

export type StudioContextValue = {
  userEmail: string | null;
  projects: Project[];
  selectedProjectId: string | null;
  selectedProject: Project | null;
  selectedProjectLoading: boolean;
  selectedProjectError: Error | null;
  projectsLoading: boolean;
  projectsError: Error | null;
  retryProjects: () => void;
  notice: string | null;
  noticeIsError: boolean;
  projectEditorOpen: boolean;
  projectEditorProject: Project | null;
  projectEditorSubmitting: boolean;
  projectEditorError: string | null;
  selectProject: (projectId: string | null) => void;
  openCreateProject: () => void;
  openEditProject: (project: Project) => void;
  closeProjectEditor: () => void;
  submitProject: (input: { title?: string; description?: string | null; genre?: string | null }) => Promise<void>;
  deleteProject: (project: Project) => void;
  signOut: () => void;
  openConversation: (projectId: string, conversationId: string) => void;
  startNewConversation: (projectId: string) => void;
  conversationIdForProject: (projectId: string) => string | null;
  setConversationId: (projectId: string, conversationId: string | null) => void;
};

export const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudioContext() {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error("Studio components must be rendered inside StudioContext.");
  }
  return context;
}
