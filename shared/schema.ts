import { pgTable, text, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  avatarInitials: text("avatar_initials").notNull(),
  avatarColor: text("avatar_color").notNull().default("#7C3AED"),
  timezone: text("timezone").notNull().default("UTC"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Focus Sessions (live body-double video rooms)
export const focusSessions = pgTable("focus_sessions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  hostId: integer("host_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  roomCode: text("room_code").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  maxParticipants: integer("max_participants").notNull().default(8),
  participantIds: text("participant_ids").notNull().default("[]"), // JSON array
  startedAt: text("started_at").notNull().default(new Date().toISOString()),
  endedAt: text("ended_at"),
});

export const insertFocusSessionSchema = createInsertSchema(focusSessions).omit({
  id: true,
  startedAt: true,
  endedAt: true,
  participantIds: true,
});
export type InsertFocusSession = z.infer<typeof insertFocusSessionSchema>;
export type FocusSession = typeof focusSessions.$inferSelect;

// Tasks
export const tasks = pgTable("tasks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("general"),
  isPublic: boolean("is_public").notNull().default(false),
  isCompleted: boolean("is_completed").notNull().default(false),
  estimatedMinutes: integer("estimated_minutes").notNull().default(25),
  actualMinutes: integer("actual_minutes"),
  scheduledDate: text("scheduled_date"), // ISO date string
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  actualMinutes: true,
});
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// AI Nudges
export const nudges = pgTable("nudges", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  taskId: integer("task_id"),
  message: text("message").notNull(),
  nudgeType: text("nudge_type").notNull().default("encouragement"), // encouragement, refocus, break, celebrate
  isRead: boolean("is_read").notNull().default(false),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertNudgeSchema = createInsertSchema(nudges).omit({
  id: true,
  createdAt: true,
});
export type InsertNudge = z.infer<typeof insertNudgeSchema>;
export type Nudge = typeof nudges.$inferSelect;

// Pomodoro / focus timer records
export const timerRecords = pgTable("timer_records", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  taskId: integer("task_id"),
  durationMinutes: integer("duration_minutes").notNull(),
  completedCycles: integer("completed_cycles").notNull().default(0),
  date: text("date").notNull(), // ISO date
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertTimerRecordSchema = createInsertSchema(timerRecords).omit({
  id: true,
  createdAt: true,
});
export type InsertTimerRecord = z.infer<typeof insertTimerRecordSchema>;
export type TimerRecord = typeof timerRecords.$inferSelect;

// Calendar Events
export const calendarEvents = pgTable("calendar_events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: text("start_time").notNull(), // ISO datetime
  endTime: text("end_time").notNull(), // ISO datetime
  color: text("color").notNull().default("#7C3AED"),
  linkedTaskId: integer("linked_task_id"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
});
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;

// Daily Reports
export const dailyReports = pgTable("daily_reports", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(), // ISO date
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  tasksPlanned: integer("tasks_planned").notNull().default(0),
  focusMinutes: integer("focus_minutes").notNull().default(0),
  pomodorosCycles: integer("pomodoros_cycles").notNull().default(0),
  moodScore: integer("mood_score"), // 1-5
  notes: text("notes"),
  aiSummary: text("ai_summary"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertDailyReportSchema = createInsertSchema(dailyReports).omit({
  id: true,
  createdAt: true,
});
export type InsertDailyReport = z.infer<typeof insertDailyReportSchema>;
export type DailyReport = typeof dailyReports.$inferSelect;

// Task likes (community)
export const taskLikes = pgTable("task_likes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  taskId: integer("task_id").notNull(),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertTaskLikeSchema = createInsertSchema(taskLikes).omit({
  id: true,
  createdAt: true,
});
export type InsertTaskLike = z.infer<typeof insertTaskLikeSchema>;
export type TaskLike = typeof taskLikes.$inferSelect;
