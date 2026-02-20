import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, XCircle, Trophy } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  assessmentId: string;
  onBack: () => void;
}

export default function AssessmentQuiz({ assessmentId, onBack }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: assessment } = useQuery({
    queryKey: ["assessment", assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("id", assessmentId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ["questions", assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("assessment_id", assessmentId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!questions || !assessment || !user) return;
      const score = questions.reduce((acc, q) => acc + (answers[q.id] === q.correct_option ? 1 : 0), 0);
      const total = questions.length;
      const pct = Math.round((score / total) * 100);
      const passed = pct >= assessment.pass_threshold;

      const { error } = await supabase.from("attempts").insert({
        user_id: user.id,
        assessment_id: assessmentId,
        score,
        total_questions: total,
        passed,
        answers: Object.entries(answers).map(([qId, opt]) => ({ question_id: qId, selected: opt })),
      });
      if (error) throw error;

      // If passed, create certificate
      if (passed && assessment.module_id) {
        await supabase.from("certificates").insert({
          user_id: user.id,
          module_id: assessment.module_id,
        });
      }

      return { score, total, pct, passed };
    },
    onSuccess: (result) => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["cert-count"] });
      queryClient.invalidateQueries({ queryKey: ["attempt-count"] });
      if (result?.passed) {
        toast({ title: "🎉 Congratulations!", description: `You passed with ${result.pct}%!` });
      } else {
        toast({ title: "Not passed", description: `Score: ${result?.pct}%. Try again!`, variant: "destructive" });
      }
    },
  });

  if (isLoading) {
    return <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full mx-auto mt-20" />;
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Card className="border-border/50">
          <CardContent className="p-12 text-center text-muted-foreground">
            <p>No questions configured for this assessment.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    const score = questions.reduce((acc, q) => acc + (answers[q.id] === q.correct_option ? 1 : 0), 0);
    const pct = Math.round((score / questions.length) * 100);
    const passed = pct >= (assessment?.pass_threshold || 70);

    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Card className={`border-2 ${passed ? "border-success/50" : "border-destructive/50"}`}>
          <CardContent className="p-8 text-center space-y-4">
            {passed ? (
              <Trophy className="h-16 w-16 text-success mx-auto" />
            ) : (
              <XCircle className="h-16 w-16 text-destructive mx-auto" />
            )}
            <h2 className="text-2xl font-display font-bold">{passed ? "Assessment Passed!" : "Not Passed"}</h2>
            <p className="text-4xl font-display font-bold">{pct}%</p>
            <p className="text-muted-foreground">{score}/{questions.length} correct</p>
            {passed && <Badge className="bg-success text-success-foreground">Certificate Issued</Badge>}

            {/* Review answers */}
            <div className="text-left space-y-4 mt-6">
              {questions.map((q, i) => {
                const correct = answers[q.id] === q.correct_option;
                const options = q.options as string[];
                return (
                  <div key={q.id} className={`p-4 rounded-lg border ${correct ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
                    <div className="flex items-start gap-2">
                      {correct ? <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                      <div>
                        <p className="text-sm font-medium">Q{i + 1}: {q.question_text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Your answer: {options[answers[q.id]]} | Correct: {options[q.correct_option]}
                        </p>
                        {q.explanation && <p className="text-xs text-muted-foreground mt-1 italic">{q.explanation}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const q = questions[currentQ];
  const options = q.options as string[];

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-accent transition-all duration-300 rounded-full" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
        </div>
        <span className="text-sm text-muted-foreground font-medium">{currentQ + 1}/{questions.length}</span>
      </div>

      <Card className="border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Question {currentQ + 1}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base leading-relaxed">{q.question_text}</p>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => setAnswers((a) => ({ ...a, [q.id]: idx }))}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  answers[q.id] === idx
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border/50 hover:border-accent/30"
                }`}
              >
                <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                {opt}
              </button>
            ))}
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentQ((c) => c - 1)} disabled={currentQ === 0}>
              Previous
            </Button>
            {currentQ === questions.length - 1 ? (
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={Object.keys(answers).length < questions.length || submitMutation.isPending}
              >
                {submitMutation.isPending ? "Submitting..." : "Submit"}
              </Button>
            ) : (
              <Button onClick={() => setCurrentQ((c) => c + 1)} disabled={answers[q.id] === undefined}>
                Next
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
