import { apiFetch } from '../lib/api/client';
import type {
  ChatResponse,
  Chapter,
  Conversation,
  CreateChapterInput,
  CreateProjectInput,
  DashboardOverview,
  Message,
  Project,
  UpdateChapterInput,
  UpdateProjectInput,
} from '../types/api';

export async function getDashboardOverview(): Promise<DashboardOverview> {
  return apiFetch<DashboardOverview>('/dashboard/overview');
}

export async function getProjects(): Promise<Project[]> {
  return apiFetch<Project[]>('/projects/');
}

export async function createProject(payload: CreateProjectInput): Promise<Project> {
  return apiFetch<Project>('/projects/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getProject(projectId: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${projectId}`);
}

export async function updateProject(projectId: string, payload: UpdateProjectInput): Promise<Project> {
  return apiFetch<Project>(`/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteProject(projectId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/projects/${projectId}`, {
    method: 'DELETE',
  });
}

export async function getProjectChapters(projectId: string): Promise<Chapter[]> {
  return apiFetch<Chapter[]>(`/projects/${projectId}/chapters`);
}

export async function createChapter(projectId: string, payload: CreateChapterInput): Promise<Chapter> {
  return apiFetch<Chapter>(`/projects/${projectId}/chapters`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function uploadChapter(
  projectId: string,
  input: { title: string; chapterNumber: number | null; file: File }
): Promise<Chapter> {
  const formData = new FormData();
  formData.set('title', input.title);
  if (input.chapterNumber !== null) {
    formData.set('chapter_number', String(input.chapterNumber));
  }
  formData.set('file', input.file);
  return apiFetch<Chapter>(`/projects/${projectId}/chapters/upload`, {
    method: 'POST',
    body: formData,
  });
}

export async function getChapter(chapterId: string): Promise<Chapter> {
  return apiFetch<Chapter>(`/chapters/${chapterId}`);
}

export async function updateChapter(chapterId: string, payload: UpdateChapterInput): Promise<Chapter> {
  return apiFetch<Chapter>(`/chapters/${chapterId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteChapter(chapterId: string): Promise<{ message: string; chapter_id: string }> {
  return apiFetch<{ message: string; chapter_id: string }>(`/chapters/${chapterId}`, {
    method: 'DELETE',
  });
}

export async function getConversations(projectId: string): Promise<Conversation[]> {
  return apiFetch<Conversation[]>(`/projects/${projectId}/conversations`);
}

export async function chatWithProject(projectId: string, question: string, conversationId?: string): Promise<ChatResponse> {
  return apiFetch<ChatResponse>(`/projects/${projectId}/chat`, {
    method: 'POST',
    body: JSON.stringify({
      question,
      ...(conversationId ? { conversation_id: conversationId } : {}),
    }),
  });
}

export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  return apiFetch<Message[]>(`/conversations/${conversationId}/messages`);
}
