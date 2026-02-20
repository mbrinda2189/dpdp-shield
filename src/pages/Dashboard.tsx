import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Award, ClipboardCheck, GitBranch, TrendingUp, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const { user, roles, hasRole } = useAuth();

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

  const roleBadge = roles.length > 0 ? roles[0].replace("_", " ") : "employee";

  const stats = [
    { title: "Training Modules", value: moduleCount ?? 0, icon: BookOpen, color: "text-accent" },
    { title: "Certifications", value: certCount ?? 0, icon: Award, color: "text-success" },
    { title: "Assessments Taken", value: attemptCount ?? 0, icon: ClipboardCheck, color: "text-info" },
    { title: "Scenarios Available", value: scenarioCount ?? 0, icon: GitBranch, color: "text-warning" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="gradient-hero rounded-xl p-8 text-primary-foreground">
        <h1 className="text-3xl font-display font-bold mb-2">Welcome back!</h1>
        <p className="text-primary-foreground/80">
          Your role: <span className="capitalize font-semibold text-primary-foreground">{roleBadge}</span>
        </p>
        <p className="text-primary-foreground/60 text-sm mt-1">
          DPDP Act 2023 Compliance Training Platform
        </p>
      </div>

      {/* Stats */}
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
        </div>
      </div>
    </div>
  );
}
