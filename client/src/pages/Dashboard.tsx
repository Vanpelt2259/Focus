import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Timer, Users, CheckCircle2, Zap, Plus, TrendingUp, Bell, ArrowRight, Clock } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: user } = useQuery({ queryKey: ["/api/auth/me"] });
  const { data: tasks = [] } = useQuery<any[]>({ queryKey: ["/api/tasks"] });
  const { data: sessions = [] } = useQuery<any[]>({ queryKey: ["/api/sessions"] });
  const { data: nudges = [] } = useQuery<any[]>({ queryKey: ["/api/nudges"] });
  const { data: report } = useQuery<any>({ queryKey: [`/api/reports/${today}`] });

  const [quickTask, setQuickTask] = useState("");

  const todayTasks = (tasks as any[]).filter(t => t.scheduledDate === today || !t.scheduledDate);
  const completedToday = todayTasks.filter(t => t.isCompleted).length;
  const completionRate = todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 0;
  const unreadNudges = (nudges as any[]).filter(n => !n.isRead);

  const addTask = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tasks", {
        title: quickTask,
        scheduledDate: today,
        estimatedMinutes: 25,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setQuickTask("");
      toast({ title: "Task added", description: "Task added to today's list." });
    },
  });

  const getNudge = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/nudges/generate", { nudgeType: "encouragement" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nudges"] });
      toast({ title: "New nudge", description: "A fresh nudge has been generated for you." });
    },
  });

  const completeTask = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, {
        isCompleted: true,
        completedAt: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: [`/api/reports/${today}`] });
      toast({ title: "Task complete!", description: "Great work! Keep the momentum going." });
    },
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">
            {getGreeting()}, {(user as any)?.displayName?.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">{format(new Date(), "EEEE, MMMM d")}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => getNudge.mutate()}
          disabled={getNudge.isPending}
          data-testid="button-get-nudge"
        >
          <Zap className="w-4 h-4 mr-2" />
          Get a nudge
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Tasks Today",
            value: `${completedToday}/${todayTasks.length}`,
            icon: CheckCircle2,
            color: "text-green-500",
            sub: `${completionRate}% done`,
          },
          {
            label: "Focus Minutes",
            value: `${report?.focusMinutes || 0}m`,
            icon: Clock,
            color: "text-primary",
            sub: `${report?.pomodorosCycles || 0} cycles`,
          },
          {
            label: "Live Sessions",
            value: (sessions as any[]).length,
            icon: Users,
            color: "text-blue-500",
            sub: "happening now",
          },
          {
            label: "Nudges",
            value: unreadNudges.length,
            icon: Bell,
            color: "text-amber-500",
            sub: "unread",
          },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
                </div>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's tasks */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Today's Tasks</CardTitle>
                <Link href="/timer">
                  <Button size="sm" variant="ghost" className="text-xs">
                    Start timer <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
              {todayTasks.length > 0 && (
                <Progress value={completionRate} className="h-1.5" />
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Quick add */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add a task..."
                  value={quickTask}
                  onChange={e => setQuickTask(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && quickTask && addTask.mutate()}
                  className="text-sm"
                  data-testid="input-quick-task"
                />
                <Button
                  size="sm"
                  onClick={() => quickTask && addTask.mutate()}
                  disabled={addTask.isPending || !quickTask}
                  data-testid="button-add-task"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {todayTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No tasks yet. Add your first task above!</p>
                </div>
              ) : (
                todayTasks.slice(0, 6).map(task => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      task.isCompleted ? "bg-muted/40 opacity-60" : "hover:bg-muted/30"
                    }`}
                    data-testid={`task-item-${task.id}`}
                  >
                    <button
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                        task.isCompleted
                          ? "bg-primary border-primary"
                          : "border-border hover:border-primary"
                      }`}
                      onClick={() => !task.isCompleted && completeTask.mutate(task.id)}
                      data-testid={`button-complete-${task.id}`}
                    >
                      {task.isCompleted && (
                        <svg viewBox="0 0 20 20" className="w-full h-full text-white fill-current p-0.5">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg>
                      )}
                    </button>
                    <span className={`flex-1 text-sm ${task.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </span>
                    <span className="text-xs text-muted-foreground">{task.estimatedMinutes}m</span>
                    {task.category && (
                      <Badge variant="secondary" className="text-xs">
                        {task.category}
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Latest nudge */}
          {unreadNudges.length > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-primary">
                  <Zap className="w-4 h-4" />
                  AI Nudge
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{unreadNudges[0].message}</p>
                <Badge variant="outline" className="mt-2 text-xs capitalize">
                  {unreadNudges[0].nudgeType}
                </Badge>
              </CardContent>
            </Card>
          )}

          {/* Live sessions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Live Sessions</CardTitle>
                <Link href="/sessions">
                  <Button size="sm" variant="ghost" className="text-xs">View all</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {(sessions as any[]).length === 0 ? (
                <div className="text-center py-4">
                  <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                  <p className="text-xs text-muted-foreground">No active sessions</p>
                  <Link href="/sessions">
                    <Button size="sm" className="mt-3 text-xs">Start a session</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {(sessions as any[]).slice(0, 3).map((s: any) => (
                    <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.participantCount} focusing</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { href: "/timer", icon: Timer, label: "Start Focus Timer", color: "text-primary" },
                { href: "/sessions", icon: Users, label: "Join a Session", color: "text-blue-500" },
                { href: "/reports", icon: TrendingUp, label: "View Reports", color: "text-green-500" },
              ].map(({ href, icon: Icon, label, color }) => (
                <Link key={href} href={href}>
                  <a className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40 transition-colors text-sm group">
                    <Icon className={`w-4 h-4 ${color}`} />
                    {label}
                    <ArrowRight className="w-3 h-3 ml-auto text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
