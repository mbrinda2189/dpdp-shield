import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, XCircle, Trophy, Clock, AlertCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
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
  const [showFeedback, setShowFeedback] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Start timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

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
      clearInterval(timerRef.current);
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

  const handleSelectAnswer = (qId: string, optIdx: number) => {
    if (showFeedback) return; // Locked during feedback
    setAnswers((a) => ({ ...a, [qId]: optIdx }));
    setShowFeedback(true);
    // Show feedback for 1.5s then allow proceeding
    setTimeout(() => setShowFeedback(false), 1500);
  };

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
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> Time: {formatTime(elapsed)}</span>
              <span>Pass threshold: {assessment?.pass_threshold}%</span>
            </div>
            {passed && <Badge className="bg-success text-success-foreground">Certificate Issued</Badge>}
            {!passed && (
              <p className="text-sm text-muted-foreground">You need {assessment?.pass_threshold}% to pass. You can retake this assessment.</p>
            )}

            {/* Review answers */}
            <div className="text-left space-y-4 mt-6">
              <h3 className="font-display font-semibold text-lg">Answer Review</h3>
              {questions.map((q, i) => {
                const correct = answers[q.id] === q.correct_option;
                const options = q.options as string[];
                return (
                  <div key={q.id} className={`p-4 rounded-lg border ${correct ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
                    <div className="flex items-start gap-2">
                      {correct ? <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-medium">Q{i + 1}: {q.question_text}</p>
                        <p className="text-xs text-muted-foreground">
                          Your answer: <span className={correct ? "text-success" : "text-destructive"}>{options[answers[q.id]]}</span>
                        </p>
                        {!correct && (
                          <p className="text-xs text-success">Correct: {options[q.correct_option]}</p>
                        )}
                        {q.explanation && (
                          <p className="text-xs text-muted-foreground mt-1 italic border-l-2 border-accent/30 pl-2">{q.explanation}</p>
                        )}
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
  const hasAnswered = answers[q.id] !== undefined;
  const isCorrect = hasAnswered && answers[q.id] === q.correct_option;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="font-mono">{formatTime(elapsed)}</span>
        </div>
      </div>

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
            {options.map((opt, idx) => {
              const isSelected = answers[q.id] === idx;
              const showCorrectness = hasAnswered && showFeedback;
              const isCorrectOpt = idx === q.correct_option;

              let borderClass = "border-border/50 hover:border-accent/30";
              if (isSelected && !showCorrectness) borderClass = "border-accent bg-accent/10";
              if (showCorrectness && isSelected && isCorrectOpt) borderClass = "border-success bg-success/10";
              if (showCorrectness && isSelected && !isCorrectOpt) borderClass = "border-destructive bg-destructive/10";
              if (showCorrectness && !isSelected && isCorrectOpt) borderClass = "border-success/50 bg-success/5";

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectAnswer(q.id, idx)}
                  disabled={hasAnswered}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${borderClass} disabled:cursor-default`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                    <span className="flex-1">{opt}</span>
                    {showCorrectness && isSelected && isCorrectOpt && <CheckCircle2 className="h-4 w-4 text-success" />}
                    {showCorrectness && isSelected && !isCorrectOpt && <XCircle className="h-4 w-4 text-destructive" />}
                    {showCorrectness && !isSelected && isCorrectOpt && <CheckCircle2 className="h-4 w-4 text-success/50" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {hasAnswered && showFeedback && q.explanation && (
            <div className={`p-3 rounded-lg text-sm ${isCorrect ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{q.explanation}</span>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentQ((c) => c - 1)} disabled={currentQ === 0}>
              Previous
            </Button>
            {currentQ === questions.length - 1 ? (
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={Object.keys(answers).length < questions.length || submitMutation.isPending}
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Assessment"}
              </Button>
            ) : (
              <Button onClick={() => setCurrentQ((c) => c + 1)} disabled={!hasAnswered || showFeedback}>
                Next
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
