import { drizzle } from "drizzle-orm/node-postgres";
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

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
});
const db = drizzle(pool);
console.log("[db] Using PostgreSQL");

// ── Helpers ───────────────────────────────────────────────────────────────────

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

export const storage: IStorage = {
  async getUser(id) {
    return pgOne(db.select().from(users).where(eq(users.id, id)));
  },
  async getUserByEmail(email) {
    return pgOne(db.select().from(users).where(eq(users.email, email)));
  },
  async getUserByUsername(username) {
    return pgOne(db.select().from(users).where(eq(users.username, username)));
  },
  async createUser(user) {
    return pgInsert(db.insert(users).values(user));
  },

  async getTask(id) {
    return pgOne(db.select().from(tasks).where(eq(tasks.id, id)));
  },
  async getTasksByUser(userId) {
    return pgMany(db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt)));
  },
  async getPublicTasks() {
    return pgMany(db.select().from(tasks).where(eq(tasks.isPublic, true)).orderBy(desc(tasks.createdAt)));
  },
  async createTask(task) {
    return pgInsert(db.insert(tasks).values(task));
  },
  async updateTask(id, updates) {
    return pgOne(db.update(tasks).set(updates).where(eq(tasks.id, id)).returning());
  },
  async deleteTask(id) {
    return pgRun(db.delete(tasks).where(eq(tasks.id, id)));
  },

  async getFocusSession(id) {
    return pgOne(db.select().from(focusSessions).where(eq(focusSessions.id, id)));
  },
  async getFocusSessionByCode(code) {
    return pgOne(db.select().from(focusSessions).where(eq(focusSessions.roomCode, code)));
  },
  async getActiveFocusSessions() {
    return pgMany(db.select().from(focusSessions).where(eq(focusSessions.isActive, true)).orderBy(desc(focusSessions.startedAt)));
  },
  async createFocusSession(session) {
    return pgInsert(db.insert(focusSessions).values(session));
  },
  async updateFocusSession(id, updates) {
    return pgOne(db.update(focusSessions).set(updates).where(eq(focusSessions.id, id)).returning());
  },

  async getNudgesByUser(userId) {
    return pgMany(db.select().from(nudges).where(eq(nudges.userId, userId)).orderBy(desc(nudges.createdAt)));
  },
  async createNudge(nudge) {
    return pgInsert(db.insert(nudges).values(nudge));
  },
  async markNudgeRead(id) {
    return pgRun(db.update(nudges).set({ isRead: true }).where(eq(nudges.id, id)));
  },

  async getTimerRecordsByUser(userId, date) {
    if (date) {
      return pgMany(db.select().from(timerRecords).where(and(eq(timerRecords.userId, userId), eq(timerRecords.date, date))));
    }
    return pgMany(db.select().from(timerRecords).where(eq(timerRecords.userId, userId)).orderBy(desc(timerRecords.createdAt)));
  },
  async createTimerRecord(record) {
    return pgInsert(db.insert(timerRecords).values(record));
  },

  async getCalendarEventsByUser(userId) {
    return pgMany(db.select().from(calendarEvents).where(eq(calendarEvents.userId, userId)).orderBy(calendarEvents.startTime));
  },
  async createCalendarEvent(event) {
    return pgInsert(db.insert(calendarEvents).values(event));
  },
  async updateCalendarEvent(id, updates) {
    return pgOne(db.update(calendarEvents).set(updates).where(eq(calendarEvents.id, id)).returning());
  },
  async deleteCalendarEvent(id) {
    return pgRun(db.delete(calendarEvents).where(eq(calendarEvents.id, id)));
  },

  async getDailyReport(userId, date) {
    return pgOne(db.select().from(dailyReports).where(and(eq(dailyReports.userId, userId), eq(dailyReports.date, date))));
  },
  async getDailyReportsByUser(userId) {
    return pgMany(db.select().from(dailyReports).where(eq(dailyReports.userId, userId)).orderBy(desc(dailyReports.date)));
  },
  async createOrUpdateDailyReport(report) {
    const existing = await storage.getDailyReport(report.userId, report.date);
    if (existing) {
      return (await pgOne<DailyReport>(db.update(dailyReports).set(report).where(eq(dailyReports.id, existing.id)).returning()))!;
    }
    return pgInsert(db.insert(dailyReports).values(report));
  },

  async getTaskLikes(taskId) {
    const rows = await pgMany(db.select().from(taskLikes).where(eq(taskLikes.taskId, taskId)));
    return rows.length;
  },
  async hasUserLiked(userId, taskId) {
    const row = await pgOne(db.select().from(taskLikes).where(and(eq(taskLikes.userId, userId), eq(taskLikes.taskId, taskId))));
    return !!row;
  },
  async toggleLike(userId, taskId) {
    const existing = await pgOne<TaskLike>(db.select().from(taskLikes).where(and(eq(taskLikes.userId, userId), eq(taskLikes.taskId, taskId))));
    if (existing) {
      await pgRun(db.delete(taskLikes).where(eq(taskLikes.id, existing.id)));
      return false;
    }
    await pgRun(db.insert(taskLikes).values({ userId, taskId }));
    return true;
  },
};
