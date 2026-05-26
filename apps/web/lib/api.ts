/**
 * Fetch wrapper for Laravel Sanctum SPA cookie auth.
 * - Always sends credentials (cookies)
 * - Reads XSRF-TOKEN cookie, sends as X-XSRF-TOKEN header on state-changing requests
 * - Calls /sanctum/csrf-cookie automatically before the first POST/PATCH/DELETE if no token
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&")}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

let csrfPrimed = false;

async function primeCsrf() {
  if (csrfPrimed) return;
  const res = await fetch(`${API_URL}/sanctum/csrf-cookie`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`csrf-cookie failed: ${res.status}`);
  csrfPrimed = true;
}

export type ApiError = {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
};

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const isWrite = method !== "GET" && method !== "HEAD";

  if (isWrite) {
    await primeCsrf();
  }

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("X-Requested-With", "XMLHttpRequest");

  if (isWrite) {
    const token = getCookie("XSRF-TOKEN");
    if (token) headers.set("X-XSRF-TOKEN", token);
    if (!(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
  }

  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err: ApiError = {
      status: res.status,
      message: (data as { message?: string }).message ?? res.statusText,
      errors: (data as { errors?: Record<string, string[]> }).errors,
    };
    throw err;
  }

  return data as T;
}

// ---------- Domain types ----------

export type Me = {
  id: number;
  username: string;
  email: string;
  display_name: string | null;
  bio: string | null;
  avatar_sha256: string | null;
  avatar_url: string | null;
  avatar_thumb: string | null;
  role: "member" | "contributor" | "moderator" | "admin";
  is_verified: boolean;
  show_questionable: boolean;
  birthdate: string | null;
  created_at: string;
};

export const me = {
  update: (input: { display_name?: string | null; bio?: string | null; show_questionable?: boolean; birthdate?: string | null }) =>
    api<{ user: Me }>("/api/me", { method: "PATCH", body: JSON.stringify(input) }),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("image", file);
    return api<{ user: Me }>("/api/me/avatar", { method: "POST", body: form });
  },

  removeAvatar: () => api<{ user: Me }>("/api/me/avatar", { method: "DELETE" }),
};

export type PostCard = {
  id: number;
  sha256: string;
  rating: "safe" | "questionable";
  width: number;
  height: number;
  score: number;
  fav_count: number;
  tag_count: number;
  thumb_url: string;
  sample_url: string;
  created_at: string;
};

export type PostFull = PostCard & {
  title: string | null;
  description: string | null;
  source_url: string | null;
  preview_url: string;
  original_url: string;
  file_size: number;
  ext: string;
  tag_string: string;
  comment_count: number;
  uploader: {
    id: number;
    username: string;
    display_name: string | null;
    avatar_thumb: string | null;
    is_verified: boolean;
  } | null;
};

// ---------- Convenience calls ----------

export const auth = {
  async me(): Promise<Me | null> {
    try {
      const data = await api<{ user: Me | null }>("/api/me");
      return data.user;
    } catch (e) {
      if ((e as ApiError).status === 401) return null;
      throw e;
    }
  },

  async register(input: {
    username: string;
    email: string;
    display_name?: string;
    password: string;
    password_confirmation: string;
  }) {
    return api("/auth/register", { method: "POST", body: JSON.stringify(input) });
  },

  async login(input: { login: string; password: string }) {
    return api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        login: input.login,
        email: input.login, // also send as `email` so Fortify's required-field check passes
        password: input.password,
      }),
    });
  },

  async logout() {
    return api("/auth/logout", { method: "POST" });
  },
};

export const posts = {
  list: (params?: { tags?: string; sort?: "new" | "top"; rating?: "safe" | "questionable" | "all"; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.tags) q.set("tags", params.tags);
    if (params?.sort) q.set("sort", params.sort);
    if (params?.rating) q.set("rating", params.rating);
    if (params?.page) q.set("page", String(params.page));
    return api<{ data: PostCard[]; meta: { page: number; per_page: number; total: number; last_page: number } }>(
      `/api/posts?${q.toString()}`
    );
  },
  get: (id: number) => api<{ post: PostFull }>(`/api/posts/${id}`),
  myList: () => api<{ data: PostCard[]; meta: { total: number } }>("/api/me/posts"),
  myStats: () => api<{ posts_total: number; posts_active: number; favs_received: number; score_total: number; followers: number; following: number }>("/api/me/stats"),
  upload: (form: FormData) => api<{ post: PostFull; was_dedupe: boolean }>("/api/posts", {
    method: "POST",
    body: form,
  }),
  favorite: (id: number) => api<{ favorited: boolean; fav_count: number }>(`/api/posts/${id}/favorite`, { method: "POST" }),
  unfavorite: (id: number) => api<{ favorited: boolean; fav_count: number }>(`/api/posts/${id}/favorite`, { method: "DELETE" }),
};

// ---------- Comments ----------

export type CommentNode = {
  id: number;
  body: string;
  parent_id: number | null;
  score: number;
  created_at: string;
  user: {
    id: number;
    username: string;
    display_name: string | null;
    avatar_thumb: string | null;
    is_verified: boolean;
  } | null;
};

export const comments = {
  list: (postId: number) =>
    api<{ data: CommentNode[]; meta: { total: number } }>(`/api/posts/${postId}/comments`),
  post: (postId: number, body: string, parentId?: number) =>
    api<{ comment: CommentNode }>(`/api/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body, parent_id: parentId ?? null }),
    }),
  delete: (id: number) => api(`/api/comments/${id}`, { method: "DELETE" }),

  // Blog variants — same shape, target is the blog slug instead of a post id.
  blogList: (slug: string) =>
    api<{ data: CommentNode[]; meta: { total: number } }>(`/api/blog/${encodeURIComponent(slug)}/comments`),
  blogPost: (slug: string, body: string, parentId?: number) =>
    api<{ comment: CommentNode }>(`/api/blog/${encodeURIComponent(slug)}/comments`, {
      method: "POST",
      body: JSON.stringify({ body, parent_id: parentId ?? null }),
    }),
};

// ---------- Notifications ----------

export type Notification = {
  id: number;
  type: "follow" | "reply" | "mention" | "badge_awarded" | string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export const notifications = {
  list: () => api<{ data: Notification[]; meta: { unread_count: number } }>("/api/me/notifications"),
  unreadCount: () => api<{ count: number }>("/api/me/notifications/unread-count"),
  markRead: (ids?: number[], all?: boolean) =>
    api<{ marked: number }>("/api/me/notifications/read", {
      method: "POST",
      body: JSON.stringify(all ? { all: true } : { ids: ids ?? [] }),
    }),
};

export const tags = {
  autocomplete: (q: string, category?: TagCategory) => {
    const qs = new URLSearchParams({ q });
    if (category) qs.set("category", category);
    return api<{ data: Array<{ id: number; name: string; category: string; post_count: number }> }>(
      `/api/tags/autocomplete?${qs.toString()}`
    );
  },
  list: (params?: { category?: string; sort?: "name" | "count" }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set("category", params.category);
    if (params?.sort) q.set("sort", params.sort);
    return api<{ data: Array<{ id: number; name: string; category: string; post_count: number }> }>(
      `/api/tags?${q.toString()}`
    );
  },
};

// ---------- Admin / Moderator ----------

export type TagCategory = "general" | "artist" | "copyright" | "character" | "meta";

export type AdminPost = PostCard & {
  preview_url: string;
  tag_string: string;
  title: string | null;
  description: string | null;
  source_url: string | null;
  uploader: { id: number; username: string; display_name: string | null } | null;
};

export type AdminUserRow = {
  id: number;
  username: string;
  email: string;
  display_name: string | null;
  role: "member" | "contributor" | "moderator" | "admin";
  post_count: number;
  created_at: string;
  email_verified: boolean;
};

export type AdminTagRow = {
  id: number;
  name: string;
  category: TagCategory;
  post_count: number;
  is_locked: boolean;
};

export const admin = {
  stats: () => api<{
    pending_posts: number;
    flagged_posts: number;
    active_posts: number;
    total_users: number;
    open_reports: number;
  }>("/api/admin/stats"),

  pending: () => api<{ data: AdminPost[]; meta: { page: number; total: number; last_page: number } }>(
    "/api/admin/pending"
  ),

  approve: (id: number, reason?: string) =>
    api<{ post_id: number; status: string }>(`/api/admin/posts/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ reason: reason ?? null }),
    }),

  reject: (id: number, reason: string) =>
    api<{ post_id: number; status: string }>(`/api/admin/posts/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  users: (params?: { q?: string; role?: string }) => {
    const q = new URLSearchParams();
    if (params?.q) q.set("q", params.q);
    if (params?.role) q.set("role", params.role);
    return api<{ data: AdminUserRow[]; meta: { total: number } }>(`/api/admin/users?${q.toString()}`);
  },

  setRole: (id: number, role: AdminUserRow["role"]) =>
    api<{ user_id: number; role: string }>(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  banUser: (id: number, reason?: string) =>
    api<{ user_id: number; banned: boolean }>(`/api/admin/users/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ reason: reason ?? null }),
    }),

  tags: (params?: { q?: string; category?: TagCategory }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.category) qs.set("category", params.category);
    return api<{ data: AdminTagRow[]; meta: { total: number } }>(`/api/admin/tags?${qs.toString()}`);
  },

  createTag: (input: { name: string; category: TagCategory; is_locked?: boolean }) =>
    api<{ tag: AdminTagRow }>("/api/admin/tags", { method: "POST", body: JSON.stringify(input) }),

  updateTag: (id: number, input: { category?: TagCategory; is_locked?: boolean; description?: string | null }) =>
    api<{ tag: AdminTagRow }>(`/api/admin/tags/${id}`, { method: "PATCH", body: JSON.stringify(input) }),

  deleteTag: (id: number) =>
    api<{ deleted: boolean; name: string }>(`/api/admin/tags/${id}`, { method: "DELETE" }),
};

export const postsDelete = (id: number) => api(`/api/posts/${id}`, { method: "DELETE" });

// ---------- Discovery / search ----------

export type TagCard = {
  id: number;
  name: string;
  category: TagCategory;
  post_count: number;
  view_count: number;
  fav_total: number;
  cover_url: string | null;
  cover_thumb: string | null;
  cover_hero?: string | null;
  description?: string | null;
  public_path: string;
  // Anime-only enrichment (present on /api/anime + /api/home)
  score?: number;
  year_start?: number | null;
  episodes?: number | null;
  mal_rank?: number | null;
  // Character-only enrichment
  favorites_count?: number;
  display_name?: string;
};

export type SearchUserHit = {
  id: number;
  username: string;
  display_name: string | null;
};

export type AnimeInfo = {
  mal_id: number;
  title_english: string | null;
  title_japanese: string | null;
  title_romaji: string | null;
  synopsis: string | null;
  year_start: number | null;
  season: string | null;
  episodes: number | null;
  status: string | null;
  media_type: string | null;
  source: string | null;
  age_rating: string | null;
  duration_min: number | null;
  aired_from: string | null;
  aired_to: string | null;
  score: number;
  scored_by: number | null;
  mal_rank: number | null;
  popularity_rank: number | null;
  members_count: number | null;
  favorites_count: number | null;
  studios: string | null;
  producers: string | null;
  genres: string[];
  themes: string[];
  demographics: string[];
  cover_url: string | null;
  trailer_youtube_id: string | null;
  streaming_links: Array<{ name: string; url: string }>;
};

export type CharacterInfo = {
  mal_id: number;
  name_english: string | null;
  name_japanese: string | null;
  description: string | null;
  favorites_count: number | null;
  image_url: string | null;
};

export type AnimeCharacterChip = {
  id: number;
  name: string;
  display_name: string;
  image_url: string | null;
  favorites_count: number;
  role: string | null;
  public_path: string;
};

export type CharacterAppearance = {
  id: number;
  name: string;
  display_name: string;
  cover_url: string | null;
  year_start: number | null;
  score: number;
  role: string | null;
  public_path: string;
};

export type TagDetailFull = {
  tag: TagCard & { description: string | null; cover_hero: string | null };
  anime_info: AnimeInfo | null;
  character_info: CharacterInfo | null;
  characters: AnimeCharacterChip[];
  appears_in: CharacterAppearance[];
  posts: PostCard[];
  meta: { total_posts: number };
};

export const discovery = {
  home: () => api<{
    anime: TagCard[];
    characters: TagCard[];
    tags: TagCard[];
    posts: PostCard[];
  }>("/api/home"),

  anime: (sort: "views" | "favs" | "posts" | "name" | "score" | "popular" = "popular", opts: { genre?: string; year?: number; q?: string; page?: number; per_page?: number } = {}) => {
    const sp = new URLSearchParams({ sort });
    if (opts.genre) sp.set("genre", opts.genre);
    if (opts.year)  sp.set("year",  String(opts.year));
    if (opts.q)     sp.set("q",     opts.q);
    if (opts.page)  sp.set("page",  String(opts.page));
    if (opts.per_page) sp.set("per_page", String(opts.per_page));
    return api<{ data: TagCard[]; meta: { total: number; page: number; last_page: number } }>(`/api/anime?${sp}`);
  },

  characters: (sort: "views" | "favs" | "posts" | "name" = "views", opts: { q?: string; page?: number; per_page?: number } = {}) => {
    const sp = new URLSearchParams({ sort });
    if (opts.q)     sp.set("q",     opts.q);
    if (opts.page)  sp.set("page",  String(opts.page));
    if (opts.per_page) sp.set("per_page", String(opts.per_page));
    return api<{ data: TagCard[]; meta: { total: number; page: number; last_page: number } }>(`/api/characters?${sp}`);
  },

  artists: (sort: "views" | "favs" | "posts" | "name" = "posts") =>
    api<{ data: TagCard[]; meta: { total: number } }>(`/api/artists?sort=${sort}`),

  topTags: (sort: "views" | "favs" | "posts" | "name" = "posts") =>
    api<{ data: TagCard[]; meta: { total: number } }>(`/api/tags/top?sort=${sort}`),

  genres: () => api<{ data: Array<{ name: string; count: number }> }>("/api/genres"),

  tagDetail: (kind: "anime" | "characters" | "tag", name: string) =>
    api<TagDetailFull>(`/api/${kind}/${encodeURIComponent(name)}`),

  search: (q: string) =>
    api<{ tags: TagCard[]; posts: PostCard[]; users: SearchUserHit[] }>(
      `/api/search?q=${encodeURIComponent(q)}`
    ),
};

// Admin: tag cover upload
export const adminTagCover = {
  upload: (tagId: number, file: File) => {
    const form = new FormData();
    form.append("image", file);
    return api<{ tag: AdminTagRow & { cover_url: string | null } }>(`/api/admin/tags/${tagId}/cover`, {
      method: "POST",
      body: form,
    });
  },
  remove: (tagId: number) =>
    api<{ tag: AdminTagRow }>(`/api/admin/tags/${tagId}/cover`, { method: "DELETE" }),
};

// ---------- Badges + Follows ----------

export type BadgeChip = {
  slug: string;
  name: string;
  icon: string;
  color: string;
  description?: string | null;
};

export type Profile = {
  id: number;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_sha256: string | null;
  avatar_url: string | null;
  avatar_thumb: string | null;
  role: string;
  is_verified: boolean;
  created_at: string;
  post_count: number;
  follower_count: number;
  following_count: number;
  badges: BadgeChip[];
  achievements: AchievementProgress[];
  is_following: boolean;
  is_me: boolean;
};

export type AchievementProgress = {
  slug: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  earned: boolean;
  awarded_at: string | null;
  /** 0..1 — for both earned (1) and locked (0..1) */
  progress: number;
  current: number | null;
  goal: number | null;
};

export const follow = {
  add: (username: string) =>
    api<{ following: boolean; follower_count: number }>(`/api/users/${username}/follow`, { method: "POST" }),
  remove: (username: string) =>
    api<{ following: boolean; follower_count: number }>(`/api/users/${username}/follow`, { method: "DELETE" }),
  feed: () => api<{ data: PostCard[]; meta: { total: number; page: number } }>("/api/feed"),
  followers: (username: string) =>
    api<{ data: Array<{ id: number; username: string; display_name: string | null }> }>(`/api/users/${username}/followers`),
  following: (username: string) =>
    api<{ data: Array<{ id: number; username: string; display_name: string | null }> }>(`/api/users/${username}/following`),
};

export const adminBadges = {
  list: () => api<{ data: BadgeChip[] }>("/api/admin/badges"),
  award: (userId: number, badgeSlug: string) =>
    api<{ awarded: boolean; badge: BadgeChip }>(`/api/admin/users/${userId}/badges`, {
      method: "POST",
      body: JSON.stringify({ badge_slug: badgeSlug }),
    }),
  revoke: (userId: number, badgeSlug: string) =>
    api<{ revoked: boolean; badge: BadgeChip }>(`/api/admin/users/${userId}/badges/${badgeSlug}`, {
      method: "DELETE",
    }),
};

// ============== Blog ==============
export type BlogAuthor = {
  id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  bio?: string | null;
};

export type BlogPostCard = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  cover_url: string | null;
  status: "draft" | "pending" | "published";
  view_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author?: BlogAuthor;
};

export type BlogPostFull = BlogPostCard & { body: string; author: BlogAuthor };

export const blog = {
  list: (page = 1, perPage = 12, author?: string) => {
    const sp = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (author) sp.set("author", author);
    return api<{ data: BlogPostCard[]; meta: { page: number; last_page: number; total: number } }>(
      `/api/blog?${sp}`
    );
  },
  show: (slug: string) => api<{ post: BlogPostFull }>(`/api/blog/${slug}`),
  mine: () => api<{ data: BlogPostCard[] }>("/api/blog/me/list"),
  create: (data: { title: string; body: string; excerpt?: string; cover_url?: string }) =>
    api<{ post: BlogPostFull }>("/api/blog", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<{ title: string; body: string; excerpt: string; cover_url: string }>) =>
    api<{ post: BlogPostFull }>(`/api/blog/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (id: number) => api<{ ok: true }>(`/api/blog/${id}`, { method: "DELETE" }),
};

export const adminBlog = {
  pending: () => api<{ data: BlogPostFull[] }>("/api/admin/blog/pending"),
  approve: (id: number) => api<{ post: BlogPostFull }>(`/api/admin/blog/${id}/approve`, { method: "POST" }),
  reject:  (id: number) => api<{ ok: true }>(`/api/admin/blog/${id}/reject`, { method: "POST" }),
};

// ============== Anime list / watchlist ==============
export type AnimeListStatus = "watching" | "planning" | "completed" | "on_hold" | "dropped";

export type AnimeListEntry = {
  id: number;
  status: AnimeListStatus;
  is_favorite: boolean;
  user_score: number | null;
  episodes_watched: number;
  started_at: string | null;
  finished_at: string | null;
  notes: string | null;
  updated_at: string;
  anime: {
    id: number;
    name: string;
    title: string;
    cover_url: string | null;
    score: number;
    episodes: number | null;
    year: number | null;
    mal_rank: number | null;
    public_path: string;
  } | null;
};

export const animeList = {
  mine: (status?: AnimeListStatus) =>
    api<{ data: AnimeListEntry[] }>(`/api/me/list${status ? `?status=${status}` : ""}`),
  forUser: (username: string, status?: AnimeListStatus) =>
    api<{ data: AnimeListEntry[] }>(`/api/users/${username}/list${status ? `?status=${status}` : ""}`),
  stats: () => api<{ by_status: Record<AnimeListStatus, number>; total: number; favorite_count: number }>("/api/me/list/stats"),
  get: (name: string) => api<{ entry: AnimeListEntry | null }>(`/api/me/list/anime/${encodeURIComponent(name)}`),
  upsert: (name: string, body: Partial<{ status: AnimeListStatus; is_favorite: boolean; user_score: number; episodes_watched: number; started_at: string; finished_at: string; notes: string }>) =>
    api<{ entry: AnimeListEntry }>(`/api/me/list/anime/${encodeURIComponent(name)}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (name: string) =>
    api<{ ok: true }>(`/api/me/list/anime/${encodeURIComponent(name)}`, { method: "DELETE" }),
};
