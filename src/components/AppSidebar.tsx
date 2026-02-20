import { useAuth } from "@/lib/auth";
import { NavLink, useLocation } from "react-router-dom";
import {
  Shield,
  LayoutDashboard,
  BookOpen,
  GitBranch,
  ClipboardCheck,
  Award,
  FileText,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: [] },
  { to: "/modules", icon: BookOpen, label: "Training Modules", roles: [] },
  { to: "/scenarios", icon: GitBranch, label: "Scenarios", roles: [] },
  { to: "/assessments", icon: ClipboardCheck, label: "Assessments", roles: [] },
  { to: "/certificates", icon: Award, label: "Certificates", roles: [] },
  { to: "/reports", icon: FileText, label: "Reports", roles: ["admin", "compliance_officer"] },
  { to: "/users", icon: Users, label: "Users", roles: ["admin"] },
];

export default function AppSidebar() {
  const { signOut, hasRole, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const filteredNav = navItems.filter(
    (item) => item.roles.length === 0 || item.roles.some((r) => hasRole(r))
  );

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-sidebar-border">
        <Shield className="h-7 w-7 text-sidebar-primary shrink-0" />
        {!collapsed && (
          <span className="font-display font-bold text-lg text-sidebar-primary-foreground">
            DPDP Comply
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 w-full transition-colors"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-1.5 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
