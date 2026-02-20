import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Target } from "lucide-react";

export default function Modules() {
  const { data: modules, isLoading } = useQuery({
    queryKey: ["training-modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_modules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Training Modules</h1>
        <p className="text-muted-foreground">DPDP Act 2023 compliance training curriculum</p>
      </div>

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
          {modules.map((mod) => (
            <Card key={mod.id} className="border-border/50 hover:shadow-md transition-shadow group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-accent/10 text-accent">
                    <BookOpen className="h-5 w-5" />
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
                <Badge variant="outline" className="text-xs">v{mod.version}</Badge>
              </CardContent>
            </Card>
          ))}
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
