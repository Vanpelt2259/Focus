import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, Video, VideoOff, Mic, MicOff, PhoneOff, Share2, Copy, UserCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function SessionsPage() {
  const { toast } = useToast();
  const { data: user } = useQuery<any>({ queryKey: ["/api/auth/me"] });
  const { data: sessions = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/sessions"] });

  const [createOpen, setCreateOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [form, setForm] = useState({ title: "", description: "", maxParticipants: 8 });

  // Active session state (simulated)
  const [activeSession, setActiveSession] = useState<any>(null);
  const [videoOn, setVideoOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (activeSession) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeSession]);

  const createSession = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sessions", form);
      if (!res.ok) throw new Error("Failed to create session");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setCreateOpen(false);
      setActiveSession(data);
      toast({ title: "Session created!", description: `Room code: ${data.roomCode}` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const joinSession = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", `/api/sessions/${code}/join`);
      if (!res.ok) throw new Error("Session not found");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setActiveSession(data);
      toast({ title: "Joined session!", description: `Welcome to ${data.title}` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const leaveSession = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/sessions/${activeSession.roomCode}/leave`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setActiveSession(null);
      toast({ title: "Left session", description: "Great work today!" });
    },
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => toast({ title: "Copied!", description: "Room code copied to clipboard." }));
  };

  const elapsedStr = `${String(Math.floor(elapsed / 3600)).padStart(2, "0")}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  // Simulated participant avatars
  const fakeParticipants = [
    { name: user?.displayName || "You", initials: user?.avatarInitials || "?", color: user?.avatarColor || "#7C3AED", isYou: true },
    { name: "Jordan M.", initials: "JM", color: "#2563EB", isYou: false },
    { name: "Sam K.", initials: "SK", color: "#059669", isYou: false },
  ];

  if (activeSession) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        {/* Active session banner */}
        <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <div>
              <p className="font-semibold text-sm">{activeSession.title}</p>
              <p className="text-xs text-muted-foreground">Room: <span className="font-mono">{activeSession.roomCode}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-muted-foreground">{elapsedStr}</span>
            <button
              onClick={() => copyCode(activeSession.roomCode)}
              className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              title="Copy room code"
              data-testid="button-copy-code"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video grid */}
        <Card>
          <CardContent className="pt-4">
            <div className="video-grid mb-4">
              {fakeParticipants.map((p, i) => (
                <div
                  key={i}
                  className="aspect-video rounded-xl bg-muted flex flex-col items-center justify-center relative overflow-hidden"
                  style={{ minHeight: 140 }}
                  data-testid={`video-participant-${i}`}
                >
                  {/* Simulated "video" — gradient background */}
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{ background: `radial-gradient(circle at center, ${p.color}, transparent)` }}
                  />
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold mb-2 relative z-10"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.initials}
                  </div>
                  <p className="text-xs font-medium relative z-10">{p.isYou ? "You" : p.name}</p>
                  {p.isYou && !videoOn && (
                    <div className="absolute top-2 right-2">
                      <VideoOff className="w-4 h-4 text-red-400" />
                    </div>
                  )}
                  {i > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/40 rounded px-1.5 py-0.5">
                      <span className="text-xs text-white">focusing</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setMicOn(m => !m)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${micOn ? "bg-muted hover:bg-muted/80" : "bg-red-500/20 text-red-500"}`}
                data-testid="button-toggle-mic"
              >
                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setVideoOn(v => !v)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${videoOn ? "bg-muted hover:bg-muted/80" : "bg-red-500/20 text-red-500"}`}
                data-testid="button-toggle-video"
              >
                {videoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
              <button
                onClick={() => leaveSession.mutate()}
                className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                data-testid="button-leave-session"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-3">
              {fakeParticipants.length} people focusing together · Body double mode active
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Live Sessions</h1>
          <p className="text-sm text-muted-foreground">Body-double accountability rooms. Focus together, get more done.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-create-session">
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Focus Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Session Title</Label>
                <Input
                  placeholder="Deep work sprint"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  data-testid="input-session-title"
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input
                  placeholder="What are we working on?"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  data-testid="input-session-desc"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => form.title && createSession.mutate()}
                disabled={createSession.isPending || !form.title}
                data-testid="button-submit-session"
              >
                {createSession.isPending ? "Creating..." : "Start Session"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Join by code */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-medium mb-3">Join by room code</p>
          <div className="flex gap-2">
            <Input
              placeholder="Enter 6-letter code..."
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              className="font-mono text-sm"
              maxLength={6}
              data-testid="input-join-code"
            />
            <Button
              onClick={() => joinCode.length === 6 && joinSession.mutate(joinCode)}
              disabled={joinCode.length !== 6 || joinSession.isPending}
              data-testid="button-join-by-code"
            >
              Join
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Session list */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Active Sessions ({(sessions as any[]).length})
        </h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-24 skeleton rounded-xl" />)}
          </div>
        ) : (sessions as any[]).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="font-medium mb-1">No active sessions</p>
              <p className="text-sm text-muted-foreground mb-4">Be the first to start a body-double session!</p>
              <Button onClick={() => setCreateOpen(true)}>Create a session</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {(sessions as any[]).map((s: any) => (
              <Card key={s.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-sm">{s.title}</h3>
                      {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mt-1" />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {s.participantCount} focusing
                    </span>
                    <span>Host: {s.hostName}</span>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => joinSession.mutate(s.roomCode)}
                    disabled={joinSession.isPending}
                    data-testid={`button-join-session-${s.id}`}
                  >
                    Join Session
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
