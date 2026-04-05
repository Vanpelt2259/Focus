import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, desc } from "drizzle-orm";
import {
  users, tasks, focusSessions, nudges, timerRecords,
  calendarEvents, dailyReports, taskLikes,
  type User, type InsertUser,
  type Task, type InsertTask,
  type FocusSession, type InsertFocusSession,
  type Nudge, type InsertNudge,
  type TimerRecord, type InsertTimerRecord,
  type CalendarEvent, type InsertCalendarEvent,
  type DailyReport, type InsertDailyReport,
  type TaskLike, type InsertTaskLike,
} from "@shared/schema";

// ── Database setup ─────────────────────────────────────────────────────────────
// PostgreSQL (Railway) when DATABASE_URL is set, raw SQLite otherwise (local dev)

let db: ReturnType<typeof drizzlePg> | null = null;
let sqliteDb: any = null; // better-sqlite3 Database instance

if (process.env.DATABASE_URL) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  db = drizzlePg(pool);
  console.log("[db] Using PostgreSQL");
} else {
  // Lazy-import better-sqlite3 (not available on Railway where pg is used)
  const Database = require("better-sqlite3");
  sqliteDb = new Database("focusbuddy.db");
  console.log("[db] Using SQLite");

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar_initials TEXT NOT NULL,
      avatar_color TEXT NOT NULL DEFAULT '#7C3AED',
      timezone TEXT NOT NULL DEFAULT 'UTC',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS focus_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      host_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      room_code TEXT UNIQUE NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      max_participants INTEGER NOT NULL DEFAULT 8,
      participant_ids TEXT NOT NULL DEFAULT '[]',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at TEXT
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'general',
      is_public INTEGER NOT NULL DEFAULT 0,
      is_completed INTEGER NOT NULL DEFAULT 0,
      estimated_minutes INTEGER NOT NULL DEFAULT 25,
      actual_minutes INTEGER,
      scheduled_date TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS nudges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      task_id INTEGER,
      message TEXT NOT NULL,
      nudge_type TEXT NOT NULL DEFAULT 'encouragement',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS timer_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      task_id INTEGER,
      duration_minutes INTEGER NOT NULL,
      completed_cycles INTEGER NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#7C3AED',
      linked_task_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS daily_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      tasks_completed INTEGER NOT NULL DEFAULT 0,
      tasks_planned INTEGER NOT NULL DEFAULT 0,
      focus_minutes INTEGER NOT NULL DEFAULT 0,
      pomodoros_cycles INTEGER NOT NULL DEFAULT 0,
      mood_score INTEGER,
      notes TEXT,
      ai_summary TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS task_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      task_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Convert SQLite row (snake_case) to camelCase User-compatible object
function toCamel(row: any): any {
  if (!row) return undefined;
  const out: any = {};
  for (const key of Object.keys(row)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    let val = row[key];
    // Coerce SQLite integers 0/1 → boolean for known boolean fields
    if (["isActive", "isPublic", "isCompleted", "isRead"].includes(camel) && typeof val === "number") {
      val = val === 1;
    }
    out[camel] = val;
  }
  return out;
}

// SQLite helpers
function sqliteOne<T>(stmt: any, params: any[] = []): T | undefined {
  return toCamel(stmt.get(...params)) as T | undefined;
}
function sqliteAll<T>(stmt: any, params: any[] = []): T[] {
  return (stmt.all(...params) as any[]).map(toCamel) as T[];
}
function sqliteRun(stmt: any, params: any[] = []): any {
  return stmt.run(...params);
}

// Postgres helpers (drizzle is always async)
async function pgOne<T>(query: any): Promise<T | undefined> {
  const rows = await query;
  return (rows as T[])[0];
}
async function pgMany<T>(query: any): Promise<T[]> {
  return (await query) as T[];
}
async function pgRun(query: any): Promise<void> {
  await query;
}
async function pgInsert<T>(query: any): Promise<T> {
  const rows = await query.returning();
  return rows[0] as T;
}

// ── Storage interface ─────────────────────────────────────────────────────────

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getTask(id: number): Promise<Task | undefined>;
  getTasksByUser(userId: number): Promise<Task[]>;
  getPublicTasks(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<void>;

  getFocusSession(id: number): Promise<FocusSession | undefined>;
  getFocusSessionByCode(code: string): Promise<FocusSession | undefined>;
  getActiveFocusSessions(): Promise<FocusSession[]>;
  createFocusSession(session: InsertFocusSession): Promise<FocusSession>;
  updateFocusSession(id: number, updates: Partial<FocusSession>): Promise<FocusSession | undefined>;

  getNudgesByUser(userId: number): Promise<Nudge[]>;
  createNudge(nudge: InsertNudge): Promise<Nudge>;
  markNudgeRead(id: number): Promise<void>;

  getTimerRecordsByUser(userId: number, date?: string): Promise<TimerRecord[]>;
  createTimerRecord(record: InsertTimerRecord): Promise<TimerRecord>;

  getCalendarEventsByUser(userId: number): Promise<CalendarEvent[]>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, updates: Partial<CalendarEvent>): Promise<CalendarEvent | undefined>;
  deleteCalendarEvent(id: number): Promise<void>;

  getDailyReport(userId: number, date: string): Promise<DailyReport | undefined>;
  getDailyReportsByUser(userId: number): Promise<DailyReport[]>;
  createOrUpdateDailyReport(report: InsertDailyReport): Promise<DailyReport>;

  getTaskLikes(taskId: number): Promise<number>;
  hasUserLiked(userId: number, taskId: number): Promise<boolean>;
  toggleLike(userId: number, taskId: number): Promise<boolean>;
}

// ── PostgreSQL implementation (Drizzle) ───────────────────────────────────────

const pgStorage: IStorage = {
  async getUser(id) {
    return pgOne(db!.select().from(users).where(eq(users.id, id)));
  },
  async getUserByEmail(email) {
    return pgOne(db!.select().from(users).where(eq(users.email, email)));
  },
  async getUserByUsername(username) {
    return pgOne(db!.select().from(users).where(eq(users.username, username)));
  },
  async createUser(user) {
    return pgInsert(db!.insert(users).values(user));
  },

  async getTask(id) {
    return pgOne(db!.select().from(tasks).where(eq(tasks.id, id)));
  },
  async getTasksByUser(userId) {
    return pgMany(db!.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt)));
  },
  async getPublicTasks() {
    return pgMany(db!.select().from(tasks).where(eq(tasks.isPublic, true)).orderBy(desc(tasks.createdAt)));
  },
  async createTask(task) {
    return pgInsert(db!.insert(tasks).values(task));
  },
  async updateTask(id, updates) {
    return pgOne(db!.update(tasks).set(updates).where(eq(tasks.id, id)).returning());
  },
  async deleteTask(id) {
    return pgRun(db!.delete(tasks).where(eq(tasks.id, id)));
  },

  async getFocusSession(id) {
    return pgOne(db!.select().from(focusSessions).where(eq(focusSessions.id, id)));
  },
  async getFocusSessionByCode(code) {
    return pgOne(db!.select().from(focusSessions).where(eq(focusSessions.roomCode, code)));
  },
  async getActiveFocusSessions() {
    return pgMany(db!.select().from(focusSessions).where(eq(focusSessions.isActive, true)).orderBy(desc(focusSessions.startedAt)));
  },
  async createFocusSession(session) {
    return pgInsert(db!.insert(focusSessions).values(session));
  },
  async updateFocusSession(id, updates) {
    return pgOne(db!.update(focusSessions).set(updates).where(eq(focusSessions.id, id)).returning());
  },

  async getNudgesByUser(userId) {
    return pgMany(db!.select().from(nudges).where(eq(nudges.userId, userId)).orderBy(desc(nudges.createdAt)));
  },
  async createNudge(nudge) {
    return pgInsert(db!.insert(nudges).values(nudge));
  },
  async markNudgeRead(id) {
    return pgRun(db!.update(nudges).set({ isRead: true }).where(eq(nudges.id, id)));
  },

  async getTimerRecordsByUser(userId, date) {
    if (date) {
      return pgMany(db!.select().from(timerRecords).where(and(eq(timerRecords.userId, userId), eq(timerRecords.date, date))));
    }
    return pgMany(db!.select().from(timerRecords).where(eq(timerRecords.userId, userId)).orderBy(desc(timerRecords.createdAt)));
  },
  async createTimerRecord(record) {
    return pgInsert(db!.insert(timerRecords).values(record));
  },

  async getCalendarEventsByUser(userId) {
    return pgMany(db!.select().from(calendarEvents).where(eq(calendarEvents.userId, userId)).orderBy(calendarEvents.startTime));
  },
  async createCalendarEvent(event) {
    return pgInsert(db!.insert(calendarEvents).values(event));
  },
  async updateCalendarEvent(id, updates) {
    return pgOne(db!.update(calendarEvents).set(updates).where(eq(calendarEvents.id, id)).returning());
  },
  async deleteCalendarEvent(id) {
    return pgRun(db!.delete(calendarEvents).where(eq(calendarEvents.id, id)));
  },

  async getDailyReport(userId, date) {
    return pgOne(db!.select().from(dailyReports).where(and(eq(dailyReports.userId, userId), eq(dailyReports.date, date))));
  },
  async getDailyReportsByUser(userId) {
    return pgMany(db!.select().from(dailyReports).where(eq(dailyReports.userId, userId)).orderBy(desc(dailyReports.date)));
  },
  async createOrUpdateDailyReport(report) {
    const existing = await pgStorage.getDailyReport(report.userId, report.date);
    if (existing) {
      return (await pgOne<DailyReport>(db!.update(dailyReports).set(report).where(eq(dailyReports.id, existing.id)).returning()))!;
    }
    return pgInsert(db!.insert(dailyReports).values(report));
  },

  async getTaskLikes(taskId) {
    const rows = await pgMany(db!.select().from(taskLikes).where(eq(taskLikes.taskId, taskId)));
    return rows.length;
  },
  async hasUserLiked(userId, taskId) {
    const row = await pgOne(db!.select().from(taskLikes).where(and(eq(taskLikes.userId, userId), eq(taskLikes.taskId, taskId))));
    return !!row;
  },
  async toggleLike(userId, taskId) {
    const existing = await pgOne<TaskLike>(db!.select().from(taskLikes).where(and(eq(taskLikes.userId, userId), eq(taskLikes.taskId, taskId))));
    if (existing) {
      await pgRun(db!.delete(taskLikes).where(eq(taskLikes.id, existing.id)));
      return false;
    }
    await pgRun(db!.insert(taskLikes).values({ userId, taskId }));
    return true;
  },
};

// ── SQLite implementation (raw SQL via better-sqlite3) ────────────────────────

const sqliteStorage: IStorage = {
  async getUser(id) {
    return sqliteOne<User>(sqliteDb.prepare("SELECT * FROM users WHERE id = ?"), [id]);
  },
  async getUserByEmail(email) {
    return sqliteOne<User>(sqliteDb.prepare("SELECT * FROM users WHERE email = ?"), [email]);
  },
  async getUserByUsername(username) {
    return sqliteOne<User>(sqliteDb.prepare("SELECT * FROM users WHERE username = ?"), [username]);
  },
  async createUser(user) {
    const stmt = sqliteDb.prepare(
      `INSERT INTO users (username, email, password_hash, display_name, avatar_initials, avatar_color, timezone)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`
    );
    return toCamel(stmt.get(user.username, user.email, user.passwordHash, user.displayName, user.avatarInitials, user.avatarColor ?? "#7C3AED", user.timezone ?? "UTC")) as User;
  },

  async getTask(id) {
    return sqliteOne<Task>(sqliteDb.prepare("SELECT * FROM tasks WHERE id = ?"), [id]);
  },
  async getTasksByUser(userId) {
    return sqliteAll<Task>(sqliteDb.prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC"), [userId]);
  },
  async getPublicTasks() {
    return sqliteAll<Task>(sqliteDb.prepare("SELECT * FROM tasks WHERE is_public = 1 ORDER BY created_at DESC"));
  },
  async createTask(task) {
    const stmt = sqliteDb.prepare(
      `INSERT INTO tasks (user_id, title, description, category, is_public, is_completed, estimated_minutes, scheduled_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
    );
    return toCamel(stmt.get(task.userId, task.title, task.description ?? null, task.category ?? "general", task.isPublic ? 1 : 0, task.isCompleted ? 1 : 0, task.estimatedMinutes ?? 25, task.scheduledDate ?? null)) as Task;
  },
  async updateTask(id, updates) {
    const sets: string[] = [];
    const vals: any[] = [];
    if (updates.title !== undefined) { sets.push("title = ?"); vals.push(updates.title); }
    if (updates.description !== undefined) { sets.push("description = ?"); vals.push(updates.description); }
    if (updates.category !== undefined) { sets.push("category = ?"); vals.push(updates.category); }
    if (updates.isPublic !== undefined) { sets.push("is_public = ?"); vals.push(updates.isPublic ? 1 : 0); }
    if (updates.isCompleted !== undefined) { sets.push("is_completed = ?"); vals.push(updates.isCompleted ? 1 : 0); }
    if (updates.estimatedMinutes !== undefined) { sets.push("estimated_minutes = ?"); vals.push(updates.estimatedMinutes); }
    if (updates.actualMinutes !== undefined) { sets.push("actual_minutes = ?"); vals.push(updates.actualMinutes); }
    if (updates.scheduledDate !== undefined) { sets.push("scheduled_date = ?"); vals.push(updates.scheduledDate); }
    if (updates.completedAt !== undefined) { sets.push("completed_at = ?"); vals.push(updates.completedAt); }
    if (!sets.length) return sqliteOne<Task>(sqliteDb.prepare("SELECT * FROM tasks WHERE id = ?"), [id]);
    vals.push(id);
    return sqliteOne<Task>(sqliteDb.prepare(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ? RETURNING *`), vals);
  },
  async deleteTask(id) {
    sqliteRun(sqliteDb.prepare("DELETE FROM tasks WHERE id = ?"), [id]);
  },

  async getFocusSession(id) {
    return sqliteOne<FocusSession>(sqliteDb.prepare("SELECT * FROM focus_sessions WHERE id = ?"), [id]);
  },
  async getFocusSessionByCode(code) {
    return sqliteOne<FocusSession>(sqliteDb.prepare("SELECT * FROM focus_sessions WHERE room_code = ?"), [code]);
  },
  async getActiveFocusSessions() {
    return sqliteAll<FocusSession>(sqliteDb.prepare("SELECT * FROM focus_sessions WHERE is_active = 1 ORDER BY started_at DESC"));
  },
  async createFocusSession(session) {
    const stmt = sqliteDb.prepare(
      `INSERT INTO focus_sessions (host_id, title, description, room_code, is_active, max_participants, participant_ids)
       VALUES (?, ?, ?, ?, 1, ?, '[]') RETURNING *`
    );
    return toCamel(stmt.get(session.hostId, session.title, session.description ?? null, session.roomCode, session.maxParticipants ?? 8)) as FocusSession;
  },
  async updateFocusSession(id, updates) {
    const sets: string[] = [];
    const vals: any[] = [];
    if (updates.isActive !== undefined) { sets.push("is_active = ?"); vals.push(updates.isActive ? 1 : 0); }
    if (updates.participantIds !== undefined) { sets.push("participant_ids = ?"); vals.push(updates.participantIds); }
    if (updates.endedAt !== undefined) { sets.push("ended_at = ?"); vals.push(updates.endedAt); }
    if (!sets.length) return sqliteOne<FocusSession>(sqliteDb.prepare("SELECT * FROM focus_sessions WHERE id = ?"), [id]);
    vals.push(id);
    return sqliteOne<FocusSession>(sqliteDb.prepare(`UPDATE focus_sessions SET ${sets.join(", ")} WHERE id = ? RETURNING *`), vals);
  },

  async getNudgesByUser(userId) {
    return sqliteAll<Nudge>(sqliteDb.prepare("SELECT * FROM nudges WHERE user_id = ? ORDER BY created_at DESC"), [userId]);
  },
  async createNudge(nudge) {
    const stmt = sqliteDb.prepare(
      `INSERT INTO nudges (user_id, task_id, message, nudge_type, is_read)
       VALUES (?, ?, ?, ?, 0) RETURNING *`
    );
    return toCamel(stmt.get(nudge.userId, nudge.taskId ?? null, nudge.message, nudge.nudgeType ?? "encouragement")) as Nudge;
  },
  async markNudgeRead(id) {
    sqliteRun(sqliteDb.prepare("UPDATE nudges SET is_read = 1 WHERE id = ?"), [id]);
  },

  async getTimerRecordsByUser(userId, date) {
    if (date) {
      return sqliteAll<TimerRecord>(sqliteDb.prepare("SELECT * FROM timer_records WHERE user_id = ? AND date = ?"), [userId, date]);
    }
    return sqliteAll<TimerRecord>(sqliteDb.prepare("SELECT * FROM timer_records WHERE user_id = ? ORDER BY created_at DESC"), [userId]);
  },
  async createTimerRecord(record) {
    const stmt = sqliteDb.prepare(
      `INSERT INTO timer_records (user_id, task_id, duration_minutes, completed_cycles, date)
       VALUES (?, ?, ?, ?, ?) RETURNING *`
    );
    return toCamel(stmt.get(record.userId, record.taskId ?? null, record.durationMinutes, record.completedCycles ?? 0, record.date)) as TimerRecord;
  },

  async getCalendarEventsByUser(userId) {
    return sqliteAll<CalendarEvent>(sqliteDb.prepare("SELECT * FROM calendar_events WHERE user_id = ? ORDER BY start_time"), [userId]);
  },
  async createCalendarEvent(event) {
    const stmt = sqliteDb.prepare(
      `INSERT INTO calendar_events (user_id, title, description, start_time, end_time, color, linked_task_id)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`
    );
    return toCamel(stmt.get(event.userId, event.title, event.description ?? null, event.startTime, event.endTime, event.color ?? "#7C3AED", event.linkedTaskId ?? null)) as CalendarEvent;
  },
  async updateCalendarEvent(id, updates) {
    const sets: string[] = [];
    const vals: any[] = [];
    if (updates.title !== undefined) { sets.push("title = ?"); vals.push(updates.title); }
    if (updates.description !== undefined) { sets.push("description = ?"); vals.push(updates.description); }
    if (updates.startTime !== undefined) { sets.push("start_time = ?"); vals.push(updates.startTime); }
    if (updates.endTime !== undefined) { sets.push("end_time = ?"); vals.push(updates.endTime); }
    if (updates.color !== undefined) { sets.push("color = ?"); vals.push(updates.color); }
    if (!sets.length) return sqliteOne<CalendarEvent>(sqliteDb.prepare("SELECT * FROM calendar_events WHERE id = ?"), [id]);
    vals.push(id);
    return sqliteOne<CalendarEvent>(sqliteDb.prepare(`UPDATE calendar_events SET ${sets.join(", ")} WHERE id = ? RETURNING *`), vals);
  },
  async deleteCalendarEvent(id) {
    sqliteRun(sqliteDb.prepare("DELETE FROM calendar_events WHERE id = ?"), [id]);
  },

  async getDailyReport(userId, date) {
    return sqliteOne<DailyReport>(sqliteDb.prepare("SELECT * FROM daily_reports WHERE user_id = ? AND date = ?"), [userId, date]);
  },
  async getDailyReportsByUser(userId) {
    return sqliteAll<DailyReport>(sqliteDb.prepare("SELECT * FROM daily_reports WHERE user_id = ? ORDER BY date DESC"), [userId]);
  },
  async createOrUpdateDailyReport(report) {
    const existing = await sqliteStorage.getDailyReport(report.userId, report.date);
    if (existing) {
      const stmt = sqliteDb.prepare(
        `UPDATE daily_reports SET tasks_completed=?, tasks_planned=?, focus_minutes=?, pomodoros_cycles=?, mood_score=?, notes=?, ai_summary=?
         WHERE id=? RETURNING *`
      );
      return toCamel(stmt.get(report.tasksCompleted ?? 0, report.tasksPlanned ?? 0, report.focusMinutes ?? 0, report.pomodorosCycles ?? 0, report.moodScore ?? null, report.notes ?? null, report.aiSummary ?? null, existing.id)) as DailyReport;
    }
    const stmt = sqliteDb.prepare(
      `INSERT INTO daily_reports (user_id, date, tasks_completed, tasks_planned, focus_minutes, pomodoros_cycles, mood_score, notes, ai_summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
    );
    return toCamel(stmt.get(report.userId, report.date, report.tasksCompleted ?? 0, report.tasksPlanned ?? 0, report.focusMinutes ?? 0, report.pomodorosCycles ?? 0, report.moodScore ?? null, report.notes ?? null, report.aiSummary ?? null)) as DailyReport;
  },

  async getTaskLikes(taskId) {
    const row: any = sqliteDb.prepare("SELECT COUNT(*) as cnt FROM task_likes WHERE task_id = ?").get(taskId);
    return row?.cnt ?? 0;
  },
  async hasUserLiked(userId, taskId) {
    const row = sqliteDb.prepare("SELECT id FROM task_likes WHERE user_id = ? AND task_id = ?").get(userId, taskId);
    return !!row;
  },
  async toggleLike(userId, taskId) {
    const existing: any = sqliteDb.prepare("SELECT id FROM task_likes WHERE user_id = ? AND task_id = ?").get(userId, taskId);
    if (existing) {
      sqliteDb.prepare("DELETE FROM task_likes WHERE id = ?").run(existing.id);
      return false;
    }
    sqliteDb.prepare("INSERT INTO task_likes (user_id, task_id) VALUES (?, ?)").run(userId, taskId);
    return true;
  },
};

// ── Export the right implementation ───────────────────────────────────────────
export const storage: IStorage = process.env.DATABASE_URL ? pgStorage : sqliteStorage;
