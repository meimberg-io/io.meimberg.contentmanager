// Status Check Types
export interface StatusCheck {
  completed: boolean;
  timestamp?: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
  manuallyConfirmed?: boolean;
  errorMessage?: string;
}

export type PostContentType = 'blog' | 'article'

/** Blog body prompt variant (Storyblok bleibt `blog`; nur KI-Prompt) */
export type BlogBodyVariant = 'short' | 'long'

/** UI: Artikel vs. Blog-Kurz vs. Blog-Lang */
export type EditorKind = 'article' | 'blog_short' | 'blog_long'

// Main Blog Post Model
export interface BlogPost {
  id: string;              // Storyblok UUID
  storyblokId: string;     // Numeric story ID for Management API
  slug: string;            // URL slug
  contentType: PostContentType
  /** Nur bei contentType blog; steuert Short/Long-Prompt */
  blogBodyVariant?: BlogBodyVariant
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
  // Origin: how the post was created
  origin?: 'import' | 'create';
  // AI settings (persisted per post)
  aiHint?: string;            // Additional AI hint
  imagePrompt?: string;       // DALL-E image prompt
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

/**
 * LinkedIn Post Model (MICM-8, Variante C).
 *
 * A LinkedIn post is its own entity, stored as a `linkedin_post` story in the
 * `linkedin/` folder (draft-only, never published to the public website).
 * It either stands alone or references a blog story as its parent via
 * `blogParentUuid` (one-directional LinkedIn -> Blog). The BlogPost type is
 * intentionally left unchanged.
 */
export interface LinkedinPost {
  id: string;              // Storyblok UUID
  storyblokId: string;     // Numeric story ID for Management API
  slug: string;            // URL slug (folder-internal, not public)
  name: string;            // Story name
  // Content
  linkedinText: string;    // Plain text with line breaks
  linkedinImage?: string;  // Asset URL (standalone posts only)
  // Source material (mirrored from the parent blog for attached posts)
  sourceRaw?: string;
  sourceSummarized?: string;
  aiHint?: string;
  imagePrompt?: string;    // DALL-E prompt (standalone posts)
  tags?: string[];         // Categorization tags (Content-Manager-internal)
  // Origin: how the post was created
  origin?: 'import' | 'create';
  // Parent reference — empty/undefined = standalone, set = attached to a blog
  blogParentUuid?: string;
  // Status
  status: {
    contentComplete: StatusCheck;
    publishedLinkedIn: StatusCheck;
  };
  // Publer
  publerPostIds?: string[];
  publerPublishedAt?: string;
  /** Publer label = posting slot/series (MICM-13). Defaults to "Standard". */
  publerLabel?: string;
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

// ── Scheduler (MICM-14) ──────────────────────────────────────────────────────
/** What kind of story a queue entry points at. */
export type ScheduleEntryType = 'blog' | 'article' | 'linkedin'

/**
 * A recurring weekly publishing slot.
 * `weekday` follows the JS `Date.getDay()` convention: 0 = Sonntag … 6 = Samstag.
 * `time` is "HH:MM" (24h), interpreted in the schedule's `timezone`.
 */
export interface ScheduleSlot {
  weekday: number;
  time: string;
}

/** One queued item waiting to be published into the schedule's next free slot. */
export interface ScheduleQueueEntry {
  storyUuid: string;
  typ: ScheduleEntryType;
}

/**
 * A publishing schedule: a set of recurring weekly slots plus an ordered queue
 * of posts that drain into those slots (MICM-14). Stored in the app config
 * (`contentmanager_config` → settings.schedules), not in a Storyblok component.
 */
export interface Schedule {
  id: string;
  name: string;
  /** IANA timezone; currently fixed to "Europe/Berlin" (no UI selection, MICM-15). */
  timezone: string;
  slots: ScheduleSlot[];
  /** Ordered publishing queue; head goes out first. Empty until MICM-18. */
  queue: ScheduleQueueEntry[];
  /** ISO timestamp of the most recently processed slot occurrence; null = never fired. Set by the engine (MICM-17). */
  lastFiredAt: string | null;
}
