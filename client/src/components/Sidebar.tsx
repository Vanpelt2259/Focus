import { Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { Timer, Users, Calendar, BarChart3, MessageSquare, Home, LogOut, Zap, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  user: { displayName: string; avatarInitials: string; avatarColor: string };
  onLogout: () => void;
}

const navItems = [
  { href: "/", icon: Home, label: "Dashboard" },
  { href: "/timer", icon: Timer, label: "Focus Timer" },
  { href: "/sessions", icon: Users, label: "Live Sessions" },
  { href: "/community", icon: MessageSquare, label: "Community" },
  { href: "/calendar", icon: Calendar, label: "Calendar" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
];

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const [location] = useHashLocation();

  const { data: nudges } = useQuery<any[]>({
    queryKey: ["/api/nudges"],
  });

  const unread = nudges?.filter(n => !n.isRead).length || 0;

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]">
      {/* Logo */}
      <div className="p-5 border-b border-[hsl(var(--sidebar-border))]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[hsl(var(--sidebar-primary))] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-none stroke-current stroke-2">
              <circle cx="9" cy="10" r="2.5" />
              <circle cx="15" cy="10" r="2.5" />
              <path d="M6 18 Q12 22 18 18" strokeLinecap="round" />
              <path d="M12 2 L12 5M12 2 L9 4M12 2 L15 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-none">FocusBuddy</div>
            <div className="text-[hsl(var(--sidebar-foreground))] text-xs opacity-60 mt-0.5">ADHD Workspace</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = location === href || (href === "/" && location === "");
          return (
            <Link key={href} href={href}>
              <a
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))]"
                    : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]"
                )}
                data-testid={`nav-${label.toLowerCase().replace(" ", "-")}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
                {label === "Community" && unread > 0 && (
                  <Badge className="ml-auto text-xs h-5 bg-[hsl(var(--sidebar-primary))] text-white border-0">
                    {unread}
                  </Badge>
                )}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-[hsl(var(--sidebar-border))]">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: user.avatarColor }}
          >
            {user.avatarInitials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{user.displayName}</div>
            <div className="text-xs text-[hsl(var(--sidebar-foreground))] opacity-60">Online</div>
          </div>
          <button
            onClick={onLogout}
            className="text-[hsl(var(--sidebar-foreground))] hover:text-white transition-colors p-1"
            title="Sign out"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
