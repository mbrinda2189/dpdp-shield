import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, HelpCircle } from "lucide-react";
import { useState } from "react";
import AssessmentQuiz from "@/components/AssessmentQuiz";
import AdminAssessmentForm from "@/components/AdminAssessmentForm";

export default function Assessments() {
  const { hasRole } = useAuth();
  const isAdminOrCO = hasRole("admin") || hasRole("compliance_officer");
  const [activeAssessment, setActiveAssessment] = useState<string | null>(null);

  const { data: assessments, isLoading } = useQuery({
    queryKey: ["assessments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*, training_modules(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (activeAssessment) {
    return <AssessmentQuiz assessmentId={activeAssessment} onBack={() => setActiveAssessment(null)} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Assessments</h1>
        <p className="text-muted-foreground">Test your DPDP compliance knowledge</p>
      </div>

      {isAdminOrCO && <AdminAssessmentForm />}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6 h-36" /></Card>
          ))}
        </div>
      ) : assessments && assessments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assessments.map((a) => (
            <Card
              key={a.id}
              className="border-border/50 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setActiveAssessment(a.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info/10 text-info">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg group-hover:text-accent transition-colors">
                      {a.title}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <HelpCircle className="h-3.5 w-3.5" /> {a.question_count} questions
                  </span>
                  <Badge variant="outline">Pass: {a.pass_threshold}%</Badge>
                </div>
                {a.training_modules && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Module: {(a.training_modules as any).title}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-12 text-center text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No assessments yet</p>
            <p className="text-sm">Assessments will appear once configured.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
