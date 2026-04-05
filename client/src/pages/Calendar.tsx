import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const EVENT_COLORS = ["#7C3AED", "#2563EB", "#059669", "#D97706", "#DC2626", "#DB2777", "#0891B2"];

export default function CalendarPage() {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", startTime: "", endTime: "", color: "#7C3AED",
  });

  const { data: events = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/calendar"] });

  const createEvent = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/calendar", form);
      if (!res.ok) throw new Error("Failed to create event");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      setCreateOpen(false);
      setForm({ title: "", description: "", startTime: "", endTime: "", color: "#7C3AED" });
      toast({ title: "Event added", description: "Added to your calendar." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/calendar/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      toast({ title: "Event deleted" });
    },
  });

  // Calendar grid — always show 6 weeks
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const eventsOnDay = (date: Date) =>
    (events as any[]).filter(e => {
      const start = parseISO(e.startTime);
      return isSameDay(start, date);
    });

  const selectedEvents = selectedDate
    ? (events as any[]).filter(e => isSameDay(parseISO(e.startTime), selectedDate))
    : [];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Calendar</h1>
          <p className="text-sm text-muted-foreground">Schedule and sync your focus time.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-event">
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Calendar Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Title</Label>
                <Input
                  placeholder="Deep work session"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  data-testid="input-event-title"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  placeholder="Optional notes..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  data-testid="input-event-desc"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    data-testid="input-event-start"
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="datetime-local"
                    value={form.endTime}
                    onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    data-testid="input-event-end"
                  />
                </div>
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-1">
                  {EVENT_COLORS.map(c => (
                    <button
                      key={c}
                      className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? "scale-125 ring-2 ring-offset-2 ring-current" : ""}`}
                      style={{ backgroundColor: c, color: c }}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      data-testid={`color-${c}`}
                    />
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => form.title && form.startTime && form.endTime && createEvent.mutate()}
                disabled={createEvent.isPending || !form.title || !form.startTime || !form.endTime}
                data-testid="button-submit-event"
              >
                {createEvent.isPending ? "Adding..." : "Add Event"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{format(currentMonth, "MMMM yyyy")}</CardTitle>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setCurrentMonth(m => subMonths(m, 1))} data-testid="button-prev-month">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setCurrentMonth(new Date())} data-testid="button-today">
                  Today
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setCurrentMonth(m => addMonths(m, 1))} data-testid="button-next-month">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="cal-grid mb-1">
              {dayNames.map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            {/* Day cells */}
            <div className="cal-grid">
              {days.map((day, i) => {
                const dayEvents = eventsOnDay(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      relative min-h-[52px] p-1 rounded-lg text-left transition-colors text-xs
                      ${isSelected ? "bg-primary text-white" : isToday(day) ? "bg-primary/10 text-primary font-semibold" : isCurrentMonth ? "hover:bg-muted" : "opacity-30 hover:bg-muted"}
                    `}
                    data-testid={`day-${format(day, "yyyy-MM-dd")}`}
                  >
                    <span className={`block text-center font-medium ${isSelected ? "text-white" : ""}`}>
                      {format(day, "d")}
                    </span>
                    <div className="space-y-0.5 mt-0.5">
                      {dayEvents.slice(0, 2).map((e: any) => (
                        <div
                          key={e.id}
                          className="truncate px-1 rounded text-white text-[10px] leading-4"
                          style={{ backgroundColor: e.color }}
                        >
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className={`text-[10px] text-center ${isSelected ? "text-white/70" : "text-muted-foreground"}`}>
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected day events */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {selectedDate ? format(selectedDate, "EEEE, MMM d") : "Select a day"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedEvents.length === 0 ? (
              <div className="text-center py-6">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                <p className="text-xs text-muted-foreground">No events this day</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 text-xs"
                  onClick={() => {
                    if (selectedDate) {
                      const dateStr = format(selectedDate, "yyyy-MM-dd");
                      setForm(f => ({ ...f, startTime: `${dateStr}T09:00`, endTime: `${dateStr}T10:00` }));
                    }
                    setCreateOpen(true);
                  }}
                  data-testid="button-add-day-event"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add event
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((event: any) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-lg border-l-4"
                    style={{ borderLeftColor: event.color }}
                    data-testid={`event-item-${event.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{event.title}</p>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(event.startTime), "h:mm a")} – {format(parseISO(event.endTime), "h:mm a")}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteEvent.mutate(event.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors ml-2 flex-shrink-0"
                        data-testid={`button-delete-event-${event.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming events list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">All Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          {(events as any[]).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No events yet. Add your first event above!</p>
          ) : (
            <div className="space-y-2">
              {(events as any[]).slice(0, 10).map((event: any) => (
                <div key={event.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(event.startTime), "EEE, MMM d · h:mm a")}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteEvent.mutate(event.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                    data-testid={`button-delete-list-event-${event.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
