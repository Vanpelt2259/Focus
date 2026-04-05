import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from "recharts";
import { BarChart3, CheckCircle2, Clock, Flame, TrendingUp, Zap, Star, RefreshCw } from "lucide-react";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ReportsPage() {
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");
  const [moodScore, setMoodScore] = useState<string>("");

  const { data: reports = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/reports"],
  });

  const { data: todayReport, refetch } = useQuery<any>({
    queryKey: [`/api/reports/${today}`],
  });

  const saveMood = useMutation({
    mutationFn: async (score: number) => {
      const res = await apiRequest("POST", "/api/reports", {
        date: today,
        moodScore: score,
        tasksCompleted: todayReport?.tasksCompleted || 0,
        tasksPlanned: todayReport?.tasksPlanned || 0,
        focusMinutes: todayReport?.focusMinutes || 0,
        pomodorosCycles: todayReport?.pomodorosCycles || 0,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/reports/${today}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({ title: "Mood saved!", description: "Thanks for checking in." });
    },
  });

  // Build 7-day chart data
  const last7 = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
  const chartData = last7.map(day => {
    const dateStr = format(day, "yyyy-MM-dd");
    const report = (reports as any[]).find(r => r.date === dateStr);
    return {
      date: format(day, "EEE"),
      focus: report?.focusMinutes || 0,
      tasks: report?.tasksCompleted || 0,
      cycles: report?.pomodorosCycles || 0,
    };
  });

  const totalFocusMins = (reports as any[]).reduce((acc, r) => acc + (r.focusMinutes || 0), 0);
  const totalTasks = (reports as any[]).reduce((acc, r) => acc + (r.tasksCompleted || 0), 0);
  const totalCycles = (reports as any[]).reduce((acc, r) => acc + (r.pomodorosCycles || 0), 0);
  const avgMood = (reports as any[]).filter(r => r.moodScore).reduce((acc, r, _, arr) => acc + r.moodScore / arr.length, 0);

  const moodEmoji = (score: number) => {
    if (score >= 4.5) return "🤩";
    if (score >= 3.5) return "😊";
    if (score >= 2.5) return "😐";
    if (score >= 1.5) return "😕";
    return "😔";
  };

  const MOODS = [
    { score: 1, emoji: "😔", label: "Tough" },
    { score: 2, emoji: "😕", label: "Meh" },
    { score: 3, emoji: "😐", label: "Okay" },
    { score: 4, emoji: "😊", label: "Good" },
    { score: 5, emoji: "🤩", label: "Great" },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Daily Reports</h1>
          <p className="text-sm text-muted-foreground">Track your productivity patterns and celebrate progress.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          data-testid="button-refresh-report"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Today's report */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Today's Summary — {format(new Date(), "MMMM d")}
            </CardTitle>
            <Badge variant="outline" className="text-xs">{today}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {todayReport ? (
            <>
              {todayReport.aiSummary && (
                <p className="text-sm leading-relaxed mb-4 text-muted-foreground italic">
                  "{todayReport.aiSummary}"
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {[
                  { label: "Tasks Done", value: todayReport.tasksCompleted, icon: CheckCircle2, color: "text-green-500" },
                  { label: "Focus Time", value: `${todayReport.focusMinutes}m`, icon: Clock, color: "text-primary" },
                  { label: "Pomodoros", value: todayReport.pomodorosCycles, icon: Flame, color: "text-orange-500" },
                  { label: "Tasks Planned", value: todayReport.tasksPlanned, icon: BarChart3, color: "text-blue-500" },
                ].map(stat => (
                  <div key={stat.label} className="text-center">
                    <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
                    <div className="text-xl font-bold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>

              {todayReport.tasksPlanned > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Completion rate</span>
                    <span>{Math.round((todayReport.tasksCompleted / todayReport.tasksPlanned) * 100)}%</span>
                  </div>
                  <Progress
                    value={(todayReport.tasksCompleted / todayReport.tasksPlanned) * 100}
                    className="h-2"
                  />
                </div>
              )}

              {/* Mood check-in */}
              <div>
                <p className="text-xs font-medium mb-2">How are you feeling?</p>
                <div className="flex gap-2">
                  {MOODS.map(m => (
                    <button
                      key={m.score}
                      onClick={() => saveMood.mutate(m.score)}
                      className={`flex flex-col items-center p-2 rounded-lg transition-colors flex-1 ${
                        todayReport.moodScore === m.score
                          ? "bg-primary/20 ring-2 ring-primary"
                          : "hover:bg-muted"
                      }`}
                      data-testid={`mood-${m.score}`}
                    >
                      <span className="text-lg">{m.emoji}</span>
                      <span className="text-xs text-muted-foreground mt-0.5">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="skeleton h-4 w-48 mx-auto mb-2 rounded" />
              <div className="skeleton h-4 w-32 mx-auto rounded" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overall stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Focus Time", value: `${Math.round(totalFocusMins / 60)}h ${totalFocusMins % 60}m`, icon: Clock, color: "text-primary" },
          { label: "Tasks Completed", value: totalTasks, icon: CheckCircle2, color: "text-green-500" },
          { label: "Pomodoro Cycles", value: totalCycles, icon: Flame, color: "text-orange-500" },
          { label: "Avg Mood", value: avgMood > 0 ? `${moodEmoji(avgMood)} ${avgMood.toFixed(1)}` : "—", icon: Star, color: "text-yellow-500" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-4">
              <stat.icon className={`w-5 h-5 mb-2 ${stat.color}`} />
              <div className="text-xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Focus Minutes — Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                  formatter={(v: any) => [`${v}m`, "Focus"]}
                />
                <Area type="monotone" dataKey="focus" stroke="hsl(var(--primary))" fill="url(#focusGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tasks Completed — Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                  formatter={(v: any) => [v, "Tasks"]}
                />
                <Bar dataKey="tasks" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Report history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Report History</CardTitle>
        </CardHeader>
        <CardContent>
          {(reports as any[]).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Complete some tasks and focus sessions to see your history.</p>
          ) : (
            <div className="space-y-2">
              {(reports as any[]).map((report: any) => (
                <div
                  key={report.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/40 transition-colors"
                  data-testid={`report-row-${report.date}`}
                >
                  <div className="w-16 text-xs font-medium text-muted-foreground">{format(new Date(report.date + 'T12:00:00'), "MMM d")}</div>
                  <div className="flex-1 grid grid-cols-3 gap-2 text-xs">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      {report.tasksCompleted} tasks
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-primary" />
                      {report.focusMinutes}m focus
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-500" />
                      {report.pomodorosCycles} cycles
                    </span>
                  </div>
                  {report.moodScore && (
                    <span className="text-lg">{moodEmoji(report.moodScore)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
