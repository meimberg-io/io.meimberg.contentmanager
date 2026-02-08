// Status Check Types
export interface StatusCheck {
  completed: boolean;
  timestamp?: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
  manuallyConfirmed?: boolean;
  errorMessage?: string;
}

// Main Blog Post Model
export interface BlogPost {
  id: string;              // Storyblok UUID
  storyblokId: string;     // Numeric story ID for Management API
  slug: string;            // URL slug
  // Blog content fields
  pagetitle: string;
  pageintro: string;
  date: string;
  headerpicture?: string;  // Asset URL
  teasertitle: string;
  teaserimage?: string;    // Asset URL
  readmoretext: string;
  abstract: string;
  hasBody: boolean;        // Whether body bloks exist (derived from body.length)
  body: any[];             // Raw Storyblok body blocks array
  // Source material (from Plaud import via email)
  sourceRaw?: string;         // Original Plaud transcription (raw)
  sourceSummarized?: string;  // Plaud summary
  // Status
  status: {
    contentComplete: StatusCheck;
    published: StatusCheck;
    publishedPubler: StatusCheck;
  };
  // Publer fields (kept)
  publerPostIds?: string[];
  // Timestamps
  createdAt: string;
  lastModified: string;
}

// User Type
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'editor' | 'viewer';
}

// Settings
export interface Settings {
  aiPrompts: {
    titlePrompt: string;
    captionPrompt: string;
    tagsPrompt: string;
  };
  apiKeys: {
    openai: string;
    publer: string;
  };
  publishing: {
    publerChannels: string[];
    publerPostTemplate: string;
  };
  userManagement: {
    whitelist: string[];
  };
}

// Filter State
export interface PostFilters {
  searchQuery: string;
  statusFilters: {
    contentComplete: boolean;
    published: boolean;
    publishedPubler: boolean;
  };
  sortBy: 'name-asc' | 'name-desc' | 'date-newest' | 'date-oldest' | 'status';
  viewMode: 'grid' | 'list';
  itemsPerPage: 20 | 50 | 100;
  currentPage: number;
}

// Recent Activity
export interface ActivityItem {
  id: string;
  postId: string;
  postTitle: string;
  action: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
}
