// ─── Local JSON File Storage ──────────────────────────────────────────────────
// Modular storage layer that reads/writes JSON files locally.
// When migrating to AWS: swap this module for DynamoDB Document Client.
// The rest of the app never touches the filesystem directly.

import fs from "fs";
import path from "path";
import type {
  User,
  Sandbox,
  Session,
  Insight,
  AdvisorClient,
  ConnectionInvite,
  Meeting,
  Notification,
} from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), ".data");

// Ensure data directory exists
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ─── Generic JSON file helpers ────────────────────────────────────────────────

function readJson<T>(filePath: string, fallback: T): T {
  ensureDir(path.dirname(filePath));
  if (!fs.existsSync(filePath)) {
    writeJson(filePath, fallback);
    return fallback;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(filePath: string, data: T): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ─── Table paths ──────────────────────────────────────────────────────────────

const PATHS = {
  users: path.join(DATA_DIR, "users.json"),
  sandboxes: path.join(DATA_DIR, "sandboxes.json"),
  sessions: path.join(DATA_DIR, "sessions.json"),
  insights: path.join(DATA_DIR, "insights.json"),
  advisorClients: path.join(DATA_DIR, "advisor_clients.json"),
  connectionInvites: path.join(DATA_DIR, "connection_invites.json"),
  meetings: path.join(DATA_DIR, "meetings.json"),
  notifications: path.join(DATA_DIR, "notifications.json"),
  cache: path.join(DATA_DIR, "cache.json"),
};

// ─── Cache (replaces Redis) ───────────────────────────────────────────────────

interface CacheEntry {
  value: string;
  expiresAt: number | null; // epoch ms, null = no expiry
}

type CacheStore = Record<string, CacheEntry>;

function getCache(): CacheStore {
  return readJson<CacheStore>(PATHS.cache, {});
}

function setCache(store: CacheStore): void {
  writeJson(PATHS.cache, store);
}

export const cache = {
  get(key: string): string | null {
    const store = getCache();
    const entry = store[key];
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      delete store[key];
      setCache(store);
      return null;
    }
    return entry.value;
  },

  set(key: string, value: string, ttlSeconds?: number): void {
    const store = getCache();
    store[key] = {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    };
    setCache(store);
  },

  del(key: string): void {
    const store = getCache();
    delete store[key];
    setCache(store);
  },

  keys(pattern: string): string[] {
    const store = getCache();
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return Object.keys(store).filter((k) => regex.test(k));
  },
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = {
  getAll(): User[] {
    return readJson<User[]>(PATHS.users, []);
  },

  getById(id: string): User | null {
    return this.getAll().find((u) => u.id === id) ?? null;
  },

  getByClerkId(clerkId: string): User | null {
    return this.getAll().find((u) => u.clerkId === clerkId) ?? null;
  },

  getByEmail(email: string): User | null {
    return this.getAll().find((u) => u.email === email) ?? null;
  },

  create(user: User): User {
    const all = this.getAll();
    all.push(user);
    writeJson(PATHS.users, all);
    return user;
  },

  update(id: string, updates: Partial<User>): User | null {
    const all = this.getAll();
    const idx = all.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    writeJson(PATHS.users, all);
    return all[idx];
  },

  upsertByClerkId(clerkId: string, data: Partial<User>): User {
    const existing = this.getByClerkId(clerkId);
    if (existing) {
      return this.update(existing.id, data)!;
    }
    const newUser: User = {
      id: data.id || generateId("usr"),
      clerkId,
      email: data.email || "",
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      role: data.role || "client",
      onboardingComplete: data.onboardingComplete ?? false,
      profile: data.profile ?? null,
      advisorId: data.advisorId ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
    };
    return this.create(newUser);
  },
};

// ─── Sandboxes ────────────────────────────────────────────────────────────────

export const sandboxes = {
  getAll(): Sandbox[] {
    return readJson<Sandbox[]>(PATHS.sandboxes, []);
  },

  getById(id: string): Sandbox | null {
    return this.getAll().find((s) => s.id === id) ?? null;
  },

  getByUserId(userId: string): Sandbox[] {
    return this.getAll().filter((s) => s.userId === userId && !s.archived);
  },

  create(sandbox: Sandbox): Sandbox {
    const all = this.getAll();
    all.push(sandbox);
    writeJson(PATHS.sandboxes, all);
    return sandbox;
  },

  update(id: string, updates: Partial<Sandbox>): Sandbox | null {
    const all = this.getAll();
    const idx = all.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    writeJson(PATHS.sandboxes, all);
    return all[idx];
  },

  delete(id: string): boolean {
    return this.update(id, { archived: true }) !== null;
  },
};

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const sessions = {
  getAll(): Session[] {
    return readJson<Session[]>(PATHS.sessions, []);
  },

  getById(id: string): Session | null {
    return this.getAll().find((s) => s.id === id) ?? null;
  },

  getBySandboxId(sandboxId: string): Session[] {
    return this.getAll()
      .filter((s) => s.sandboxId === sandboxId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getByUserId(userId: string): Session[] {
    return this.getAll()
      .filter((s) => s.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getLatestForSandbox(sandboxId: string): Session | null {
    const all = this.getBySandboxId(sandboxId);
    return all[0] ?? null;
  },

  create(session: Session): Session {
    const all = this.getAll();
    all.push(session);
    writeJson(PATHS.sessions, all);
    return session;
  },

  update(id: string, updates: Partial<Session>): Session | null {
    const all = this.getAll();
    const idx = all.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates };
    writeJson(PATHS.sessions, all);
    return all[idx];
  },
};

// ─── Insights ─────────────────────────────────────────────────────────────────

export const insights = {
  getAll(): Insight[] {
    return readJson<Insight[]>(PATHS.insights, []);
  },

  getById(id: string): Insight | null {
    return this.getAll().find((i) => i.id === id) ?? null;
  },

  getBySandboxId(sandboxId: string): Insight[] {
    return this.getAll()
      .filter((i) => i.sandboxId === sandboxId)
      .sort((a, b) => {
        const pOrder = { high: 0, medium: 1, low: 2 };
        if (pOrder[a.priority] !== pOrder[b.priority])
          return pOrder[a.priority] - pOrder[b.priority];
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  },

  getByUserId(userId: string, scope?: string): Insight[] {
    return this.getAll()
      .filter((i) => i.userId === userId && (!scope || i.scope === scope))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  create(insight: Insight): Insight {
    const all = this.getAll();
    all.push(insight);
    writeJson(PATHS.insights, all);
    return insight;
  },

  createMany(newInsights: Insight[]): Insight[] {
    const all = this.getAll();
    all.push(...newInsights);
    writeJson(PATHS.insights, all);
    return newInsights;
  },

  update(id: string, updates: Partial<Insight>): Insight | null {
    const all = this.getAll();
    const idx = all.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates };
    writeJson(PATHS.insights, all);
    return all[idx];
  },
};

// ─── Advisor-Client Links ─────────────────────────────────────────────────────

export const advisorClients = {
  getAll(): AdvisorClient[] {
    return readJson<AdvisorClient[]>(PATHS.advisorClients, []);
  },

  getByAdvisorId(advisorId: string): AdvisorClient[] {
    return this.getAll().filter((ac) => ac.advisorId === advisorId);
  },

  getByClientId(clientId: string): AdvisorClient | null {
    return this.getAll().find((ac) => ac.clientId === clientId) ?? null;
  },

  getLink(advisorId: string, clientId: string): AdvisorClient | null {
    return (
      this.getAll().find(
        (ac) => ac.advisorId === advisorId && ac.clientId === clientId
      ) ?? null
    );
  },

  create(link: AdvisorClient): AdvisorClient {
    const all = this.getAll();
    all.push(link);
    writeJson(PATHS.advisorClients, all);
    return link;
  },

  removeByClientId(clientId: string): boolean {
    const all = this.getAll();
    const filtered = all.filter((ac) => ac.clientId !== clientId);
    if (filtered.length === all.length) return false;
    writeJson(PATHS.advisorClients, filtered);
    return true;
  },

  removeLink(advisorId: string, clientId: string): boolean {
    const all = this.getAll();
    const filtered = all.filter(
      (ac) => !(ac.advisorId === advisorId && ac.clientId === clientId)
    );
    if (filtered.length === all.length) return false;
    writeJson(PATHS.advisorClients, filtered);
    return true;
  },

  removeByUserId(userId: string): number {
    const all = this.getAll();
    const filtered = all.filter(
      (ac) => ac.advisorId !== userId && ac.clientId !== userId
    );
    const removed = all.length - filtered.length;
    if (removed > 0) writeJson(PATHS.advisorClients, filtered);
    return removed;
  },
};

// ─── Connection Invites ───────────────────────────────────────────────────────

export const connectionInvites = {
  getAll(): ConnectionInvite[] {
    return readJson<ConnectionInvite[]>(PATHS.connectionInvites, []);
  },

  getByToken(token: string): ConnectionInvite | null {
    return this.getAll().find((ci) => ci.token === token) ?? null;
  },

  getByAdvisorId(advisorId: string): ConnectionInvite[] {
    return this.getAll().filter((ci) => ci.advisorId === advisorId);
  },

  create(invite: ConnectionInvite): ConnectionInvite {
    const all = this.getAll();
    all.push(invite);
    writeJson(PATHS.connectionInvites, all);
    return invite;
  },

  update(id: string, updates: Partial<ConnectionInvite>): ConnectionInvite | null {
    const all = this.getAll();
    const idx = all.findIndex((ci) => ci.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates };
    writeJson(PATHS.connectionInvites, all);
    return all[idx];
  },
};

// ─── Meetings ─────────────────────────────────────────────────────────────────

export const meetings = {
  getAll(): Meeting[] {
    return readJson<Meeting[]>(PATHS.meetings, []);
  },

  getById(id: string): Meeting | null {
    return this.getAll().find((m) => m.id === id) ?? null;
  },

  getByAdvisorId(advisorId: string): Meeting[] {
    return this.getAll()
      .filter((m) => m.advisorId === advisorId && m.status !== "cancelled")
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  },

  getByClientId(clientId: string): Meeting[] {
    return this.getAll()
      .filter((m) => m.clientId === clientId && m.status !== "cancelled")
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  },

  create(meeting: Meeting): Meeting {
    const all = this.getAll();
    all.push(meeting);
    writeJson(PATHS.meetings, all);
    return meeting;
  },

  update(id: string, updates: Partial<Meeting>): Meeting | null {
    const all = this.getAll();
    const idx = all.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates };
    writeJson(PATHS.meetings, all);
    return all[idx];
  },

  delete(id: string): boolean {
    const all = this.getAll();
    const filtered = all.filter((m) => m.id !== id);
    if (filtered.length === all.length) return false;
    writeJson(PATHS.meetings, filtered);
    return true;
  },
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = {
  getAll(): Notification[] {
    return readJson<Notification[]>(PATHS.notifications, []);
  },

  getByUserId(userId: string): Notification[] {
    return this.getAll()
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getUnreadByUserId(userId: string): Notification[] {
    return this.getByUserId(userId).filter((n) => !n.read);
  },

  create(notification: Notification): Notification {
    const all = this.getAll();
    all.push(notification);
    writeJson(PATHS.notifications, all);
    return notification;
  },

  markRead(id: string): Notification | null {
    const all = this.getAll();
    const idx = all.findIndex((n) => n.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], read: true };
    writeJson(PATHS.notifications, all);
    return all[idx];
  },

  markAllRead(userId: string): void {
    const all = this.getAll();
    let changed = false;
    for (let i = 0; i < all.length; i++) {
      if (all[i].userId === userId && !all[i].read) {
        all[i] = { ...all[i], read: true };
        changed = true;
      }
    }
    if (changed) writeJson(PATHS.notifications, all);
  },
};

// ─── ID Generator ─────────────────────────────────────────────────────────────

export function generateId(prefix: string = "id"): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

// ─── Cache Key Builders (matches Redis key patterns) ──────────────────────────

export const CacheKeys = {
  sandboxState: (sandboxId: string) => `sandbox:state:${sandboxId}`,
  mcResult: (sandboxId: string, hash: string) => `mc:result:${sandboxId}:${hash}`,
  chatContext: (sessionId: string) => `chat:context:${sessionId}`,
  inviteToken: (token: string) => `invite:token:${token}`,
};
