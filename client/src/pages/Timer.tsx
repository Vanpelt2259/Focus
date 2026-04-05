import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, RotateCcw, SkipForward, Zap, Settings, Bell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type Mode = "work" | "break" | "long-break";

const NUDGE_MESSAGES = {
  work: [
    "You're doing great! Stay with it.",
    "One focused step at a time. You've got this!",
    "Progress is happening, even when it feels slow.",
    "Your brain is working hard. Keep going!",
    "Stay present. The timer is your anchor.",
  ],
  break: [
    "Take a real break — stand up, hydrate, breathe.",
    "Rest is productive. Let your mind wander freely.",
    "Stretch those muscles! You earned this break.",
    "Look away from the screen for 20 seconds.",
  ],
};

export default function TimerPage() {
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");

  // Settings
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);
  const [cyclesBeforeLong, setCyclesBeforeLong] = useState(4);

  // State
  const [mode, setMode] = useState<Mode>("work");
  const [secondsLeft, setSecondsLeft] = useState(workMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("none");
  const [nudge, setNudge] = useState<string>("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const totalSeconds = useRef(workMinutes * 60);

  const { data: tasks = [] } = useQuery<any[]>({ queryKey: ["/api/tasks"] });
  const pendingTasks = (tasks as any[]).filter(t => !t.isCompleted);

  const saveTimer = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/timers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timers"] });
      queryClient.invalidateQueries({ queryKey: [`/api/reports/${today}`] });
    },
  });

  const genNudge = useMutation({
    mutationFn: async () => {
      const selectedTask = (tasks as any[]).find(t => t.id === Number(selectedTaskId));
      const res = await apiRequest("POST", "/api/nudges/generate", {
        nudgeType: mode === "work" ? "encouragement" : "break",
        taskTitle: selectedTask?.title,
        taskId: selectedTaskId !== "none" ? Number(selectedTaskId) : undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setNudge(data.message);
      queryClient.invalidateQueries({ queryKey: ["/api/nudges"] });
    },
  });

  // Reset timer when mode or settings change
  useEffect(() => {
    const secs = mode === "work" ? workMinutes * 60 : mode === "break" ? breakMinutes * 60 : longBreakMinutes * 60;
    setSecondsLeft(secs);
    totalSeconds.current = secs;
    setIsRunning(false);
  }, [mode, workMinutes, breakMinutes, longBreakMinutes]);

  // Ticker
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(id);
          handleComplete();
          return 0;
        }
        // Nudge at 50% mark
        if (s === Math.floor(totalSeconds.current / 2)) {
          const msgs = NUDGE_MESSAGES[mode === "work" ? "work" : "break"];
          setNudge(msgs[Math.floor(Math.random() * msgs.length)]);
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, mode]);

  const handleComplete = () => {
    setIsRunning(false);

    if (mode === "work") {
      const newCycles = cyclesCompleted + 1;
      setCyclesCompleted(newCycles);

      // Save timer record
      saveTimer.mutate({
        durationMinutes: workMinutes,
        completedCycles: 1,
        date: today,
        taskId: selectedTaskId !== "none" ? Number(selectedTaskId) : undefined,
      });

      // Switch mode
      if (newCycles % cyclesBeforeLong === 0) {
        setMode("long-break");
        toast({ title: "Long break time!", description: `${cyclesBeforeLong} cycles done! Take ${longBreakMinutes} minutes.` });
      } else {
        setMode("break");
        toast({ title: "Break time!", description: `Nice work! Take a ${breakMinutes}-minute break.` });
      }
    } else {
      setMode("work");
      toast({ title: "Back to work!", description: "Ready for your next focus session?" });
    }

    const completedTask = (tasks as any[]).find(t => t.id === Number(selectedTaskId));
    genNudge.mutate();
  };

  const reset = () => {
    setIsRunning(false);
    const secs = mode === "work" ? workMinutes * 60 : mode === "break" ? breakMinutes * 60 : longBreakMinutes * 60;
    setSecondsLeft(secs);
    totalSeconds.current = secs;
  };

  const skip = () => handleComplete();

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = 1 - secondsLeft / totalSeconds.current;
  const circumference = 2 * Math.PI * 90;
  const dashOffset = circumference * (1 - progress);

  const modeColors = {
    work: "stroke-violet-500",
    break: "stroke-emerald-500",
    "long-break": "stroke-sky-500",
  };

  const modeBg = {
    work: "bg-violet-500/10 text-violet-600",
    break: "bg-emerald-500/10 text-emerald-600",
    "long-break": "bg-sky-500/10 text-sky-600",
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Focus Timer</h1>
          <p className="text-sm text-muted-foreground">Pomodoro-style sessions for ADHD minds</p>
        </div>
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-timer-settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Timer Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {[
                { label: "Work Duration", value: workMinutes, setter: setWorkMinutes, min: 5, max: 90 },
                { label: "Short Break", value: breakMinutes, setter: setBreakMinutes, min: 1, max: 30 },
                { label: "Long Break", value: longBreakMinutes, setter: setLongBreakMinutes, min: 5, max: 60 },
                { label: "Cycles before long break", value: cyclesBeforeLong, setter: setCyclesBeforeLong, min: 2, max: 8 },
              ].map(({ label, value, setter, min, max }) => (
                <div key={label}>
                  <div className="flex justify-between mb-2">
                    <Label className="text-sm">{label}</Label>
                    <span className="text-sm font-medium text-primary">{value} {label.includes("Cycles") ? "cycles" : "min"}</span>
                  </div>
                  <Slider
                    min={min} max={max} step={1}
                    value={[value]}
                    onValueChange={([v]) => setter(v)}
                    data-testid={`slider-${label.toLowerCase().replace(" ", "-")}`}
                  />
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Timer */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="pt-6">
              {/* Mode tabs */}
              <div className="flex gap-2 mb-8 justify-center">
                {(["work", "break", "long-break"] as Mode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                      mode === m ? modeBg[m] : "text-muted-foreground hover:bg-muted"
                    }`}
                    data-testid={`button-mode-${m}`}
                  >
                    {m === "work" ? "Focus" : m === "break" ? "Short Break" : "Long Break"}
                  </button>
                ))}
              </div>

              {/* Ring */}
              <div className="flex flex-col items-center">
                <div className="relative w-52 h-52">
                  <svg className="w-full h-full progress-ring" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="90" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                    <circle
                      cx="100" cy="100" r="90" fill="none"
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      className={`timer-ring ${modeColors[mode]}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-bold tabular-nums">
                      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                    </span>
                    <span className={`text-sm font-medium mt-1 capitalize ${
                      mode === "work" ? "text-violet-500" : mode === "break" ? "text-emerald-500" : "text-sky-500"
                    }`}>
                      {mode === "work" ? "Focus Time" : mode === "break" ? "Short Break" : "Long Break"}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      {cyclesCompleted} cycle{cyclesCompleted !== 1 ? "s" : ""} done
                    </span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-4 mt-6">
                  <button
                    onClick={reset}
                    className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    data-testid="button-timer-reset"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setIsRunning(r => !r)}
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-colors shadow-lg ${
                      mode === "work" ? "bg-violet-500 hover:bg-violet-600" :
                      mode === "break" ? "bg-emerald-500 hover:bg-emerald-600" :
                      "bg-sky-500 hover:bg-sky-600"
                    }`}
                    data-testid="button-timer-play"
                  >
                    {isRunning ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
                  </button>
                  <button
                    onClick={skip}
                    className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    data-testid="button-timer-skip"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Task selector */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Focusing on</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <SelectTrigger data-testid="select-task">
                  <SelectValue placeholder="Choose a task..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific task</SelectItem>
                  {pendingTasks.map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* AI Nudge */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-primary">
                <Zap className="w-4 h-4" />
                AI Nudge
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nudge ? (
                <p className="text-sm leading-relaxed">{nudge}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Start a session to receive personalized nudges.</p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="mt-3 text-xs"
                onClick={() => genNudge.mutate()}
                disabled={genNudge.isPending}
                data-testid="button-generate-nudge"
              >
                <Zap className="w-3 h-3 mr-1.5" />
                {genNudge.isPending ? "Generating..." : "Get new nudge"}
              </Button>
            </CardContent>
          </Card>

          {/* Cycle tracker */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Today's Cycles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: Math.max(8, cyclesCompleted + 1) }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                      i < cyclesCompleted
                        ? "bg-violet-500 text-white scale-105"
                        : "bg-muted text-muted-foreground"
                    }`}
                    data-testid={`cycle-${i}`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {cyclesCompleted} of {cyclesBeforeLong} until long break
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
