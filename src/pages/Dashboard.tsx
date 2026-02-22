import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Award, ClipboardCheck, GitBranch, AlertTriangle, PlayCircle, Users, ShieldCheck, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

function AdminOrgStats() {
  const { data: totalUsers } = useQuery({
    queryKey: ["org-user-count"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: allProgress } = useQuery({
    queryKey: ["org-all-progress"],
    queryFn: async () => {
      const { data } = await supabase.from("module_progress").select("status, user_id, training_modules(title, is_mandatory)");
      return data || [];
    },
  });

  const { data: allAttempts } = useQuery({
    queryKey: ["org-all-attempts"],
    queryFn: async () => {
      const { data } = await supabase.from("attempts").select("passed, user_id");
      return data || [];
    },
  });

  const { data: allRoles } = useQuery({
    queryKey: ["org-all-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, role");
      return data || [];
    },
  });

  const completedCount = allProgress?.filter((p) => p.status === "completed").length || 0;
  const totalEntries = allProgress?.length || 1;
  const orgCompletionRate = Math.round((completedCount / Math.max(totalEntries, 1)) * 100);

  const totalAttempts = allAttempts?.length || 0;
  const passedAttempts = allAttempts?.filter((a) => a.passed).length || 0;
  const orgPassRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;

  const roleBreakdown = {
    admin: allRoles?.filter((r) => r.role === "admin").length || 0,
    compliance_officer: allRoles?.filter((r) => r.role === "compliance_officer").length || 0,
    employee: allRoles?.filter((r) => r.role === "employee").length || 0,
  };

  // Users with incomplete mandatory modules
  const uniqueUsersWithProgress = new Set(allProgress?.map((p) => p.user_id));
  const usersCompleted = new Set(
    allProgress?.filter((p) => p.status === "completed" && (p.training_modules as any)?.is_mandatory).map((p) => p.user_id)
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-display font-semibold flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-accent" /> Organization Overview
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Users</CardTitle></CardHeader>
          <CardContent>
            <span className="text-3xl font-display font-bold">{totalUsers ?? 0}</span>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">{roleBreakdown.admin} Admin</Badge>
              <Badge variant="outline" className="text-xs">{roleBreakdown.compliance_officer} CO</Badge>
              <Badge variant="outline" className="text-xs">{roleBreakdown.employee} Emp</Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Org Completion Rate</CardTitle></CardHeader>
          <CardContent>
            <span className="text-3xl font-display font-bold text-accent">{orgCompletionRate}%</span>
            <Progress value={orgCompletionRate} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Org Pass Rate</CardTitle></CardHeader>
          <CardContent>
            <span className="text-3xl font-display font-bold text-success">{orgPassRate}%</span>
            <p className="text-xs text-muted-foreground mt-1">{passedAttempts}/{totalAttempts} attempts</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Users In Training</CardTitle></CardHeader>
          <CardContent>
            <span className="text-3xl font-display font-bold text-info">{uniqueUsersWithProgress.size}</span>
            <p className="text-xs text-muted-foreground mt-1">{usersCompleted.size} with mandatory done</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, roles, hasRole } = useAuth();
  const isAdminOrCO = hasRole("admin") || hasRole("compliance_officer");

  const { data: moduleCount } = useQuery({
    queryKey: ["module-count"],
    queryFn: async () => {
      const { count } = await supabase.from("training_modules").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: certCount } = useQuery({
    queryKey: ["cert-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("certificates").select("*", { count: "exact", head: true }).eq("user_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: attemptCount } = useQuery({
    queryKey: ["attempt-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("attempts").select("*", { count: "exact", head: true }).eq("user_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: scenarioCount } = useQuery({
    queryKey: ["scenario-count"],
    queryFn: async () => {
      const { count } = await supabase.from("scenarios").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: progressList } = useQuery({
    queryKey: ["module-progress-all", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_progress")
        .select("*, training_modules(title, is_mandatory)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: mandatoryModules } = useQuery({
    queryKey: ["mandatory-modules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("training_modules").select("id, title").eq("is_mandatory", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: expiringCerts } = useQuery({
    queryKey: ["expiring-certs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("*, training_modules(title)")
        .eq("user_id", user!.id)
        .order("valid_until", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const roleBadge = roles.length > 0 ? roles[0].replace("_", " ") : "employee";

  const stats = [
    { title: "Training Modules", value: moduleCount ?? 0, icon: BookOpen, color: "text-accent" },
    { title: "Certifications", value: certCount ?? 0, icon: Award, color: "text-success" },
    { title: "Assessments Taken", value: attemptCount ?? 0, icon: ClipboardCheck, color: "text-info" },
    { title: "Scenarios Available", value: scenarioCount ?? 0, icon: GitBranch, color: "text-warning" },
  ];

  const completedIds = new Set(progressList?.filter((p) => p.status === "completed").map((p) => p.module_id) || []);
  const overdueModules = mandatoryModules?.filter((m) => !completedIds.has(m.id)) || [];
  const inProgressModules = progressList?.filter((p) => p.status === "in_progress") || [];

  const totalMandatory = mandatoryModules?.length || 0;
  const completedMandatory = mandatoryModules?.filter((m) => completedIds.has(m.id)).length || 0;
  const overallPct = totalMandatory > 0 ? Math.round((completedMandatory / totalMandatory) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="gradient-hero rounded-xl p-8 text-primary-foreground">
        <h1 className="text-3xl font-display font-bold mb-2">Welcome back!</h1>
        <p className="text-primary-foreground/80">
          Your role: <Badge className="ml-1 capitalize bg-primary-foreground/20 text-primary-foreground border-0">{roleBadge}</Badge>
        </p>
        <p className="text-primary-foreground/60 text-sm mt-1">
          DPDP Act 2023 Compliance Training Platform
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Progress value={overallPct} className="flex-1 h-3 bg-primary-foreground/20" />
          <span className="text-sm font-semibold text-primary-foreground">{overallPct}% Complete</span>
        </div>
        <p className="text-xs text-primary-foreground/50 mt-1">{completedMandatory}/{totalMandatory} mandatory modules completed</p>
      </div>

      {/* Admin/CO Organization Overview */}
      {isAdminOrCO && <AdminOrgStats />}

      {/* Personal Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts & In-Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" /> Pending Mandatory Training
          </h2>
          {overdueModules.length > 0 ? (
            <div className="space-y-2">
              {overdueModules.map((m) => (
                <a key={m.id} href="/modules">
                  <Card className="border-warning/30 bg-warning/5 hover:bg-warning/10 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-3">
                      <BookOpen className="h-4 w-4 text-warning shrink-0" />
                      <span className="text-sm font-medium">{m.title}</span>
                      <Badge variant="outline" className="ml-auto text-xs text-warning border-warning/50">Incomplete</Badge>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          ) : (
            <Card className="border-success/30 bg-success/5">
              <CardContent className="p-4 text-sm text-success flex items-center gap-2">
                <Award className="h-4 w-4" /> All mandatory training completed!
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <h2 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-info" /> Continue Training
          </h2>
          {inProgressModules.length > 0 ? (
            <div className="space-y-2">
              {inProgressModules.map((p) => (
                <a key={p.id} href="/modules">
                  <Card className="border-border/50 hover:shadow-sm transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{(p.training_modules as any)?.title}</span>
                        <span className="text-xs text-muted-foreground">{p.progress_percent}%</span>
                      </div>
                      <Progress value={p.progress_percent} className="h-1.5" />
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-4 text-sm text-muted-foreground">
                No modules in progress. Start a module to track your progress.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Certification Status */}
      {expiringCerts && expiringCerts.length > 0 && (
        <div>
          <h2 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
            <Award className="h-5 w-5 text-accent" /> Certification Status
          </h2>
          <div className="space-y-2">
            {expiringCerts.map((cert) => {
              const isValid = new Date(cert.valid_until) > new Date();
              const daysLeft = Math.ceil((new Date(cert.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <Card key={cert.id} className="border-border/50">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Award className={`h-4 w-4 shrink-0 ${isValid ? "text-success" : "text-destructive"}`} />
                    <span className="text-sm font-medium flex-1">{(cert.training_modules as any)?.title}</span>
                    <span className="text-xs text-muted-foreground">
                      Expires: {format(new Date(cert.valid_until), "MMM d, yyyy")}
                    </span>
                    <Badge className={`text-xs ${
                      !isValid ? "bg-destructive text-destructive-foreground" :
                      daysLeft < 30 ? "bg-warning text-warning-foreground" :
                      "bg-success text-success-foreground"
                    }`}>
                      {!isValid ? "Expired" : daysLeft < 30 ? `${daysLeft}d left` : "Valid"}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-display font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/modules" className="group">
            <Card className="border-border/50 hover:border-accent/50 transition-colors cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Start Training</h3>
                  <p className="text-sm text-muted-foreground">Browse available modules</p>
                </div>
              </CardContent>
            </Card>
          </a>
          <a href="/scenarios" className="group">
            <Card className="border-border/50 hover:border-accent/50 transition-colors cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-warning/10 text-warning group-hover:bg-warning group-hover:text-warning-foreground transition-colors">
                  <GitBranch className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Run Simulation</h3>
                  <p className="text-sm text-muted-foreground">Practice compliance scenarios</p>
                </div>
              </CardContent>
            </Card>
          </a>
          {isAdminOrCO ? (
            <a href="/reports" className="group">
              <Card className="border-border/50 hover:border-accent/50 transition-colors cursor-pointer">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-info/10 text-info group-hover:bg-info group-hover:text-info-foreground transition-colors">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">View Reports</h3>
                    <p className="text-sm text-muted-foreground">Organization compliance metrics</p>
                  </div>
                </CardContent>
              </Card>
            </a>
          ) : (
            <a href="/assessments" className="group">
              <Card className="border-border/50 hover:border-accent/50 transition-colors cursor-pointer">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-info/10 text-info group-hover:bg-info group-hover:text-info-foreground transition-colors">
                    <ClipboardCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Take Assessment</h3>
                    <p className="text-sm text-muted-foreground">Test your knowledge</p>
                  </div>
                </CardContent>
              </Card>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
