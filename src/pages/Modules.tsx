import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, Target, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import ModuleViewer from "@/components/ModuleViewer";
import AdminModuleForm from "@/components/AdminModuleForm";

export default function Modules() {
  const { user, hasRole } = useAuth();
  const isAdminOrCO = hasRole("admin") || hasRole("compliance_officer");
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const { data: modules, isLoading } = useQuery({
    queryKey: ["training-modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_modules")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: progressList } = useQuery({
    queryKey: ["module-progress-all", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_progress")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (activeModule) {
    return <ModuleViewer moduleId={activeModule} onBack={() => setActiveModule(null)} />;
  }

  const getProgress = (moduleId: string) => progressList?.find((p) => p.module_id === moduleId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Training Modules</h1>
        <p className="text-muted-foreground">DPDP Act 2023 compliance training curriculum</p>
      </div>

      {isAdminOrCO && <AdminModuleForm />}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-48" />
            </Card>
          ))}
        </div>
      ) : modules && modules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => {
            const prog = getProgress(mod.id);
            const pct = prog?.progress_percent || 0;
            const isCompleted = prog?.status === "completed";
            return (
              <Card
                key={mod.id}
                className="border-border/50 hover:shadow-md transition-shadow group cursor-pointer"
                onClick={() => setActiveModule(mod.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-accent/10 text-accent">
                      {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
                    </div>
                    <Badge variant={mod.is_mandatory ? "default" : "secondary"}>
                      {mod.is_mandatory ? "Mandatory" : "Optional"}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-3 group-hover:text-accent transition-colors">
                    {mod.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{mod.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {mod.duration_minutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-3.5 w-3.5" /> {mod.dpdp_section}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={pct} className="flex-1 h-1.5" />
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                  </div>
                  <Badge variant="outline" className="text-xs">v{mod.version}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-12 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No training modules yet</p>
            <p className="text-sm">Modules will appear here once created by an admin.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
