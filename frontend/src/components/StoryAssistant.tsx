import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { LoaderCircle, MessageSquareText, Send, Sparkles } from 'lucide-react';
import { useChatMutation, useConversationMessages, useConversations } from '../hooks/useStoryforge';
import type { Message } from '../types/api';

type StoryAssistantProps = {
  projectId: string | null;
  projectTitle: string | null;
  conversationId: string | null;
  onConversationIdChange: (projectId: string, conversationId: string | null) => void;
  onNewConversation: (projectId: string) => void;
};

const promptSuggestions = [
  'What do we know about the central conflict?',
  'Which details in the chapters mention the setting?',
  'What unresolved questions remain in the story?',
];

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function StoryAssistant({
  projectId,
  projectTitle,
  conversationId,
  onConversationIdChange,
  onNewConversation,
}: StoryAssistantProps) {
  const [draft, setDraft] = useState('');
  const [requestError, setRequestError] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const submitLock = useRef(false);
  const conversationsQuery = useConversations(projectId ?? '');
  const activeConversation = conversationsQuery.data?.find(
    (conversation) => conversation.id === conversationId && conversation.project_id === projectId
  ) ?? null;
  const messagesQuery = useConversationMessages(activeConversation?.id ?? null);
  const chatMutation = useChatMutation();
  const isPending = chatMutation.isPending;
  const canChat = Boolean(projectId) && (!conversationId || Boolean(activeConversation));

  useEffect(() => {
    if (projectId && conversationId && conversationsQuery.isSuccess && !activeConversation) {
      onConversationIdChange(projectId, null);
    }
  }, [activeConversation, conversationId, conversationsQuery.isSuccess, onConversationIdChange, projectId]);

  async function submitQuestion(event?: FormEvent<HTMLFormElement>, questionOverride?: string) {
    event?.preventDefault();
    if (submitLock.current || isPending || !projectId || !canChat) {
      return;
    }

    const question = (questionOverride ?? draft).trim();
    if (!question || question.length > 2000) {
      setRequestError(question ? 'Questions must be 2,000 characters or fewer.' : 'Enter a question first.');
      return;
    }

    submitLock.current = true;
    setRequestError(null);
    setPendingQuestion(question);
    try {
      const response = await chatMutation.mutateAsync({
        projectId,
        question,
        ...(activeConversation ? { conversationId: activeConversation.id } : {}),
      });
      onConversationIdChange(projectId, response.conversation_id);
      setDraft('');
      setPendingQuestion(null);
    } catch (error) {
      setPendingQuestion(null);
      setRequestError(
        `${error instanceof Error ? error.message : 'Unable to send your question.'} The backend may have persisted the question before failing; resubmitting could create a duplicate.`
      );
    } finally {
      submitLock.current = false;
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitQuestion(undefined);
    }
  }

  function askSuggestion(question: string) {
    setDraft(question);
    void submitQuestion(undefined, question);
  }

  function selectConversation(nextConversationId: string | null) {
    if (!projectId || isPending) {
      return;
    }
    if (nextConversationId === conversationId) {
      return;
    }
    if (draft.trim() && !window.confirm('Discard your unsent question and switch conversations?')) {
      return;
    }
    setRequestError(null);
    setPendingQuestion(null);
    setDraft('');
    if (nextConversationId) {
      onConversationIdChange(projectId, nextConversationId);
    } else {
      onNewConversation(projectId);
    }
  }

  function renderMessage(message: Message) {
    return (
      <article key={message.id} className={`assistant-message ${message.role}`}>
        <div className="assistant-message-label">
          {message.role === 'assistant' ? 'STORYFORGE AI' : message.role === 'user' ? 'YOU' : 'SYSTEM'}
        </div>
        <p>{message.content}</p>
        {message.sources && message.sources.length > 0 && (
          <div className="citation-list" aria-label="Saved source references">
            {message.sources.map((source, index) => (
              <article className="citation-card" key={`${source.source_id}-${index}`}>
                <strong>[{source.source_id}]</strong>
                <span>Chapter ID: {source.chapter_id}</span>
                <span>Chunk index: {source.chunk_index}</span>
                <span>Similarity: {source.similarity.toFixed(3)}</span>
              </article>
            ))}
          </div>
        )}
        {message.created_at && (
          <time className="assistant-message-time" dateTime={message.created_at}>
            {formatDate(message.created_at)}
          </time>
        )}
      </article>
    );
  }

  return (
    <section className="assistant-page">
      <header className="page-header">
        <div className="crumbs">
          <span>WRITE</span>
          <span aria-hidden="true">/</span>
          <span>STORY AI ASSISTANT</span>
        </div>
        <div className="page-intro">
          <div className="page-kicker">Story intelligence</div>
          <h1>Story AI Assistant</h1>
          <p>
            {projectTitle
              ? `Ask questions grounded in the uploaded chapters of ${projectTitle}.`
              : 'Choose a project to ask questions about its uploaded chapters.'}
          </p>
        </div>
      </header>

      <div className="assistant-layout">
        <section className="assistant-chat-panel panel-card" aria-label="Story assistant conversation">
          <div className="assistant-thread" aria-live="polite">
            {!projectId ? (
              <div className="assistant-empty">
                <MessageSquareText size={25} />
                <h2>Select a project</h2>
                <p>Choose a project from the selector above to begin.</p>
              </div>
            ) : conversationsQuery.isLoading ? (
              <div className="assistant-empty" role="status">
                <LoaderCircle className="loading-icon" size={22} />
                <h2>Loading conversation history</h2>
              </div>
            ) : conversationsQuery.error ? (
              <div className="assistant-empty">
                <MessageSquareText size={25} />
                <h2>Conversation history unavailable</h2>
                <p>{conversationsQuery.error instanceof Error ? conversationsQuery.error.message : 'The request failed.'}</p>
                <button type="button" className="mini-link" onClick={() => void conversationsQuery.refetch()}>Try again</button>
              </div>
            ) : activeConversation && messagesQuery.isLoading ? (
              <div className="assistant-empty" role="status">
                <LoaderCircle className="loading-icon" size={22} />
                <h2>Loading saved messages</h2>
              </div>
            ) : activeConversation && messagesQuery.error ? (
              <div className="assistant-empty">
                <MessageSquareText size={25} />
                <h2>Messages could not be loaded</h2>
                <p>{messagesQuery.error instanceof Error ? messagesQuery.error.message : 'The request failed.'}</p>
                <button type="button" className="mini-link" onClick={() => void messagesQuery.refetch()}>Try again</button>
              </div>
            ) : activeConversation && messagesQuery.data?.length === 0 && !isPending ? (
              <div className="assistant-empty">
                <MessageSquareText size={25} />
                <h2>This conversation is empty</h2>
                <p>Send a question to add a message to this saved conversation.</p>
              </div>
            ) : !activeConversation && !isPending ? (
              <div className="assistant-empty">
                <Sparkles size={25} />
                <h2>A question can open a new thread</h2>
                <p>
                  {conversationsQuery.data?.length
                    ? 'Choose a saved conversation from the history list, or send a question to create a new one.'
                    : 'No saved conversations yet. The backend creates a conversation when you send your first question.'}
                </p>
              </div>
            ) : (
              <>
                {messagesQuery.data?.map(renderMessage)}
                {isPending && (
                  <>
                    {pendingQuestion && (
                      <article className="assistant-message user pending-message">
                        <div className="assistant-message-label">YOU</div>
                        <p>{pendingQuestion}</p>
                      </article>
                    )}
                    <div className="assistant-message assistant pending-message" role="status">
                      <div className="assistant-message-label">STORYFORGE AI</div>
                      <div className="typing-indicator"><LoaderCircle className="loading-icon" size={16} /> Searching story context and preparing a response…</div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {requestError && <p className="form-message error assistant-error" role="alert">{requestError}</p>}

          {!conversationId && projectId && conversationsQuery.isSuccess && !isPending && (
            <div className="assistant-suggestions" aria-label="Suggested questions">
              {promptSuggestions.map((suggestion) => (
                <button
                  type="button"
                  className="assistant-suggestion"
                  key={suggestion}
                  onClick={() => askSuggestion(suggestion)}
                  disabled={isPending}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <form
            className="assistant-composer"
            onSubmit={(event) => void submitQuestion(event)}
            aria-busy={isPending}
          >
            <label className="sr-only" htmlFor="assistant-question">Ask about this story</label>
            <textarea
              id="assistant-question"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setRequestError(null);
              }}
              onKeyDown={handleKeyDown}
              maxLength={2000}
              rows={3}
              placeholder={projectId ? 'Ask something about your story…' : 'Select a project to start'}
              disabled={!canChat || isPending}
            />
            <div className="assistant-composer-footer">
              <span>{draft.length.toLocaleString()} / 2,000 · Enter to send, Shift+Enter for a new line</span>
              <button
                type="submit"
                className="assistant-send-button"
                aria-label="Send question"
                disabled={!canChat || !draft.trim() || isPending}
              >
                {isPending ? <LoaderCircle className="loading-icon" size={17} /> : <Send size={17} />}
              </button>
            </div>
          </form>
        </section>

        <aside className="assistant-context-rail panel-card">
          <div className="assistant-context-heading">
            <div className="page-kicker">Current context</div>
            <button
              type="button"
              className="mini-button assistant-new-thread"
              onClick={() => selectConversation(null)}
              disabled={!projectId || isPending || !conversationId}
            >
              New conversation
            </button>
          </div>
          <h2>{projectTitle ?? 'No project selected'}</h2>
          <p>Questions are sent to the selected project’s RAG endpoint. Previous turns are not included in backend generation context.</p>
          {activeConversation && (
            <div className="assistant-conversation-id">
              <span>Conversation ID</span>
              <code>{activeConversation.id}</code>
            </div>
          )}

          <div className="assistant-history">
            <div className="assistant-history-heading">
              <span>Saved conversations</span>
              {conversationsQuery.data && <small>{conversationsQuery.data.length}</small>}
            </div>
            {conversationsQuery.isLoading ? (
              <p className="assistant-history-message" role="status">Loading…</p>
            ) : conversationsQuery.error ? (
              <div className="assistant-history-error" role="alert">
                <span>{conversationsQuery.error instanceof Error ? conversationsQuery.error.message : 'Unable to load conversations.'}</span>
                <button type="button" className="mini-link" onClick={() => void conversationsQuery.refetch()}>Try again</button>
              </div>
            ) : conversationsQuery.data?.length ? (
              <div className="assistant-history-list">
                {conversationsQuery.data.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className={`assistant-history-item ${conversation.id === activeConversation?.id ? 'active' : ''}`}
                    onClick={() => selectConversation(conversation.id)}
                    disabled={isPending}
                    aria-current={conversation.id === activeConversation?.id ? 'true' : undefined}
                    title={conversation.id}
                  >
                    <span>{formatDate(conversation.created_at)}</span>
                    <small>{conversation.id.slice(0, 8)}</small>
                  </button>
                ))}
              </div>
            ) : projectId && conversationsQuery.isSuccess ? (
              <p className="assistant-history-message">No saved conversations yet.</p>
            ) : null}
          </div>

          <div className="assistant-privacy-note">
            <span className="privacy-dot" />
            <span>Only source metadata returned and saved by the backend is shown. Chapter text and titles are not included in chat citations.</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
