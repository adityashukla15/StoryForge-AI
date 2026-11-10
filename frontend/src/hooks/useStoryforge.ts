import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  chatWithProject,
  createChapter,
  createProject,
  deleteChapter,
  deleteProject,
  getChapter,
  getDashboardOverview,
  getProject,
  getProjectChapters,
  getProjects,
  getConversations,
  getConversationMessages,
  uploadChapter,
  updateProject,
  updateChapter,
} from '../services/storyforge';
import type {
  CreateChapterInput,
  CreateProjectInput,
  UpdateChapterInput,
  UpdateProjectInput,
} from '../types/api';

const apiConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: getDashboardOverview,
    enabled: apiConfigured,
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
    enabled: apiConfigured,
  });
}

export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId!),
    enabled: apiConfigured && Boolean(projectId),
  });
}

export function useProjectChapters(projectId: string | null) {
  return useQuery({
    queryKey: ['project-chapters', projectId],
    queryFn: () => getProjectChapters(projectId!),
    enabled: apiConfigured && Boolean(projectId),
  });
}

export function useChapter(chapterId: string | null) {
  return useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: () => getChapter(chapterId!),
    enabled: apiConfigured && Boolean(chapterId),
  });
}

export function useCreateChapter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: CreateChapterInput }) =>
      createChapter(projectId, input),
    onSuccess: async (chapter) => {
      queryClient.setQueryData(['chapter', chapter.id], chapter);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-chapters', chapter.project_id] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] }),
      ]);
    },
  });
}

export function useUploadChapter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      input,
    }: {
      projectId: string;
      input: { title: string; chapterNumber: number | null; file: File };
    }) => uploadChapter(projectId, input),
    onSuccess: async (chapter) => {
      queryClient.setQueryData(['chapter', chapter.id], chapter);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-chapters', chapter.project_id] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] }),
      ]);
    },
  });
}

export function useUpdateChapter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chapterId, input }: { chapterId: string; input: UpdateChapterInput }) =>
      updateChapter(chapterId, input),
    onSuccess: async (chapter) => {
      queryClient.setQueryData(['chapter', chapter.id], chapter);
      await queryClient.invalidateQueries({ queryKey: ['project-chapters', chapter.project_id] });
    },
  });
}

export function useDeleteChapter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chapterId: string) => deleteChapter(chapterId),
    onSuccess: async (result) => {
      queryClient.removeQueries({ queryKey: ['chapter', result.chapter_id] });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-chapters'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] }),
      ]);
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] }),
      ]);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: UpdateProjectInput }) =>
      updateProject(projectId, input),
    onSuccess: async (project) => {
      queryClient.setQueryData(['project', project.id], project);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] }),
      ]);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => deleteProject(projectId),
    onSuccess: async (_result, projectId) => {
      queryClient.removeQueries({ queryKey: ['project', projectId] });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] }),
      ]);
    },
  });
}

export function useConversations(projectId: string) {
  return useQuery({
    queryKey: ['project-conversations', projectId],
    queryFn: () => getConversations(projectId),
    enabled: apiConfigured && Boolean(projectId),
  });
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: () => getConversationMessages(conversationId!),
    enabled: apiConfigured && Boolean(conversationId),
  });
}

export function useChatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, question, conversationId }: { projectId: string; question: string; conversationId?: string }) =>
      chatWithProject(projectId, question, conversationId),
    retry: 0,
    onSuccess: async (response, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-conversations', variables.projectId] }),
        queryClient.invalidateQueries({ queryKey: ['conversation-messages', response.conversation_id] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] }),
      ]);
    },
    onError: async (_error, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-conversations', variables.projectId] }),
        ...(variables.conversationId
          ? [queryClient.invalidateQueries({ queryKey: ['conversation-messages', variables.conversationId] })]
          : []),
      ]);
    },
  });
}
