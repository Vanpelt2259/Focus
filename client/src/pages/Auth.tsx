import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Zap, Eye, EyeOff } from "lucide-react";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPass, setShowPass] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({ email: "", password: "", username: "", displayName: "" });

  const mutation = useMutation({
    mutationFn: async () => {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { email: form.email, password: form.password }
        : form;
      const res = await apiRequest("POST", path, body);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Authentication failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col w-1/2 bg-[hsl(var(--sidebar-background))] p-12 justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">FocusBuddy</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Your ADHD<br />body double,<br />always on.
          </h1>
          <p className="text-[hsl(var(--sidebar-foreground))] text-lg opacity-70 max-w-md">
            Focus timers, AI nudges, live accountability sessions, and a community that gets it — built for ADHD brains.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-4">
            {[
              { emoji: "⏱️", title: "Smart Timers", desc: "Customizable Pomodoro & focus sessions" },
              { emoji: "🤖", title: "AI Nudges", desc: "Gentle reminders when your brain drifts" },
              { emoji: "👥", title: "Live Sessions", desc: "Body-double accountability rooms" },
              { emoji: "📊", title: "Daily Reports", desc: "Track your wins and patterns" },
            ].map(f => (
              <div key={f.title} className="bg-[hsl(var(--sidebar-accent))] rounded-xl p-4">
                <div className="text-2xl mb-2">{f.emoji}</div>
                <div className="text-white font-semibold text-sm">{f.title}</div>
                <div className="text-[hsl(var(--sidebar-foreground))] text-xs opacity-60 mt-0.5">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[hsl(var(--sidebar-foreground))] text-xs opacity-40">
          Built with compassion for ADHD minds everywhere.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="lg:hidden flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-primary">FocusBuddy</span>
            </div>
            <CardTitle>{mode === "login" ? "Welcome back" : "Create your account"}</CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Sign in to your FocusBuddy workspace"
                : "Start your ADHD-friendly focus journey"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handle} className="space-y-4">
              {mode === "register" && (
                <>
                  <div>
                    <Label htmlFor="displayName">Full Name</Label>
                    <Input
                      id="displayName"
                      data-testid="input-display-name"
                      placeholder="Your name"
                      value={form.displayName}
                      onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      data-testid="input-username"
                      placeholder="focusmaster99"
                      value={form.username}
                      onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                      required
                    />
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  data-testid="input-email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    data-testid="input-password"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPass(s => !s)}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending}
                data-testid="button-submit-auth"
              >
                {mutation.isPending ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>Don't have an account?{" "}
                  <button
                    className="text-primary font-medium hover:underline"
                    onClick={() => setMode("register")}
                    data-testid="button-switch-mode"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>Already have an account?{" "}
                  <button
                    className="text-primary font-medium hover:underline"
                    onClick={() => setMode("login")}
                    data-testid="button-switch-mode"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>

            {/* Demo account hint */}
            <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
              <strong>Try it:</strong> Create a free account or use the demo to explore all features.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
