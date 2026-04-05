import type { Express } from "express";
import type { Server } from "http";
import bcrypt from "bcryptjs";
import { storage } from "./storage";

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const AVATAR_COLORS = ["#7C3AED", "#2563EB", "#059669", "#D97706", "#DC2626", "#DB2777", "#0891B2"];
function randomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function generateNudge(type: string, taskTitle?: string): string {
  const task = taskTitle ? `"${taskTitle}"` : "your task";
  const nudges: Record<string, string[]> = {
    encouragement: [
      `You're doing great! Keep going on ${task} — every minute counts.`,
      `Small steps matter. You've already started, and that's huge for ${task}.`,
      `Your future self will thank you for the work on ${task} right now.`,
      `Progress, not perfection. You've got this!`,
      `One focused minute is worth ten scattered hours. Stay with it!`,
    ],
    refocus: [
      `Hey! Let's bring your attention back to ${task}. Take a breath and dive back in.`,
      `Noticed you might have drifted — totally normal! Let's redirect to ${task}.`,
      `Quick refocus check: what's the very next tiny step on ${task}?`,
      `Body double mode: I'm here with you. Let's tackle ${task} together.`,
      `Gentle nudge: your workspace is ready, and so are you. Back to ${task}!`,
    ],
    break: [
      `Great work! Time for a 5-minute break. Stand up, stretch, hydrate.`,
      `You earned this break. Step away for a few minutes — your brain needs it.`,
      `Break time! A short rest actually boosts your productivity. Enjoy it guilt-free.`,
      `Rest is part of the work. Take your break and come back fresh.`,
    ],
    celebrate: [
      `🎉 You completed ${task}! That's a real accomplishment — feel that win!`,
      `DONE! ${task} is finished. You showed up and delivered. Amazing!`,
      `Task complete! You built real momentum today. What's next?`,
      `Nailed it! ${task} is done. Your consistency is building something great.`,
    ],
  };
  const options = nudges[type] || nudges.encouragement;
  return options[Math.floor(Math.random() * options.length)];
}

export function registerRoutes(httpServer: Server, app: Express) {
  // ── AUTH ──────────────────────────────────────────────────────────────────

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password, displayName } = req.body;
      if (!username || !email || !password || !displayName) {
        return res.status(400).json({ error: "All fields required" });
      }
      if (await storage.getUserByEmail(email)) return res.status(409).json({ error: "Email already registered" });
      if (await storage.getUserByUsername(username)) return res.status(409).json({ error: "Username taken" });

      const passwordHash = await bcrypt.hash(password, 10);
      const initials = displayName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
      const user = await storage.createUser({ username, email, passwordHash, displayName, avatarInitials: initials, avatarColor: randomColor(), timezone: "UTC" });
      (req.session as any).userId = user.id;
      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password required" });
      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });
      (req.session as any).userId = user.id;
      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(401).json({ error: "User not found" });
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // ── TASKS ─────────────────────────────────────────────────────────────────

  app.get("/api/tasks", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    res.json(await storage.getTasksByUser(userId));
  });

  app.get("/api/tasks/community", async (req, res) => {
    const publicTasks = await storage.getPublicTasks();
    const userId = (req.session as any).userId;
    const enriched = await Promise.all(publicTasks.map(async task => {
      const author = await storage.getUser(task.userId);
      const likes = await storage.getTaskLikes(task.id);
      const liked = userId ? await storage.hasUserLiked(userId, task.id) : false;
      return { ...task, authorName: author?.displayName || "Anonymous", authorInitials: author?.avatarInitials || "?", authorColor: author?.avatarColor || "#7C3AED", likes, liked };
    }));
    res.json(enriched);
  });

  app.post("/api/tasks", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    res.json(await storage.createTask({ ...req.body, userId }));
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const task = await storage.getTask(Number(req.params.id));
    if (!task || task.userId !== userId) return res.status(404).json({ error: "Task not found" });
    res.json(await storage.updateTask(task.id, req.body));
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const task = await storage.getTask(Number(req.params.id));
    if (!task || task.userId !== userId) return res.status(404).json({ error: "Task not found" });
    await storage.deleteTask(task.id);
    res.json({ ok: true });
  });

  app.post("/api/tasks/:id/like", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const liked = await storage.toggleLike(userId, Number(req.params.id));
    const count = await storage.getTaskLikes(Number(req.params.id));
    res.json({ liked, count });
  });

  // ── FOCUS SESSIONS ────────────────────────────────────────────────────────

  app.get("/api/sessions", async (req, res) => {
    const sessions = await storage.getActiveFocusSessions();
    const enriched = await Promise.all(sessions.map(async s => {
      const host = await storage.getUser(s.hostId);
      const participants = JSON.parse(s.participantIds || "[]") as number[];
      return { ...s, hostName: host?.displayName || "Unknown", participantCount: participants.length };
    }));
    res.json(enriched);
  });

  app.post("/api/sessions", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    let code = generateRoomCode();
    while (await storage.getFocusSessionByCode(code)) code = generateRoomCode();
    const session = await storage.createFocusSession({ ...req.body, hostId: userId, roomCode: code });
    await storage.updateFocusSession(session.id, { participantIds: JSON.stringify([userId]) });
    res.json(session);
  });

  app.post("/api/sessions/:code/join", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const session = await storage.getFocusSessionByCode(req.params.code);
    if (!session || !session.isActive) return res.status(404).json({ error: "Session not found" });
    const participants = JSON.parse(session.participantIds || "[]") as number[];
    if (!participants.includes(userId)) participants.push(userId);
    await storage.updateFocusSession(session.id, { participantIds: JSON.stringify(participants) });
    res.json({ ...session, participantIds: JSON.stringify(participants) });
  });

  app.post("/api/sessions/:code/leave", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const session = await storage.getFocusSessionByCode(req.params.code);
    if (!session) return res.status(404).json({ error: "Session not found" });
    let participants = JSON.parse(session.participantIds || "[]") as number[];
    participants = participants.filter(p => p !== userId);
    if (session.hostId === userId && participants.length === 0) {
      await storage.updateFocusSession(session.id, { isActive: false, endedAt: new Date().toISOString(), participantIds: JSON.stringify(participants) });
    } else {
      await storage.updateFocusSession(session.id, { participantIds: JSON.stringify(participants) });
    }
    res.json({ ok: true });
  });

  app.delete("/api/sessions/:code", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const session = await storage.getFocusSessionByCode(req.params.code);
    if (!session || session.hostId !== userId) return res.status(403).json({ error: "Not authorized" });
    await storage.updateFocusSession(session.id, { isActive: false, endedAt: new Date().toISOString() });
    res.json({ ok: true });
  });

  // ── NUDGES ────────────────────────────────────────────────────────────────

  app.get("/api/nudges", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    res.json(await storage.getNudgesByUser(userId));
  });

  app.post("/api/nudges/generate", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { nudgeType, taskTitle, taskId } = req.body;
    const message = generateNudge(nudgeType || "encouragement", taskTitle);
    res.json(await storage.createNudge({ userId, taskId: taskId || null, message, nudgeType: nudgeType || "encouragement", isRead: false }));
  });

  app.patch("/api/nudges/:id/read", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    await storage.markNudgeRead(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── TIMER RECORDS ─────────────────────────────────────────────────────────

  app.get("/api/timers", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    res.json(await storage.getTimerRecordsByUser(userId, req.query.date as string | undefined));
  });

  app.post("/api/timers", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    res.json(await storage.createTimerRecord({ ...req.body, userId }));
  });

  // ── CALENDAR ──────────────────────────────────────────────────────────────

  app.get("/api/calendar", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    res.json(await storage.getCalendarEventsByUser(userId));
  });

  app.post("/api/calendar", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    res.json(await storage.createCalendarEvent({ ...req.body, userId }));
  });

  app.patch("/api/calendar/:id", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    res.json(await storage.updateCalendarEvent(Number(req.params.id), req.body));
  });

  app.delete("/api/calendar/:id", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    await storage.deleteCalendarEvent(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── DAILY REPORTS ─────────────────────────────────────────────────────────

  app.get("/api/reports", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    res.json(await storage.getDailyReportsByUser(userId));
  });

  app.get("/api/reports/:date", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const today = req.params.date;
    const report = await storage.getDailyReport(userId, today);
    if (!report) {
      const allTasks = await storage.getTasksByUser(userId);
      const todayTasks = allTasks.filter(t => t.scheduledDate === today || t.completedAt?.startsWith(today));
      const completed = todayTasks.filter(t => t.isCompleted).length;
      const timers = await storage.getTimerRecordsByUser(userId, today);
      const focusMins = timers.reduce((acc, t) => acc + t.durationMinutes, 0);
      const cycles = timers.reduce((acc, t) => acc + t.completedCycles, 0);
      let summary = completed > 0 || focusMins > 0
        ? `On ${today}, you completed ${completed} task${completed !== 1 ? "s" : ""} and spent ${focusMins} minutes focused across ${cycles} Pomodoro cycle${cycles !== 1 ? "s" : ""}. ${completed >= 3 ? "Excellent work!" : completed >= 1 ? "Solid progress!" : "Keep building momentum."}`
        : "Today is a fresh start. Set a task and start your first Pomodoro!";
      return res.json(await storage.createOrUpdateDailyReport({ userId, date: today, tasksCompleted: completed, tasksPlanned: todayTasks.length, focusMinutes: focusMins, pomodorosCycles: cycles, aiSummary: summary }));
    }
    res.json(report);
  });

  app.post("/api/reports", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    res.json(await storage.createOrUpdateDailyReport({ ...req.body, userId }));
  });
}
