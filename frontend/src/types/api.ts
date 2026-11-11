export type Project = {
  id: string;
  title: string;
  description?: string | null;
  genre?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CreateProjectInput = {
  title: string;
  description?: string | null;
  genre?: string | null;
};

export type UpdateProjectInput = {
  title?: string;
  description?: string | null;
  genre?: string | null;
};

export type CreateChapterInput = {
  title: string;
  content: string;
  chapter_number?: number | null;
};

export type UpdateChapterInput = {
  title?: string;
  content?: string;
  chapter_number?: number | null;
};

export type Chapter = {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  content: string;
  indexing_status?: 'pending' | 'indexed' | 'failed' | 'not_applicable';
  chapter_number?: number | null;
  created_at?: string;
  updated_at?: string;
  file_path?: string | null;
};

export type Conversation = {
  id: string;
  project_id: string;
  user_id: string;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: Array<{
    source_id: string;
    chapter_id: string;
    chunk_index: number;
    chunk_id: string;
    similarity: number;
  }>;
  created_at: string;
};

export type DashboardStats = {
  total_projects: number;
  total_chapters: number;
  total_conversations: number;
  total_indexed_chunks: number;
};

export type DashboardProject = {
  id: string;
  title: string;
  description: string | null;
  genre: string | null;
  created_at: string;
  updated_at: string;
};

export type DashboardConversation = {
  id: string;
  project_id: string;
  created_at: string;
};

export type DashboardOverview = {
  statistics: DashboardStats;
  recent_projects: DashboardProject[];
  recent_conversations: DashboardConversation[];
};

export type ChatResponse = {
  project_id: string;
  conversation_id: string;
  question: string;
  answer: string;
  sources: Array<{
    source_id: string;
    chapter_id: string;
    chunk_index: number;
    chunk_id: string;
    similarity: number;
  }>;
  status: 'generated' | 'no_context';
  message_id: string;
};
