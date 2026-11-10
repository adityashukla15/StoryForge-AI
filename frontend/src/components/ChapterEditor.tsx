import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { BookOpen, LoaderCircle, Plus, Save, Trash2 } from 'lucide-react';
import {
  useChapter,
  useCreateChapter,
  useDeleteChapter,
  useProjectChapters,
  useUploadChapter,
  useUpdateChapter,
} from '../hooks/useStoryforge';
import type { Chapter, CreateChapterInput, UpdateChapterInput } from '../types/api';

type ChapterEditorProps = {
  projectId: string | null;
  projectTitle: string | null;
  onDirtyChange: (dirty: boolean) => void;
};

function chapterSignature(chapter: Pick<Chapter, 'title' | 'content' | 'chapter_number'>) {
  return JSON.stringify([chapter.title, chapter.content, chapter.chapter_number ?? null]);
}

export function ChapterEditor({ projectId, projectTitle, onDirtyChange }: ChapterEditorProps) {
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [chapterNumber, setChapterNumber] = useState('');
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [confirmedSave, setConfirmedSave] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const saveLock = useRef(false);
  const uploadLock = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadChapterNumber, setUploadChapterNumber] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const chaptersQuery = useProjectChapters(projectId);
  const chapterQuery = useChapter(chapterId);
  const createMutation = useCreateChapter();
  const uploadMutation = useUploadChapter();
  const updateMutation = useUpdateChapter();
  const deleteMutation = useDeleteChapter();
  const isSaving = createMutation.isPending || updateMutation.isPending || uploadMutation.isPending;
  const dirty = creating
    ? Boolean(title.trim() || content || chapterNumber)
    : Boolean(chapterQuery.data && savedSignature !== null &&
      savedSignature !== chapterSignature({
        title,
        content,
        chapter_number: chapterNumber === '' ? null : Number(chapterNumber),
      }));

  const wordCount = useMemo(
    () => content.trim().split(/\s+/).filter(Boolean).length,
    [content]
  );

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!dirty) {
      return;
    }

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!chapterId || !chapterQuery.data || chapterQuery.data.id !== chapterId) {
      return;
    }

    setTitle(chapterQuery.data.title);
    setContent(chapterQuery.data.content);
    setChapterNumber(chapterQuery.data.chapter_number?.toString() ?? '');
    setSavedSignature(chapterSignature(chapterQuery.data));
  }, [chapterId, chapterQuery.data]);

  useEffect(() => {
    if (creating || chapterId || !chaptersQuery.data?.length) {
      return;
    }
    setChapterId(chaptersQuery.data[0].id);
  }, [creating, chapterId, chaptersQuery.data]);

  function mayDiscardChanges() {
    return !dirty || window.confirm('Discard your unsaved chapter changes?');
  }

  function openChapter(nextChapterId: string) {
    if (nextChapterId === chapterId && !creating) {
      return;
    }
    if (!mayDiscardChanges()) {
      return;
    }
    setActionError(null);
    setSaveError(null);
    setSuccessMessage(null);
    setCreating(false);
    setSavedSignature(null);
    setChapterId(nextChapterId);
  }

  function startNewChapter() {
    if (!mayDiscardChanges()) {
      return;
    }
    setChapterId(null);
    setCreating(true);
    setTitle('');
    setContent('');
    setChapterNumber('');
    setSavedSignature(null);
    setConfirmedSave(false);
    setSaveError(null);
    setActionError(null);
    setSuccessMessage(null);
  }

  function parseChapterNumber(): number | null {
    if (chapterNumber.trim() === '') {
      return null;
    }
    const parsed = Number(chapterNumber);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new Error('Chapter number must be a whole number greater than or equal to 1.');
    }
    return parsed;
  }

  function validateUploadFile(file: File): string | null {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'pdf' && extension !== 'txt') {
      return 'Only PDF and TXT files are supported.';
    }
    if (extension === 'pdf' && file.type.toLowerCase() !== 'application/pdf') {
      return 'The selected PDF must have the application/pdf content type.';
    }
    if (extension === 'txt' && !['text/plain', 'application/octet-stream'].includes(file.type.toLowerCase())) {
      return 'The selected TXT file must have a text/plain or application/octet-stream content type.';
    }
    if (file.size === 0) {
      return 'The selected file is empty.';
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'Files must be 10 MiB or smaller.';
    }
    return null;
  }

  function handleUploadFileChange(file: File | null) {
    setUploadError(null);
    setUploadFile(file);
    if (!file) {
      setUploadTitle('');
      return;
    }

    const validationError = validateUploadFile(file);
    if (validationError) {
      setUploadFile(null);
      setUploadError(validationError);
      setUploadTitle('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (!uploadTitle.trim()) {
      setUploadTitle(file.name.replace(/\.[^.]+$/, ''));
    }
  }

  async function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploadLock.current || uploadMutation.isPending || !projectId) {
      return;
    }
    setUploadError(null);
    setActionError(null);
    setSuccessMessage(null);

    if (!uploadFile) {
      setUploadError('Choose a PDF or TXT file to upload.');
      return;
    }
    const fileError = validateUploadFile(uploadFile);
    if (fileError) {
      setUploadError(fileError);
      return;
    }
    const normalizedTitle = uploadTitle.trim();
    if (!normalizedTitle) {
      setUploadError('A chapter title is required.');
      return;
    }
    if (normalizedTitle.length > 200) {
      setUploadError('Chapter titles must be 200 characters or fewer.');
      return;
    }

    let number: number | null;
    try {
      number = uploadChapterNumber.trim() === '' ? null : Number(uploadChapterNumber);
      if (number !== null && (!Number.isInteger(number) || number < 1)) {
        throw new Error('Chapter number must be a whole number greater than or equal to 1.');
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Enter a valid chapter number.');
      return;
    }

    if (!mayDiscardChanges()) {
      return;
    }

    uploadLock.current = true;
    try {
      const uploaded = await uploadMutation.mutateAsync({
        projectId,
        input: {
          title: normalizedTitle,
          chapterNumber: number,
          file: uploadFile,
        },
      });
      setChapterId(uploaded.id);
      setCreating(false);
      setTitle(uploaded.title);
      setContent(uploaded.content);
      setChapterNumber(uploaded.chapter_number?.toString() ?? '');
      setSavedSignature(chapterSignature(uploaded));
      setConfirmedSave(true);
      setSuccessMessage('Chapter uploaded and saved. Indexing was not triggered or confirmed.');
      setUploadFile(null);
      setUploadTitle('');
      setUploadChapterNumber('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Unable to upload this chapter.');
    } finally {
      uploadLock.current = false;
    }
  }

  async function saveChapter() {
    if (saveLock.current || isSaving || !projectId) {
      return;
    }

    setSaveError(null);
    setSuccessMessage(null);
    if (!title.trim()) {
      setSaveError('A chapter title is required.');
      return;
    }
    if (!content.trim()) {
      setSaveError('Chapter content cannot be empty. The backend requires at least one non-whitespace character.');
      return;
    }

    let number: number | null;
    try {
      number = parseChapterNumber();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Enter a valid chapter number.');
      return;
    }

    saveLock.current = true;
    try {
      if (creating) {
        const input: CreateChapterInput = {
          title: title.trim(),
          content,
          chapter_number: number,
        };
        const created = await createMutation.mutateAsync({ projectId, input });
        setChapterId(created.id);
        setCreating(false);
        setTitle(created.title);
        setContent(created.content);
        setChapterNumber(created.chapter_number?.toString() ?? '');
        setSavedSignature(chapterSignature(created));
        setConfirmedSave(true);
        setSuccessMessage('Chapter created and saved.');
      } else if (chapterId && chapterQuery.data) {
        const input: UpdateChapterInput = {};
        if (title.trim() !== chapterQuery.data.title) input.title = title.trim();
        if (content !== chapterQuery.data.content) input.content = content;
        if (number !== (chapterQuery.data.chapter_number ?? null)) input.chapter_number = number;

        if (Object.keys(input).length === 0) {
          setSaveError(null);
          return;
        }

        const updated = await updateMutation.mutateAsync({ chapterId, input });
        setTitle(updated.title);
        setContent(updated.content);
        setChapterNumber(updated.chapter_number?.toString() ?? '');
        setSavedSignature(chapterSignature(updated));
        setConfirmedSave(true);
        setSuccessMessage('Changes saved.');
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save this chapter.');
      setConfirmedSave(false);
    } finally {
      saveLock.current = false;
    }
  }

  async function removeChapter() {
    if (!chapterId || !chapterQuery.data || saveLock.current || isSaving || deleteMutation.isPending) {
      return;
    }
    const discardNote = dirty ? ' Unsaved changes will also be lost.' : '';
    if (!window.confirm(`Delete “${chapterQuery.data.title}”? This cannot be undone.${discardNote}`)) {
      return;
    }

    setActionError(null);
    setSuccessMessage(null);
    try {
      await deleteMutation.mutateAsync(chapterId);
      setChapterId(null);
      setTitle('');
      setContent('');
      setChapterNumber('');
      setSavedSignature(null);
      setConfirmedSave(false);
      setSuccessMessage('Chapter deleted.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to delete this chapter.');
    }
  }

  const chapterError = chaptersQuery.error instanceof Error
    ? chaptersQuery.error.message
    : 'Unable to load chapters.';
  const detailError = chapterQuery.error instanceof Error
    ? chapterQuery.error.message
    : 'Unable to load this chapter.';

  return (
    <section className="chapter-editor-page">
      <header className="page-header">
        <div className="crumbs">
          <span>WRITE</span>
          <span aria-hidden="true">/</span>
          <span>CHAPTER EDITOR</span>
        </div>
        <div className="page-intro">
          <div className="page-kicker">Manuscript workspace</div>
          <h1>Chapter Editor</h1>
          <p>{projectTitle ? `Writing in ${projectTitle}` : 'Choose a project to open its chapters.'}</p>
        </div>
      </header>

      {actionError && <p className="form-message error" role="alert">{actionError}</p>}
      {successMessage && <p className="form-message success" role="status">{successMessage}</p>}

      {!projectId ? (
        <div className="panel-card chapter-empty-state">
          <BookOpen size={22} />
          <h2>Select a project first</h2>
          <p>Your chapter list will appear here when a project is selected.</p>
        </div>
      ) : (
        <div className="chapter-workspace">
          <aside className="chapter-rail panel-card" aria-label="Project chapters">
            <div className="chapter-rail-head">
              <div>
                <div className="page-kicker">Manuscript</div>
                <h2>Chapters</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Create chapter"
                onClick={startNewChapter}
                disabled={isSaving || deleteMutation.isPending}
              >
                <Plus size={17} />
              </button>
            </div>

            {chaptersQuery.isLoading ? (
              <div className="chapter-list-loading" role="status">Loading chapters…</div>
            ) : chaptersQuery.error ? (
              <div className="inline-error" role="alert">
                <span>{chapterError}</span>
                <button type="button" className="mini-link" onClick={() => void chaptersQuery.refetch()}>Try again</button>
              </div>
            ) : chaptersQuery.data?.length === 0 ? (
              <div className="chapter-list-empty">No chapters yet.</div>
            ) : (
              <nav className="chapter-list">
                {chaptersQuery.data?.map((chapter) => (
                  <button
                    key={chapter.id}
                    type="button"
                    className={`chapter-list-item ${chapter.id === chapterId && !creating ? 'active' : ''}`}
                    onClick={() => openChapter(chapter.id)}
                    disabled={isSaving || deleteMutation.isPending}
                  >
                    <span className="chapter-list-number">
                      {chapter.chapter_number == null ? '—' : String(chapter.chapter_number).padStart(2, '0')}
                    </span>
                    <span className="chapter-list-title">{chapter.title}</span>
                  </button>
                ))}
              </nav>
            )}

            <button
              type="button"
              className="new-chapter-button"
              onClick={startNewChapter}
              disabled={isSaving || deleteMutation.isPending}
            >
              <Plus size={15} /> New chapter
            </button>

            <form
              className="chapter-upload-form"
              onSubmit={(event) => void submitUpload(event)}
              aria-busy={uploadMutation.isPending}
            >
              <div className="page-kicker">Import manuscript</div>
              <label className="upload-field">
                <span>PDF or TXT file</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain,application/octet-stream"
                  onChange={(event) => handleUploadFileChange(event.target.files?.[0] ?? null)}
                  disabled={isSaving || deleteMutation.isPending}
                  aria-describedby="chapter-upload-limits"
                />
              </label>
              <label className="upload-field">
                <span>Chapter title <span className="field-note">Required</span></span>
                <input
                  value={uploadTitle}
                  maxLength={200}
                  required
                  onChange={(event) => setUploadTitle(event.target.value)}
                  disabled={isSaving || deleteMutation.isPending}
                />
              </label>
              <label className="upload-field">
                <span>Chapter number <span className="field-note">Optional</span></span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={uploadChapterNumber}
                  onChange={(event) => setUploadChapterNumber(event.target.value)}
                  disabled={isSaving || deleteMutation.isPending}
                />
              </label>
              <p className="upload-limits" id="chapter-upload-limits">
                PDF/TXT only · max 10 MiB. Upload progress is not reported by this API.
              </p>
              {uploadError && <p className="form-message error" role="alert">{uploadError}</p>}
              <button
                type="submit"
                className="new-chapter-button upload-submit"
                disabled={isSaving || deleteMutation.isPending || !uploadFile}
              >
                {uploadMutation.isPending
                  ? <><LoaderCircle className="loading-icon" size={15} /> Uploading…</>
                  : 'Upload chapter'}
              </button>
            </form>
          </aside>

          <section className="chapter-writing-panel panel-card" aria-label="Chapter writing area">
            {!creating && !chapterId ? (
              <div className="chapter-empty-state">
                <BookOpen size={22} />
                <h2>Choose a chapter to begin</h2>
                <p>Open a chapter from this project, or create a new one.</p>
              </div>
            ) : !creating && chapterQuery.isLoading ? (
              <div className="chapter-detail-loading" role="status">
                <div className="editor-skeleton-line" />
                <div className="editor-skeleton-body" />
              </div>
            ) : !creating && chapterQuery.error ? (
              <div className="chapter-empty-state" role="alert">
                <h2>Could not open this chapter</h2>
                <p>{detailError}</p>
                <button type="button" className="mini-button" onClick={() => void chapterQuery.refetch()}>Try again</button>
              </div>
            ) : (
              <>
                <div className="chapter-toolbar">
                  <div className="chapter-save-status" role="status" aria-live="polite">
                    {isSaving && <LoaderCircle className="loading-icon" size={14} />}
                    {isSaving ? 'Saving…' : dirty ? 'Unsaved changes' : confirmedSave ? 'Saved' : 'Ready to edit'}
                  </div>
                  <div className="chapter-toolbar-actions">
                    {!creating && chapterId && (
                      <button
                        type="button"
                        className="mini-button danger-button"
                        onClick={() => void removeChapter()}
                        disabled={deleteMutation.isPending || isSaving}
                      >
                        <Trash2 size={14} /> {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="new-story-button"
                      onClick={() => void saveChapter()}
                      disabled={isSaving || deleteMutation.isPending || !dirty}
                    >
                      {isSaving ? <LoaderCircle className="loading-icon" size={15} /> : <Save size={15} />}
                      {creating ? 'Create chapter' : 'Save changes'}
                    </button>
                  </div>
                </div>

                <div className="chapter-metadata">
                  <label className="chapter-title-field">
                    <span className="sr-only">Chapter title</span>
                    <input
                      value={title}
                      onChange={(event) => {
                        setTitle(event.target.value);
                        setConfirmedSave(false);
                        setSaveError(null);
                        setSuccessMessage(null);
                      }}
                      maxLength={200}
                      placeholder="Untitled chapter"
                      aria-label="Chapter title"
                      disabled={isSaving || deleteMutation.isPending}
                    />
                  </label>
                  <label className="chapter-number-field">
                    <span>CHAPTER NO.</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={chapterNumber}
                      onChange={(event) => {
                        setChapterNumber(event.target.value);
                        setConfirmedSave(false);
                        setSaveError(null);
                        setSuccessMessage(null);
                      }}
                      placeholder="—"
                      aria-label="Chapter number"
                      disabled={isSaving || deleteMutation.isPending}
                    />
                  </label>
                </div>

                <textarea
                  className="chapter-writing-area"
                  value={content}
                  onChange={(event) => {
                    setContent(event.target.value);
                    setConfirmedSave(false);
                    setSaveError(null);
                    setSuccessMessage(null);
                  }}
                  placeholder="Begin your story…"
                  aria-label="Chapter content"
                  disabled={isSaving || deleteMutation.isPending}
                />

                <footer className="chapter-editor-footer">
                  <span>{wordCount.toLocaleString()} words</span>
                  <span>{content.length.toLocaleString()} characters</span>
                </footer>

                {saveError && <p className="form-message error" role="alert">{saveError}</p>}
              </>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
