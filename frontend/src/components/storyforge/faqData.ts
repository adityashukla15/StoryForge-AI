export const faqCategories = [
  "Getting Started",
  "Projects & Writing",
  "AI Features",
  "Account & Security",
  "Troubleshooting",
] as const;

export type FaqCategory = (typeof faqCategories)[number];

export type FaqItem = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
};

export const faqItems: FaqItem[] = [
  {
    id: "what-is-storyforge",
    category: "Getting Started",
    question: "What is StoryForge AI?",
    answer: "StoryForge AI helps writers organize story projects and chapters, develop ideas, and get AI-assisted help with questions about their writing.",
  },
  {
    id: "create-a-story",
    category: "Getting Started",
    question: "How do I create a new story?",
    answer: "Open your dashboard and choose New story to create a project. Add a title and, if you like, a description and genre.",
  },
  {
    id: "find-projects",
    category: "Getting Started",
    question: "Where can I find my existing projects?",
    answer: "Your projects are listed in your dashboard. You can also choose a project from the selector in the navbar.",
  },
  {
    id: "open-a-project",
    category: "Projects & Writing",
    question: "How do I open an existing project?",
    answer: "Choose Open editor on a project in your dashboard, or find it with navbar search. Selecting a search result opens the Chapter Editor for that project.",
  },
  {
    id: "edit-chapters",
    category: "Projects & Writing",
    question: "Can I edit my chapters?",
    answer: "Yes. Open the Chapter Editor for a project to create chapters, edit their titles and content, or upload a TXT or PDF manuscript.",
  },
  {
    id: "search-projects",
    category: "Projects & Writing",
    question: "Can I search for a particular project?",
    answer: "Yes. Select the navbar search icon and enter part of a project title, description, or genre. Choose a result to open that project's editor.",
  },
  {
    id: "story-assistant",
    category: "AI Features",
    question: "What is the Story AI Assistant?",
    answer: "The Story AI Assistant answers story-related questions using relevant passages from chapters in your selected project and can help you think through your writing.",
  },
  {
    id: "character-studio",
    category: "AI Features",
    question: "What is Character Studio?",
    answer: "Character Studio is a preview area for exploring story characters. It is illustrative; character data is not connected to the backend or saved yet.",
  },
  {
    id: "world-builder",
    category: "AI Features",
    question: "What is World Builder?",
    answer: "World Builder is a preview area for exploring fictional settings and world details. Its data is not connected to the backend or saved yet.",
  },
  {
    id: "story-memory",
    category: "AI Features",
    question: "What is Story Memory?",
    answer: "Story Memory is a preview area for story context and remembered details. It is illustrative; its data is not connected to the backend or saved yet.",
  },
  {
    id: "continuity-lab",
    category: "AI Features",
    question: "Is Continuity Lab available?",
    answer: "Continuity Lab is currently a preview module. Its story-consistency examples are illustrative and are not connected to saved project data.",
  },
  {
    id: "log-out",
    category: "Account & Security",
    question: "How do I log out?",
    answer: "Open your profile menu in the navbar and select Logout. The app asks you to confirm before signing you out.",
  },
  {
    id: "account-information",
    category: "Account & Security",
    question: "Is my account information connected to my profile?",
    answer: "Your profile displays information associated with your authenticated account, such as your name or email address.",
  },
  {
    id: "projects-not-appearing",
    category: "Troubleshooting",
    question: "Why are my projects not appearing?",
    answer: "Check your internet connection and confirm you are signed in to the correct account. If the project list failed to load, use Try again or refresh the dashboard.",
  },
  {
    id: "ai-feature-unavailable",
    category: "Troubleshooting",
    question: "Why is an AI feature unavailable?",
    answer: "Some modules are previews and are not connected to saved story data. The Story AI Assistant is the currently connected AI feature; check the label on a module for its availability.",
  },
];
