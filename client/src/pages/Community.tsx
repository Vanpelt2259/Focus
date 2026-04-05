import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Plus, MessageSquare, Share2, CheckCircle2, Clock, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const CATEGORIES = ["general", "work", "study", "health", "creative", "chores", "finance", "personal"];

export default function CommunityPage() {
  const { toast } = useToast();
  const [shareOpen, setShareOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ title: "", description: "", category: "general", estimatedMinutes: 25 });

  const { data: communityTasks = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks/community"],
  });

  const shareTask = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tasks", {
        ...form,
        isPublic: true,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/community"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShareOpen(false);
      setForm({ title: "", description: "", category: "general", estimatedMinutes: 25 });
      toast({ title: "Task shared!", description: "Your task is now visible to the community." });
    },
    onError: () => toast({ title: "Error", description: "Failed to share task.", variant: "destructive" }),
  });

  const likeTask = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await apiRequest("POST", `/api/tasks/${taskId}/like`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/community"] });
    },
  });

  const copyTask = useMutation({
    mutationFn: async (task: any) => {
      const res = await apiRequest("POST", "/api/tasks", {
        title: task.title,
        description: task.description,
        category: task.category,
        estimatedMinutes: task.estimatedMinutes,
        isPublic: false,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task copied!", description: "Added to your task list." });
    },
  });

  const filtered = filter === "all"
    ? (communityTasks as any[])
    : (communityTasks as any[]).filter(t => t.category === filter);

  const categoryColors: Record<string, string> = {
    work: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    study: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
    health: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    creative: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400",
    chores: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
    finance: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    personal: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    general: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Community Tasks</h1>
          <p className="text-sm text-muted-foreground">Share what you're working on. Get inspired by others.</p>
        </div>
        <Dialog open={shareOpen} onOpenChange={setShareOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-share-task">
              <Share2 className="w-4 h-4 mr-2" />
              Share a Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share with Community</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Task Title</Label>
                <Input
                  placeholder="e.g. Clear email inbox"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  data-testid="input-share-title"
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="Add context or tips..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  data-testid="input-share-desc"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estimated time</Label>
                  <Select
                    value={String(form.estimatedMinutes)}
                    onValueChange={v => setForm(f => ({ ...f, estimatedMinutes: Number(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 15, 25, 30, 45, 60, 90].map(m => (
                        <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => form.title && shareTask.mutate()}
                disabled={shareTask.isPending || !form.title}
                data-testid="button-submit-share"
              >
                {shareTask.isPending ? "Sharing..." : "Share Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            filter === "all" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
          data-testid="filter-all"
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
              filter === cat ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            data-testid={`filter-${cat}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Task feed */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-28 skeleton rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="font-medium mb-1">No tasks here yet</p>
            <p className="text-sm text-muted-foreground mb-4">Be the first to share a task with the community!</p>
            <Button onClick={() => setShareOpen(true)}>Share a task</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((task: any) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  {/* Author avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: task.authorColor }}
                  >
                    {task.authorInitials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{task.authorName}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${categoryColors[task.category] || categoryColors.general}`}>
                          {task.category}
                        </span>
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{task.description}</p>
                    )}

                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.estimatedMinutes} min
                      </span>
                      {task.isCompleted && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Completed
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <button
                    onClick={() => likeTask.mutate(task.id)}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                      task.liked
                        ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                    data-testid={`button-like-${task.id}`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${task.liked ? "fill-current" : ""}`} />
                    {task.likes}
                  </button>

                  <button
                    onClick={() => copyTask.mutate(task)}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                    data-testid={`button-copy-task-${task.id}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add to my list
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
