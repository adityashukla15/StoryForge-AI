import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { CreateProjectInput, Project, UpdateProjectInput } from '../types/api';

type ProjectEditorProps = {
  project: Project | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: CreateProjectInput | UpdateProjectInput) => Promise<void>;
};

export function ProjectEditor({
  project,
  submitting,
  error,
  onClose,
  onSubmit,
}: ProjectEditorProps) {
  const [title, setTitle] = useState(project?.title ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [genre, setGenre] = useState(project?.genre ?? '');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      genre: genre.trim() || null,
    });
  }

  return (
    <div className="dialog-backdrop">
      <section
        className="project-dialog glass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-dialog-title"
      >
        <div className="panel-head">
          <div>
            <div className="page-kicker">{project ? 'Project details' : 'New manuscript'}</div>
            <h2 id="project-dialog-title">{project ? 'Edit project' : 'Create a project'}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <X size={17} />
          </button>
        </div>
        <form className="project-form" onSubmit={handleSubmit}>
          <label>
            Project title
            <input
              autoFocus
              required
              maxLength={150}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={submitting}
            />
          </label>
          <label>
            Description <span className="field-note">Optional</span>
            <textarea
              maxLength={2000}
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={submitting}
            />
          </label>
          <label>
            Genre <span className="field-note">Optional</span>
            <input
              maxLength={80}
              value={genre}
              onChange={(event) => setGenre(event.target.value)}
              disabled={submitting}
            />
          </label>
          {error && <p className="form-message error" role="alert">{error}</p>}
          <div className="dialog-actions">
            <button type="button" className="mini-button" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="new-story-button" disabled={submitting || !title.trim()}>
              {submitting ? 'Saving…' : project ? 'Save changes' : 'Create project'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
