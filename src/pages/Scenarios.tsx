import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch } from "lucide-react";
import { useState } from "react";
import ScenarioPlayer from "@/components/ScenarioPlayer";

export default function Scenarios() {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  const { data: scenarios, isLoading } = useQuery({
    queryKey: ["scenarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scenarios")
        .select("*, training_modules(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (activeScenario) {
    return <ScenarioPlayer scenarioId={activeScenario} onBack={() => setActiveScenario(null)} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Scenario Simulations</h1>
        <p className="text-muted-foreground">Practice real-world DPDP compliance decisions</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6 h-36" /></Card>
          ))}
        </div>
      ) : scenarios && scenarios.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenarios.map((s) => (
            <Card
              key={s.id}
              className="border-border/50 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setActiveScenario(s.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10 text-warning">
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg group-hover:text-accent transition-colors">
                    {s.title}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{s.description}</p>
                {s.training_modules && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Module: {(s.training_modules as any).title}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-12 text-center text-muted-foreground">
            <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No scenarios yet</p>
            <p className="text-sm">Scenario simulations will appear once configured.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
