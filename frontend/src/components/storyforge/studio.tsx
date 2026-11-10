import { useState, type AnchorHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BookText,
  BrainCircuit,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Command,
  Compass,
  Feather,
  FileCheck2,
  GitBranch,
  Globe2,
  Lightbulb,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Send,
  Settings2,
  Sparkles,
  UsersRound,
  WandSparkles,
  X,
} from "lucide-react";
import library from "../../assets/storyforge/storyforge-library.jpg";
import characterPortrait from "../../assets/storyforge/storyforge-characters.jpg";
import atlas from "../../assets/storyforge/storyforge-atlas.jpg";
import { Button } from "../ui/button";
import { ChapterEditor as ConnectedChapterEditor } from "../ChapterEditor";
import { StoryAssistant as ConnectedStoryAssistant } from "../StoryAssistant";
import { useDashboard } from "../../hooks/useStoryforge";
import { ProjectEditor } from "../ProjectEditor";
import { useStudioContext } from "./StudioContext";
import type { Project } from "../../types/api";

function Link({ to, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  return <a href={to} {...props} />;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

const navItems = [
  { to: "/dashboard", label: "Your library", icon: BookOpen, group: "Studio" },
  { to: "/characters", label: "Characters", icon: UsersRound, group: "Studio" },
  { to: "/world", label: "World builder", icon: Compass, group: "Studio" },
  { to: "/memory", label: "Story memory", icon: BrainCircuit, group: "Intelligence" },
  { to: "/continuity", label: "Continuity lab", icon: FileCheck2, group: "Intelligence" },
  { to: "/editor", label: "Chapter editor", icon: BookText, group: "Write" },
  { to: "/assistant", label: "Story AI assistant", icon: MessageCircle, group: "Write" },
  { to: "/relationships", label: "Relationship map", icon: GitBranch, group: "Intelligence" },
] as const;

export type StudioView = "dashboard" | "characters" | "world" | "memory" | "continuity" | "editor" | "assistant" | "relationships";
type View = StudioView;

const pageCopy: Record<View, { title: string; subtitle: string; crumb: string; icon: typeof BookOpen }> = {
  dashboard: { title: "Your worlds, at a glance.", subtitle: "Pick up where the ink left off.", crumb: "Your library", icon: BookOpen },
  characters: { title: "Characters with a life of their own.", subtitle: "Meet the people who make your worlds turn.", crumb: "Character studio", icon: UsersRound },
  world: { title: "A world beyond the page.", subtitle: "Every path leads somewhere. Every somewhere has a story.", crumb: "World builder", icon: Compass },
  memory: { title: "Nothing gets lost between chapters.", subtitle: "Your stories, remembered in every detail.", crumb: "Story memory", icon: BrainCircuit },
  continuity: { title: "Find the thread. Keep the truth.", subtitle: "A little foresight for the worlds you make.", crumb: "Continuity lab", icon: FileCheck2 },
  editor: { title: "A quiet place to find the words.", subtitle: "Your next chapter is already waiting.", crumb: "Chapter editor", icon: BookText },
  assistant: { title: "A second mind for your first idea.", subtitle: "Think it through, one thought at a time.", crumb: "Story AI assistant", icon: MessageCircle },
  relationships: { title: "Every connection tells a story.", subtitle: "Follow the ties that hold your world together.", crumb: "Relationship map", icon: GitBranch },
};

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex w-fit items-center gap-2.5 text-foreground" aria-label="StoryForge AI home">
      <span className="grid size-9 place-items-center border border-antique/50 bg-royal/70 text-antique"><Feather size={17} strokeWidth={1.6} /></span>
      {!compact && <span className="font-tech text-[13px] font-semibold tracking-[0.08em]">STORYFORGE <span className="text-antique">AI</span></span>}
    </Link>
  );
}

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <section className="landing-scene relative isolate flex min-h-[760px] min-h-[92svh] flex-col overflow-hidden">
        <img className="splash-image absolute inset-0 h-full w-full object-cover object-center" src={library} width={1536} height={1024} alt="A floating open book illuminates an enchanted library" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/65 via-transparent to-ink/10" />
        <header className="relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-6 md:px-12 lg:px-20">
          <Brand />
          <nav aria-label="Main navigation" className="hidden items-center gap-8 font-tech text-[11px] tracking-[0.08em] text-foreground/75 md:flex">
            <Link to="/dashboard" className="transition-colors hover:text-antique">THE STUDIO</Link>
            <Link to="/world" className="transition-colors hover:text-antique">WORLDS</Link>
            <Link to="/assistant" className="transition-colors hover:text-antique">STORY AI</Link>
          </nav>
          <Link to="/dashboard" className="inline-flex h-10 items-center gap-2 border border-antique/50 bg-ink/30 px-4 font-tech text-[11px] text-foreground transition-colors hover:bg-royal/70">Enter your library <ArrowRight size={14} /></Link>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 items-center px-6 pb-20 pt-16 md:px-12 lg:px-20">
          <div className="max-w-[670px] pb-5">
            <div className="mb-8 flex items-center gap-3 font-tech text-[10px] uppercase tracking-[0.24em] text-antique">
              <span className="h-px w-10 bg-antique/70" /> The intelligent storytelling studio
            </div>
            <h1 className="max-w-[650px] font-display text-[clamp(3.8rem,8vw,7.2rem)] leading-[0.87] font-medium text-foreground">
              Every story deserves <span className="italic text-lavender">a universe</span> of its own.
            </h1>
            <p className="mt-8 max-w-[440px] text-base leading-7 text-foreground/75 md:text-lg">
              An enchanted library for the worlds only you can imagine. Gather your stories, meet your characters, and follow the ink wherever it leads.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link to="/dashboard" className="inline-flex h-12 items-center gap-2 rounded-none bg-violet px-6 font-tech text-xs text-foreground transition-all hover:bg-violet/85 hover:shadow-[0_0_26px_color-mix(in_oklab,var(--violet)_50%,transparent)]"><Sparkles size={15} /> Get started <ArrowRight size={15} /></Link>
              <Link to="/world" className="inline-flex h-12 items-center gap-2 px-3 text-sm text-foreground/75 transition-colors hover:text-antique">
                <Compass size={16} className="text-antique" /> Wander the worlds <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="mt-14 flex items-center gap-4 text-xs text-foreground/55">
              <span className="flex -space-x-2" aria-hidden="true">
                {[
                  "bg-antique/80", "bg-story-blue/80", "bg-violet/80", "bg-lavender/80",
                ].map((color, i) => <span key={i} className={`size-7 rounded-full border-2 border-ink ${color}`} />)}
              </span>
              <span><span className="text-foreground">Made for the stories still unfolding.</span><br />A studio for curious minds &amp; worlds.</span>
            </div>
          </div>
          <div className="float-drift pointer-events-none absolute right-[9%] top-[24%] hidden w-[18rem] rotate-[4deg] border border-lavender/20 bg-ink/50 p-4 shadow-[0_0_60px_color-mix(in_oklab,var(--violet)_22%,transparent)] backdrop-blur-sm xl:block">
            <div className="flex items-center justify-between font-tech text-[9px] uppercase tracking-[0.15em] text-antique"><span>Story pulse</span><span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-story-blue" /> alive</span></div>
            <div className="my-3 h-px bg-lavender/15" />
            <p className="font-display text-lg italic text-foreground">“The sky remembered her name.”</p>
            <div className="mt-3 flex items-center justify-between font-tech text-[9px] text-foreground/50"><span>THE GLASS KINGDOM</span><span>CH. 07 · 2,418 WORDS</span></div>
          </div>
        </div>
        <div className="relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-between border-t border-foreground/10 px-6 py-4 font-tech text-[9px] uppercase tracking-[0.15em] text-foreground/40 md:px-12 lg:px-20">
          <span>Books hold worlds. You hold the pen.</span><span className="hidden items-center gap-2 sm:flex"><span className="h-px w-8 bg-antique/60" /> Begin anywhere <ArrowDownRight size={12} className="text-antique" /></span>
        </div>
      </section>
      <section className="mx-auto grid max-w-[1440px] gap-10 px-6 py-16 md:grid-cols-3 md:px-12 lg:px-20">
        {[
          { icon: BookOpen, title: "A library without walls", text: "Gather every story, chapter, and unfinished thought in one living place." },
          { icon: Globe2, title: "Worlds worth wandering", text: "Draw maps, shape kingdoms, and give every corner a story of its own." },
          { icon: WandSparkles, title: "A little story magic", text: "Keep your threads close and find a fresh point of view when you need one." },
        ].map(({ icon: Icon, title, text }) => <article key={title} className="border-t border-antique/30 pt-5"><Icon size={17} className="text-antique" /><h2 className="mt-4 font-display text-2xl text-foreground">{title}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-foreground/60">{text}</p></article>)}
      </section>
      <Footer />
    </main>
  );
}

function Footer() {
  return <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-foreground/10 px-6 py-6 text-xs text-foreground/45 md:px-12 lg:px-20"><Brand /><span>© 2026 StoryForge AI · The Intelligent Storytelling Studio</span></footer>;
}

function StudioLayout({ view, children }: { view: View; children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const current = pageCopy[view];
  const groups = [...new Set(navItems.map((item) => item.group))];
  const {
    userEmail,
    projects,
    selectedProjectId,
    selectedProject,
    selectProject,
    projectsLoading,
    projectsError,
    retryProjects,
    openCreateProject,
    signOut,
    notice,
    noticeIsError,
    projectEditorOpen,
    projectEditorProject,
    projectEditorSubmitting,
    projectEditorError,
    closeProjectEditor,
    submitProject,
  } = useStudioContext();
  const previewOnly = ["characters", "world", "memory", "continuity", "relationships"].includes(view);
  const initials = userEmail?.slice(0, 2).toLocaleUpperCase() ?? "SF";
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-[68px] items-center justify-between border-b border-foreground/10 bg-ink/90 px-4 backdrop-blur-xl md:px-7">
        <div className="flex min-w-0 items-center gap-3 md:gap-5"><Brand /><span className="hidden h-5 w-px bg-foreground/15 sm:block" /><label className="flex min-w-0 items-center gap-2 text-xs text-foreground/55"><BookOpen size={13} className="shrink-0 text-antique" /><select aria-label="Select project" disabled={projectsLoading || Boolean(projectsError)} className="max-w-[145px] truncate bg-transparent text-foreground/75 outline-none sm:max-w-[220px]" value={selectedProjectId ?? ""} onChange={(event) => selectProject(event.target.value || null)}><option value="" className="bg-ink">{projectsLoading ? "Loading projects…" : projectsError ? "Project list unavailable" : projects.length ? "Choose project" : "No projects yet"}</option>{projects.map((project) => <option className="bg-ink" key={project.id} value={project.id}>{project.title}</option>)}</select><ChevronDown size={12} /></label></div>
        <div className="flex shrink-0 items-center gap-2 md:gap-3"><Button aria-label="Search is not available yet" title="Search is not available yet" disabled variant="ghost" size="icon" className="hidden text-foreground/70 hover:text-antique sm:inline-flex"><Search /></Button><Button aria-label="Help is not available yet" title="Help is not available yet" disabled variant="ghost" size="icon" className="hidden text-foreground/70 hover:text-antique sm:inline-flex"><CircleHelp /></Button><span className="hidden h-6 w-px bg-foreground/15 sm:block" /><Button variant="outline" className="h-9 border-antique/35 bg-transparent px-3 text-xs text-foreground hover:bg-royal/50 hover:text-foreground" onClick={openCreateProject}><Plus size={14} /> New story</Button><Button variant="ghost" className="inline-flex h-9 px-2 text-xs text-foreground/65" onClick={signOut} aria-label={`Sign out ${userEmail ?? ""}`}><span className="grid size-6 place-items-center rounded-full border border-antique/40 text-[9px] text-antique">{initials}</span><span className="hidden max-w-[130px] truncate lg:inline">{userEmail}</span></Button></div>
      </header>
      <div className="mx-auto flex max-w-[1600px]">
        <aside className="sticky top-[68px] hidden h-[calc(100svh-68px)] w-[232px] shrink-0 flex-col border-r border-foreground/10 px-4 pb-5 pt-7 lg:flex">
          <div className="mb-5 px-3 font-tech text-[9px] uppercase tracking-[0.2em] text-foreground/35">Your creative room</div>
          {groups.map((group) => <div key={group} className="mb-5"><p className="mb-2 px-3 font-tech text-[9px] uppercase tracking-[0.17em] text-antique/75">{group}</p><div className="space-y-1">{navItems.filter((item) => item.group === group).map(({ to, label, icon: Icon }) => { const active = to === `/${view}`; return <Link key={to} to={to} data-status={active ? "active" : "inactive"} aria-current={active ? "page" : undefined} className="studio-nav-link flex min-h-10 items-center gap-3 border-l-2 border-transparent px-3 text-[12px] text-foreground/60 transition-all hover:bg-royal/40 hover:text-foreground"><Icon size={15} strokeWidth={1.7} /><span>{label}</span></Link>; })}</div></div>)}
          <div className="mt-auto border-t border-foreground/10 pt-4"><div className="flex items-center gap-3 px-3"><div className="grid size-8 place-items-center rounded-full border border-antique/50 bg-royal text-xs font-medium text-antique">{initials}</div><div className="min-w-0"><p className="truncate text-xs text-foreground/85">{userEmail ?? "Your library"}</p><p className="text-[10px] text-foreground/40">Authenticated account</p></div><Settings2 size={15} className="ml-auto text-foreground/40" /></div><Button variant="ghost" className="mt-2 h-8 w-full justify-start px-3 text-xs text-foreground/50 hover:text-antique sm:hidden" onClick={signOut}>Sign out</Button></div>
        </aside>
        <main className="min-w-0 flex-1">
          <div className="border-b border-foreground/10 px-5 pt-6 md:px-9 md:pt-8">
            <div className="flex items-center gap-2 text-[10px] text-foreground/40"><Link to="/dashboard" className="hover:text-antique">{selectedProject?.title ?? "Your library"}</Link><ChevronRight size={11} /><span className="text-antique">{current.crumb}</span></div>
            <div className="mt-5 flex items-end justify-between gap-4 pb-5"><div><p className="flex items-center gap-2 font-tech text-[9px] uppercase tracking-[0.19em] text-antique"><current.icon size={13} /> StoryForge AI <span className="text-foreground/25">/</span> {current.crumb}</p><h1 className="mt-2 max-w-[820px] font-display text-3xl leading-tight text-foreground md:text-4xl">{current.title}</h1><p className="mt-2 text-sm text-foreground/55">{current.subtitle}</p></div><Button variant="ghost" size="icon" aria-label="Toggle navigation" className="text-foreground/65 lg:hidden" onClick={() => setMobileNavOpen(!mobileNavOpen)}>{mobileNavOpen ? <X /> : <Menu />}</Button></div>
            {mobileNavOpen && <nav className="-mx-5 flex gap-1 overflow-x-auto border-t border-foreground/10 px-4 py-2 lg:hidden">{navItems.map(({ to, label, icon: Icon }) => { const active = to === `/${view}`; return <Link key={to} to={to} data-status={active ? "active" : "inactive"} aria-current={active ? "page" : undefined} onClick={() => setMobileNavOpen(false)} className="flex shrink-0 items-center gap-2 px-3 py-2 text-[11px] text-foreground/65 hover:bg-royal/50 hover:text-foreground"><Icon size={14} />{label}</Link>; })}</nav>}
          </div>
          <div className="px-5 py-6 md:px-9 md:py-8">
            {notice && <p className={`mb-5 border px-4 py-3 text-sm ${noticeIsError ? "border-destructive/40 bg-destructive/10 text-foreground" : "border-antique/25 bg-antique/5 text-antique"}`} role={noticeIsError ? "alert" : "status"}>{notice}</p>}
            {projectsError && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs" role="alert"><span>Project list could not be loaded: {projectsError.message}</span><Button variant="outline" className="h-8 px-3 text-xs" onClick={retryProjects}>Try again</Button></div>}
            {previewOnly && <div className="mb-5 border border-antique/35 bg-antique/10 px-4 py-3 text-sm text-foreground/80" role="note"><strong className="font-tech text-[10px] uppercase tracking-[0.12em] text-antique">Preview module</strong><p className="mt-1 text-xs leading-5 text-foreground/65">This screen is illustrative only. Character, world, memory, continuity, and relationship data are not connected to the backend and are not saved.</p></div>}
            {previewOnly ? <fieldset disabled className="contents">{children}</fieldset> : children}
          </div>
        </main>
      </div>
      {projectEditorOpen && <ProjectEditor project={projectEditorProject} submitting={projectEditorSubmitting} error={projectEditorError} onClose={closeProjectEditor} onSubmit={submitProject} />}
    </div>
  );
}

function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return <div className="mb-4 flex items-center justify-between gap-4"><h2 className="font-display text-xl text-foreground">{children}</h2>{aside}</div>;
}

function Panel({ children, className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`glass-panel ${className}`} {...props}>{children}</section>;
}

function Stat({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Feather }) {
  return <Panel className="p-4"><div className="flex items-start justify-between"><span className="text-[11px] text-foreground/50">{label}</span><Icon size={15} className="text-antique/80" /></div><p className="mt-2 font-display text-3xl text-foreground">{value}</p><p className="mt-1 text-[10px] text-foreground/45">{detail}</p></Panel>;
}

function Dashboard() {
  const { data, isLoading, error, refetch } = useDashboard();
  const {
    projects,
    selectedProjectId,
    selectedProject,
    selectedProjectLoading,
    selectedProjectError,
    selectProject,
    openCreateProject,
    openEditProject,
    deleteProject,
    openConversation,
  } = useStudioContext();
  const recentProjects = data?.recent_projects ?? [];
  const selectedProjectSummary = recentProjects.find((project) => project.id === selectedProjectId)
    ?? projects.find((project) => project.id === selectedProjectId);
  const statistics = data?.statistics;
  const statCards = [
    { label: "Total projects", value: statistics?.total_projects, icon: BookOpen },
    { label: "Total chapters", value: statistics?.total_chapters, icon: BookText },
    { label: "Total conversations", value: statistics?.total_conversations, icon: MessageCircle },
    { label: "Indexed chunks", value: statistics?.total_indexed_chunks, icon: GitBranch },
  ];

  return <StudioLayout view="dashboard">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statCards.map(({ label, value, icon: Icon }) => isLoading && !data
        ? <Panel key={label} className="h-[106px] animate-pulse p-4" aria-label={`Loading ${label}`} role="status"><div className="h-3 w-24 rounded bg-foreground/10" /><div className="mt-4 h-7 w-16 rounded bg-foreground/10" /></Panel>
        : <Stat key={label} label={label} value={value === undefined ? "—" : value.toLocaleString()} detail="Reported by the backend" icon={Icon} />)}
    </div>
    {error && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs" role="alert"><span>Dashboard data could not be loaded: {error instanceof Error ? error.message : "The request failed."}</span><Button variant="outline" className="h-8 px-3 text-xs" onClick={() => void refetch()}>Try again</Button></div>}
    {!isLoading && !error && !data && <div className="mt-5 border border-foreground/10 p-5 text-sm text-foreground/60">Dashboard data is not available yet.</div>}

    <section className="mt-8">
      <SectionTitle aside={<Button variant="outline" className="h-8 border-antique/30 bg-transparent px-3 text-xs text-foreground hover:bg-royal/50" onClick={openCreateProject}><Plus size={13} /> New project</Button>}>Your projects</SectionTitle>
      {isLoading && !data ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <Panel key={item} className="h-52 animate-pulse p-5" role="status" aria-label="Loading project"><div className="h-4 w-2/3 rounded bg-foreground/10" /><div className="mt-5 h-3 w-full rounded bg-foreground/10" /></Panel>)}</div>
        : error && !data ? <Panel className="p-5 text-sm text-foreground/60">Project cards are unavailable while the dashboard request is failing.</Panel>
          : recentProjects.length === 0 ? <Panel className="flex flex-col items-start gap-3 p-6"><p className="text-sm text-foreground/65">No projects yet. Create a project to begin your library.</p><Button className="h-9 px-3 text-xs" onClick={openCreateProject}><Plus size={13} /> Create a project</Button></Panel>
            : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{recentProjects.map((project) => {
              const fullProject: Project = projects.find((item) => item.id === project.id) ?? project;
              return <Panel key={project.id} className="flex min-h-[220px] flex-col overflow-hidden">
                <div className="relative h-24 overflow-hidden border-b border-foreground/10"><img src={library} alt="" className="h-full w-full object-cover object-center opacity-50" /><div className="absolute inset-0 bg-gradient-to-r from-ink/80 to-transparent" /><span className="absolute bottom-3 left-4 font-tech text-[9px] uppercase tracking-[0.14em] text-antique">{project.genre || "Unspecified genre"}</span></div>
                <div className="flex flex-1 flex-col p-4"><h3 className="truncate font-display text-xl text-foreground">{project.title}</h3><p className="mt-1 line-clamp-2 min-h-9 text-xs leading-5 text-foreground/55">{project.description || "No description yet."}</p><div className="mt-auto flex flex-wrap items-center gap-2 pt-4"><Link to="/editor" onClick={() => selectProject(project.id)} className="inline-flex h-8 items-center gap-1 border border-antique/35 px-3 text-[11px] text-antique hover:bg-royal/50">Open editor <ArrowRight size={12} /></Link><Button variant="ghost" className="h-8 px-2 text-[11px] text-foreground/55 hover:text-antique" onClick={() => openEditProject(fullProject)}>Edit</Button><Button variant="ghost" className="h-8 px-2 text-[11px] text-foreground/55 hover:text-destructive" onClick={() => deleteProject(fullProject)}>Delete</Button></div></div>
              </Panel>;
            })}</div>}
    </section>

    <section className="mt-8 grid gap-4 xl:grid-cols-[1fr_1fr]">
      <Panel className="p-5">
        <SectionTitle>Selected project details</SectionTitle>
        {!selectedProjectId ? <p className="text-xs text-foreground/55">Choose a project from the selector to view its current details.</p>
          : selectedProjectLoading ? <p className="animate-pulse text-xs text-foreground/45" role="status">Loading project details…</p>
            : selectedProject ? <div><h3 className="font-display text-2xl">{selectedProject.title}</h3><p className="mt-2 text-xs leading-5 text-foreground/60">{selectedProject.description || "No description."}</p><p className="mt-3 font-tech text-[9px] uppercase tracking-wider text-antique">{selectedProject.genre || "Genre not set"}</p></div>
              : selectedProjectError ? <p className="text-xs text-destructive">{selectedProjectError.message}</p>
              : selectedProjectSummary ? <p className="text-xs text-foreground/55">Could not load the full project details.</p>
                : <p className="text-xs text-foreground/55">The selected project is not available.</p>}
      </Panel>
      <Panel className="p-5">
        <SectionTitle>Recent conversations</SectionTitle>
        {isLoading && !data ? <p className="animate-pulse text-xs text-foreground/45" role="status">Loading conversations…</p>
          : error && !data ? <p className="text-xs text-destructive">Recent conversations are unavailable.</p>
            : !data || data.recent_conversations.length === 0 ? <p className="text-xs text-foreground/55">No saved conversations yet.</p>
            : <div className="divide-y divide-foreground/10">{data.recent_conversations.map((conversation) => {
              const project = projects.find((item) => item.id === conversation.project_id)
                ?? recentProjects.find((item) => item.id === conversation.project_id);
              return <div key={conversation.id} className="flex items-center gap-3 py-3"><span className="grid size-8 shrink-0 place-items-center border border-antique/25 bg-royal/45 text-antique"><MessageCircle size={14} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs text-foreground/85">{project?.title ?? "Story conversation"}</p><time className="mt-1 block text-[10px] text-foreground/45" dateTime={conversation.created_at}>{formatDate(conversation.created_at)}</time></div><Link to="/assistant" onClick={() => openConversation(conversation.project_id, conversation.id)} className="text-[11px] text-antique hover:text-lavender">Open</Link></div>;
            })}</div>}
      </Panel>
    </section>
  </StudioLayout>;
}
function Characters() {
  const [selected, setSelected] = useState("Mira Vale");
  return <StudioLayout view="characters">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-foreground/50">Cast of <span className="text-antique">The Glass Kingdom</span></p><Button variant="outline" className="h-9 border-antique/30 bg-transparent text-xs text-foreground hover:bg-royal/50 hover:text-foreground" onClick={() => setSelected(selected === "Mira Vale" ? "Cael Thorn" : "Mira Vale")}><Plus size={14}/> Add character</Button></div>
    <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]"><Panel className="relative min-h-[410px] overflow-hidden"><img src={characterPortrait} width={1024} height={1024} alt="Mira Vale, cartographer of the Glass Kingdom" className="absolute inset-0 h-full w-full object-cover object-[center_35%] opacity-80"/><div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent"/><div className="relative flex min-h-[410px] flex-col justify-end p-6 md:p-8"><div className="mb-auto pt-5"><span className="glass-panel inline-flex items-center gap-2 px-3 py-1.5 font-tech text-[9px] uppercase tracking-[0.14em] text-antique"><Sparkles size={12}/> Character dossier · 01</span></div><h2 className="font-display text-5xl text-foreground">{selected}</h2><p className="mt-2 max-w-lg text-sm leading-6 text-foreground/70">A mapmaker who trusts the stars more than the crown. She draws the places she has not yet dared to visit.</p><div className="mt-5 flex flex-wrap gap-2">{["Cartographer", "Quietly defiant", "Keeps every promise"].map(tag=><span key={tag} className="border border-lavender/20 bg-ink/40 px-2.5 py-1 font-tech text-[9px] text-lavender">{tag}</span>)}</div></div></Panel>
      <div className="space-y-4"><Panel className="p-5"><SectionTitle>In their own words</SectionTitle><blockquote className="border-l border-antique/60 pl-4 font-display text-xl italic leading-7 text-foreground/80">“Every map is a small act of believing the world is bigger than your fear.”</blockquote><p className="mt-3 pl-4 font-tech text-[9px] uppercase tracking-[0.12em] text-antique">Mira · Chapter 03</p></Panel><Panel className="p-5"><SectionTitle>Known connections</SectionTitle><div className="space-y-3"><Link to="/relationships" className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-full bg-story-blue/20 font-display text-sm text-lavender">C</span><span className="flex-1"><span className="block text-xs">Cael Thorn</span><span className="text-[10px] text-foreground/45">An inconvenient alliance</span></span><span className="text-[9px] text-antique">UNCERTAIN</span></Link><Link to="/relationships" className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-full bg-antique/15 font-display text-sm text-antique">I</span><span className="flex-1"><span className="block text-xs">The Archivist</span><span className="text-[10px] text-foreground/45">A debt neither forgot</span></span><ChevronRight size={13} className="text-foreground/40"/></Link></div></Panel><Panel className="p-5"><div className="flex items-start gap-3"><Lightbulb size={15} className="mt-0.5 text-antique"/><div><p className="text-xs text-foreground/80">A small observation</p><p className="mt-1 text-[11px] leading-5 text-foreground/50">Mira’s patience runs out sooner around the royal guard. It has not been mentioned in her profile yet.</p></div></div></Panel></div></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">{[{name:"Mira Vale",role:"The cartographer",image:characterPortrait,tag:"POV · 6 chapters"},{name:"Cael Thorn",role:"The reluctant heir",image:"",tag:"ALLIANCE · 4 chapters"},{name:"The Archivist",role:"Keeper of the deep stacks",image:"",tag:"MYSTERY · 2 chapters"}].map((person,i)=><button type="button" onClick={()=>setSelected(person.name)} key={person.name} className={`flex min-h-[85px] items-center gap-3 border p-3 text-left transition-colors ${selected===person.name?"border-antique/50 bg-royal/35":"border-foreground/10 bg-ink/20 hover:border-lavender/25"}`}><span className="grid size-12 shrink-0 place-items-center overflow-hidden border border-lavender/15 bg-royal/50 font-display text-xl text-antique">{person.image?<img src={person.image} alt="" className="size-full object-cover object-top"/>:["","C","A"][i]}</span><span className="min-w-0"><span className="block truncate font-display text-lg text-foreground">{person.name}</span><span className="block text-[10px] text-foreground/50">{person.role}</span><span className="mt-1 block font-tech text-[8px] text-antique/75">{person.tag}</span></span></button>)}</div>
  </StudioLayout>;
}

function WorldBuilder() {
  const [location, setLocation] = useState("The Starfall Harbor");
  return <StudioLayout view="world">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-xs text-foreground/55"><Globe2 size={14} className="text-antique"/> The Glass Kingdom <ChevronRight size={12}/><span className="text-foreground/80">Northern Reach</span></div><Button variant="outline" className="h-9 border-antique/30 bg-transparent text-xs text-foreground hover:bg-royal/50 hover:text-foreground" onClick={() => setLocation(location === "The Starfall Harbor" ? "The Whispering Vale" : "The Starfall Harbor")}><Plus size={14}/> Add location</Button></div>
    <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]"><Panel className="relative min-h-[440px] overflow-hidden border-antique/20"><img src={atlas} width={1200} height={912} alt="Illustrated map of mountains, forests and kingdoms" className="absolute inset-0 h-full w-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-ink/15"/><div className="absolute left-[48%] top-[48%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"><span className="grid size-10 place-items-center rounded-full border border-antique/70 bg-ink/75 text-antique shadow-[0_0_30px_color-mix(in_oklab,var(--antique)_42%,transparent)]"><Compass size={19}/></span><span className="mt-2 whitespace-nowrap border border-ink/30 bg-ink/75 px-2 py-1 font-tech text-[9px] text-foreground">The Glass Citadel</span></div><div className="absolute left-[21%] top-[36%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"><button aria-label="Open The Starfall Harbor" onClick={() => setLocation("The Starfall Harbor")} className="grid size-7 place-items-center rounded-full border border-story-blue/70 bg-ink/80 text-story-blue transition-transform hover:scale-125"><span className="size-2 rounded-full bg-story-blue"/></button><span className="mt-2 whitespace-nowrap bg-ink/70 px-2 py-1 font-tech text-[9px] text-foreground">Starfall Harbor</span></div><div className="absolute right-4 top-4 glass-panel px-3 py-2 font-tech text-[8px] uppercase tracking-[0.15em] text-antique"><span className="mr-2 inline-block size-1.5 rounded-full bg-story-blue"/>2 story locations</div><div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-5 md:p-6"><div><span className="font-tech text-[9px] uppercase tracking-[0.15em] text-antique">The map room</span><h2 className="mt-1 font-display text-2xl text-foreground">Northern Reach</h2></div><div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Zoom map in" className="border-foreground/25 bg-ink/50 text-foreground hover:bg-royal"><Plus size={14}/></Button><Button variant="outline" size="icon" aria-label="Map settings" className="border-foreground/25 bg-ink/50 text-foreground hover:bg-royal"><Settings2 size={14}/></Button></div></div></Panel>
    <div className="space-y-4"><Panel className="p-5"><SectionTitle aside={<span className="font-tech text-[9px] text-antique">02 places</span>}>In this region</SectionTitle><div className="space-y-2">{[{name:"The Glass Citadel",kind:"The old capital",icon:Compass},{name:"The Starfall Harbor",kind:"Where the stars touch water",icon:Globe2},{name:"The Whispering Vale",kind:"Not yet explored",icon:Sparkles}].map(({name,kind,icon:Icon})=><button type="button" key={name} onClick={()=>setLocation(name)} className={`flex w-full items-center gap-3 border px-3 py-3 text-left transition-colors ${location===name?"border-antique/35 bg-royal/35":"border-transparent bg-ink/20 hover:bg-royal/25"}`}><Icon size={14} className={location===name?"text-antique":"text-foreground/40"}/><span className="min-w-0 flex-1"><span className="block text-xs text-foreground/85">{name}</span><span className="mt-0.5 block truncate text-[10px] text-foreground/45">{kind}</span></span><ChevronRight size={12} className="text-foreground/30"/></button>)}</div></Panel><Panel className="p-5"><span className="font-tech text-[9px] uppercase tracking-[0.16em] text-antique">Selected location</span><h3 className="mt-2 font-display text-2xl">{location}</h3><p className="mt-2 text-xs leading-5 text-foreground/55">A lantern-lit harbor on the edge of the old charts. Someone here remembers what fell from the sky.</p><div className="mt-4 flex gap-4 border-t border-foreground/10 pt-3 text-[10px] text-foreground/55"><span><UsersRound size={12} className="mr-1 inline text-lavender"/>2 characters</span><span><BookText size={12} className="mr-1 inline text-story-blue"/>1 chapter</span></div></Panel></div></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-3">{[{n:"The Glass Citadel",kind:"KINGDOM",desc:"A city built around a sea of silent mirrors."},{n:"House Vey",kind:"FACTION",desc:"Keepers of the old maps; loyal to no crown."},{n:"The Starfall Harbor",kind:"LOCATION",desc:"Where the stars touch water, and trade secrets."}].map(item=><Panel key={item.n} className="p-4"><p className="font-tech text-[8px] tracking-[0.16em] text-antique">{item.kind}</p><h3 className="mt-2 font-display text-lg">{item.n}</h3><p className="mt-1 text-[10px] leading-5 text-foreground/50">{item.desc}</p></Panel>)}</div>
  </StudioLayout>;
}

function StoryMemory() {
  return <StudioLayout view="memory">
    <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]"><Panel className="relative min-h-[230px] overflow-hidden p-6 md:p-8"><img src={library} alt="Rows of enchanted books in a library" width={1536} height={1024} className="absolute inset-0 h-full w-full object-cover object-center opacity-35"/><div className="absolute inset-0 bg-gradient-to-r from-ink/90 to-ink/60"/><div className="relative"><span className="font-tech text-[9px] uppercase tracking-[0.18em] text-antique">The living archive · Book I</span><h2 className="mt-3 font-display text-3xl">The Glass Kingdom</h2><p className="mt-2 max-w-md text-xs leading-5 text-foreground/60">A connected memory of the people, places, and promises that make your world whole.</p><div className="mt-6 flex flex-wrap gap-5">{[{n:"18",label:"characters"},{n:"12",label:"world notes"},{n:"07",label:"chapters"},{n:"02",label:"open threads"}].map(({n,label})=><div key={label}><p className="font-display text-2xl text-lavender">{n}</p><p className="font-tech text-[8px] uppercase tracking-wider text-foreground/45">{label}</p></div>)}</div></div></Panel><Panel className="flex flex-col justify-between p-5"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center border border-antique/30 bg-antique/10 text-antique"><BrainCircuit size={16}/></span><div><h3 className="font-display text-xl">A thread worth following</h3><p className="font-tech text-[8px] uppercase tracking-[0.15em] text-foreground/40">Found in your pages</p></div></div><p className="mt-4 font-display text-lg italic leading-6 text-foreground/80">Mira still carries the brass key from the harbor scene. No door has claimed it yet.</p><Link to="/editor" className="mt-4 flex items-center gap-2 border-t border-foreground/10 pt-3 text-xs text-antique">Visit the chapter <ArrowRight size={13}/></Link></Panel></div>
    <div className="mt-7 grid gap-5 xl:grid-cols-[1fr_1.2fr]"><div><SectionTitle aside={<span className="font-tech text-[9px] text-foreground/40">5 manuscripts</span>}>Shelved memories</SectionTitle><div className="space-y-2">{[{title:"The promise at low tide",type:"OPEN THREAD",chapter:"Chapter 02 · p. 14",icon:GitBranch,color:"text-story-blue"},{title:"Mira’s brass harbor key",type:"OBJECT · RECURRING",chapter:"Chapter 03 · p. 08",icon:Sparkles,color:"text-antique"},{title:"Cael avoids the western tower",type:"CHARACTER DETAIL",chapter:"Chapter 04 · p. 02",icon:UsersRound,color:"text-lavender"},{title:"Winter stars appear early",type:"WORLD NOTE",chapter:"Atlas · Northern Reach",icon:Compass,color:"text-story-blue"}].map(({title,type,chapter,icon:Icon,color})=><Panel key={title} className="flex items-center gap-3 p-4"><span className={`grid size-9 shrink-0 place-items-center border border-foreground/10 bg-royal/30 ${color}`}><Icon size={15}/></span><div className="min-w-0 flex-1"><span className="font-tech text-[8px] uppercase tracking-[0.14em] text-foreground/40">{type}</span><p className="mt-1 truncate text-xs text-foreground/85">{title}</p><p className="mt-1 text-[10px] text-foreground/45">{chapter}</p></div><ChevronRight size={13} className="text-foreground/30"/></Panel>)}</div></div>
    <div><SectionTitle aside={<span className="inline-flex items-center gap-1.5 font-tech text-[9px] text-story-blue"><span className="size-1.5 rounded-full bg-story-blue"/>CONNECTED</span>}>A page from the archive</SectionTitle><Panel className="min-h-[330px] overflow-hidden p-6 md:p-9"><div className="mx-auto max-w-[580px]"><div className="mb-7 flex items-center justify-between border-b border-antique/20 pb-3 font-tech text-[9px] uppercase tracking-[0.16em] text-antique"><span>Chapter III · The cartographer’s debt</span><span>Page 08</span></div><p className="font-display text-[17px] leading-8 text-foreground/75">The key was cold, though the harbor had been warm all afternoon. Mira rolled it across her palm, watching the light catch on the little crescent carved into its bow.</p><p className="mt-5 font-display text-[17px] leading-8 text-foreground/75">She had seen that shape before. On the western tower. On the map Cael said did not exist.</p><p className="mt-5 border-l border-antique/60 pl-4 font-display text-[15px] italic leading-7 text-lavender/80">Memory: The same crescent mark appears in The Glass Citadel location notes.</p><div className="mt-7 flex items-center gap-2 border-t border-foreground/10 pt-4 text-[10px] text-foreground/45"><Check size={13} className="text-story-blue"/> This detail connects to 2 other story notes.</div></div></Panel></div></div>
  </StudioLayout>;
}

function ContinuityLab() {
  const [filter, setFilter] = useState("All threads");
  return <StudioLayout view="continuity">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-foreground/50">Reading across <span className="text-antique">7 chapters</span> and <span className="text-antique">12 world notes</span></p><div className="flex gap-1 border border-foreground/10 bg-ink/30 p-1">{["All threads","Open","Resolved"].map(label=><button key={label} onClick={()=>setFilter(label)} className={`px-3 py-1.5 text-[10px] transition-colors ${filter===label?"bg-royal/70 text-foreground":"text-foreground/45 hover:text-foreground"}`}>{label}</button>)}</div></div>
    <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]"><Panel className="p-5 md:p-6"><div className="flex items-start justify-between"><div><span className="font-tech text-[9px] uppercase tracking-[0.15em] text-story-blue">01 · Timeline thread</span><h2 className="mt-2 font-display text-2xl">The winter that came early</h2></div><span className="border border-antique/25 bg-antique/10 px-2 py-1 font-tech text-[8px] text-antique">WORTH A LOOK</span></div><p className="mt-2 max-w-lg text-xs leading-5 text-foreground/55">Northern Reach notes place the first frost in late autumn. In Chapter 04, the river is described as frozen by midsummer.</p><div className="mt-6 space-y-4">{[{chapter:"WORLD NOTES",title:"The first frost usually comes in late autumn.",date:"Northern Reach · seasonal details",status:"Established"},{chapter:"CHAPTER 04",title:"The river held its winter breath beneath the summer sky.",date:"The Glass Kingdom · p. 06",status:"May be intentional"}].map(({chapter,title,date,status},i)=><div className="relative flex gap-4 pl-4" key={title}><span className={`absolute bottom-[-18px] left-0 top-1 w-px ${i===0?"bg-story-blue/70":"bg-transparent"}`}/><span className={`mt-1 size-2.5 shrink-0 rounded-full ring-4 ring-background ${i===0?"bg-story-blue":"bg-antique"}`}/><div className="min-w-0 flex-1 border-b border-foreground/10 pb-4"><span className="font-tech text-[8px] tracking-[0.12em] text-foreground/40">{chapter}</span><p className="mt-1 text-xs leading-5 text-foreground/80">{title}</p><div className="mt-2 flex justify-between gap-2 text-[9px] text-foreground/40"><span>{date}</span><span className={i===0?"text-story-blue":"text-antique"}>{status}</span></div></div></div>)}</div><div className="mt-5 flex gap-2"><Button className="h-8 rounded-none bg-royal px-3 text-[10px] text-foreground hover:bg-royal/75"><Check size={12}/> Mark intentional</Button><Link to="/editor" className="inline-flex h-8 items-center gap-2 px-3 text-[10px] text-foreground/65 hover:text-antique">Open chapter <ArrowUpRight size={12}/></Link></div></Panel>
    <div className="space-y-4"><Panel className="p-5"><SectionTitle aside={<span className="text-[9px] text-foreground/40">{filter==='Resolved'?"1 thread":"2 threads"}</span>}>Story threads</SectionTitle><div className="space-y-2">{[{title:"The winter that came early",type:"TIMELINE",status:"Review",color:"text-antique"},{title:"A promise without a witness",type:"CHARACTER MEMORY",status:"Open",color:"text-lavender"},{title:"The harbor key’s crescent mark",type:"STORY DETAIL",status:"Connected",color:"text-story-blue"}].filter((_,i)=>filter!=='Resolved'||i===2).map(({title,type,status,color})=><Link to="/memory" key={title} className="flex items-center gap-3 border border-foreground/10 px-3 py-3 hover:bg-royal/25"><GitBranch size={14} className={color}/><span className="min-w-0 flex-1"><span className="block truncate text-xs text-foreground/80">{title}</span><span className="mt-1 block font-tech text-[8px] tracking-[0.1em] text-foreground/40">{type}</span></span><span className={`text-[9px] ${color}`}>{status}</span></Link>)}</div></Panel><Panel className="p-5"><span className="flex items-center gap-2 font-tech text-[9px] uppercase tracking-[0.14em] text-antique"><Sparkles size={13}/> A gentle suggestion</span><p className="mt-3 font-display text-xl">Maybe the seasons are telling a story.</p><p className="mt-2 text-[11px] leading-5 text-foreground/55">The early frost could be a clue, a local superstition—or simply a detail to bring into focus.</p><Link to="/assistant" className="mt-4 flex items-center gap-2 text-xs text-lavender">Think it through <ArrowRight size={13}/></Link></Panel></div></div>
    <Panel className="mt-4 flex flex-wrap items-center justify-between gap-3 p-4"><span className="flex items-center gap-2 text-[10px] text-foreground/50"><span className="size-1.5 rounded-full bg-story-blue"/>Continuity reads are gentle prompts, not rules.</span><span className="font-tech text-[9px] text-foreground/40">Last considered · Today, 09:42</span></Panel>
  </StudioLayout>;
}

function ChapterEditor() {
  const { selectedProjectId, selectedProject } = useStudioContext();
  return <StudioLayout view="editor">{selectedProjectId
    ? <ConnectedChapterEditor key={selectedProjectId} projectId={selectedProjectId} projectTitle={selectedProject?.title ?? null} onDirtyChange={() => {}} />
    : <Panel className="p-8 text-center"><h2 className="font-display text-2xl">Choose a project</h2><p className="mt-2 text-sm text-foreground/55">Select a project above or create one to edit chapters.</p></Panel>}
  </StudioLayout>;
}
function StoryAssistant() {
  const { selectedProjectId, selectedProject, conversationIdForProject, setConversationId, startNewConversation } = useStudioContext();
  return <StudioLayout view="assistant"><ConnectedStoryAssistant key={selectedProjectId ?? "no-project"}
    projectId={selectedProjectId}
    projectTitle={selectedProject?.title ?? null}
    conversationId={selectedProjectId ? conversationIdForProject(selectedProjectId) : null}
    onConversationIdChange={setConversationId}
    onNewConversation={startNewConversation}
  /></StudioLayout>;
}
function RelationshipMap() {
  const [focus, setFocus] = useState("Mira Vale");
  const people = [{name:"Mira Vale",x:50,y:40,tag:"CARTOGRAPHER",color:"bg-violet"},{name:"Cael Thorn",x:25,y:70,tag:"HEIR",color:"bg-story-blue"},{name:"The Archivist",x:76,y:72,tag:"KEEPER",color:"bg-antique"},{name:"Sera of the Tide",x:84,y:24,tag:"HARBOR GUIDE",color:"bg-lavender"},{name:"The Glass Court",x:18,y:23,tag:"FACTION",color:"bg-royal"}];
  const edges = [{from:0,to:1,label:"uneasy alliance",x:36,y:54},{from:0,to:2,label:"old debt",x:64,y:55},{from:0,to:3,label:"shared secret",x:68,y:30},{from:1,to:4,label:"escaped from",x:19,y:47},{from:2,to:4,label:"keeps watch",x:46,y:73}];
  return <StudioLayout view="relationships">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs text-foreground/50"><UsersRound size={14} className="text-antique"/> 5 story connections <span className="text-foreground/20">·</span> <span className="text-story-blue">The Glass Kingdom</span></p><div className="flex gap-2"><Button variant="outline" className="h-8 border-foreground/15 bg-transparent text-[10px] text-foreground/65 hover:bg-royal/50 hover:text-foreground"><ChevronDown size={12}/> All characters</Button><Button variant="outline" size="icon" aria-label="Map settings" className="h-8 w-8 border-foreground/15 bg-transparent text-foreground/65 hover:bg-royal/50"><Settings2 size={13}/></Button></div></div>
    <div className="grid gap-4 xl:grid-cols-[1fr_270px]"><Panel className="relative min-h-[480px] overflow-hidden border-lavender/15 bg-[radial-gradient(ellipse_at_50%_45%,color-mix(in_oklab,var(--royal)_60%,transparent),transparent_70%)]"><div className="absolute inset-0 opacity-25" style={{backgroundImage:"radial-gradient(color-mix(in oklab,var(--lavender) 45%,transparent) 0.7px,transparent 0.7px)",backgroundSize:"22px 22px"}}/><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">{edges.map(edge=>{const from=people[edge.from];const to=people[edge.to];if(!from||!to)return null;return <g key={edge.label}><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="var(--lavender)" strokeOpacity=".35" strokeWidth=".35" strokeDasharray="1.5 1.5"/><circle cx={edge.x} cy={edge.y} r=".8" fill="var(--antique)"/></g>;})}</svg>{edges.map(edge=><span key={edge.label} className="pointer-events-none absolute hidden -translate-x-1/2 -translate-y-1/2 border border-lavender/10 bg-ink/75 px-2 py-1 font-tech text-[8px] text-foreground/50 md:block" style={{left:`${edge.x}%`,top:`${edge.y}%`}}>{edge.label}</span>)}{people.map((person,i)=><button key={person.name} type="button" onClick={()=>setFocus(person.name)} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-transform hover:scale-105" style={{left:`${person.x}%`,top:`${person.y}%`}}><span className={`grid size-12 place-items-center rounded-full border ${focus===person.name?"border-antique/80 shadow-[0_0_26px_color-mix(in_oklab,var(--violet)_40%,transparent)]":"border-lavender/25"} ${person.color} bg-opacity-30`}><span className="font-display text-lg text-foreground">{i===2?"A":person.name[0]}</span></span><span className="mt-2 whitespace-nowrap border border-ink/50 bg-ink/75 px-2 py-1 text-[10px] text-foreground/85">{person.name}</span><span className="mt-1 font-tech text-[7px] tracking-[0.1em] text-antique/70">{person.tag}</span></button>)}</Panel>
    <aside className="space-y-4"><Panel className="p-5"><span className="font-tech text-[9px] uppercase tracking-[0.15em] text-antique">Selected story thread</span><h2 className="mt-3 font-display text-2xl">{focus}</h2><p className="mt-1 text-[10px] text-foreground/45">{people.find(p=>p.name===focus)?.tag}</p><div className="mt-5 space-y-3 border-t border-foreground/10 pt-4">{edges.filter(e=>people[e.from]?.name===focus||people[e.to]?.name===focus).map(edge=>{const from=people[edge.from];const to=people[edge.to];if(!from||!to)return null;const related=from.name===focus?to.name:from.name;return <button key={edge.label} onClick={()=>setFocus(related)} className="flex w-full items-center gap-2 text-left"><span className="size-1.5 rounded-full bg-lavender"/><span className="min-w-0 flex-1 text-[11px] text-foreground/80">{related}</span><span className="text-right text-[9px] text-foreground/45">{edge.label}</span><ArrowUpRight size={11} className="text-antique"/></button>;})}</div></Panel><Panel className="p-4"><span className="flex items-center gap-2 font-tech text-[9px] uppercase tracking-[0.13em] text-lavender"><Sparkles size={12}/> A note in the margins</span><p className="mt-3 text-[11px] leading-5 text-foreground/55">Mira and the Archivist share a debt, but its beginning is still a blank page.</p><Link to="/memory" className="mt-3 flex items-center gap-2 text-[10px] text-antique">Open story memory <ArrowRight size={11}/></Link></Panel></aside></div>
  </StudioLayout>;
}

export function StudioPage({ view }: { view: StudioView }) {
  switch (view) {
    case "dashboard": return <Dashboard />;
    case "characters": return <Characters />;
    case "world": return <WorldBuilder />;
    case "memory": return <StoryMemory />;
    case "continuity": return <ContinuityLab />;
    case "editor": return <ChapterEditor />;
    case "assistant": return <StoryAssistant />;
    case "relationships": return <RelationshipMap />;
  }
}