import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ClipboardCheck, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface QuestionForm {
  question_text: string;
  options: string[];
  correct_option: number;
  explanation: string;
}

export default function AdminAssessmentForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [moduleId, setModuleId] = useState<string>("");
  const [passThreshold, setPassThreshold] = useState(70);
  const [questions, setQuestions] = useState<QuestionForm[]>([
    { question_text: "", options: ["", "", "", ""], correct_option: 0, explanation: "" },
  ]);

  const { data: modules } = useQuery({
    queryKey: ["training-modules"],
    queryFn: async () => {
      const { data } = await supabase.from("training_modules").select("id, title");
      return data || [];
    },
  });

  const { data: assessments } = useQuery({
    queryKey: ["assessments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("assessments").select("*, training_modules(title)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validQuestions = questions.filter((q) => q.question_text.trim());
      const { data: assessment, error } = await supabase.from("assessments").insert({
        title,
        module_id: moduleId || null,
        pass_threshold: passThreshold,
        question_count: validQuestions.length,
      }).select().single();
      if (error) throw error;

      // Insert questions
      for (let i = 0; i < validQuestions.length; i++) {
        const q = validQuestions[i];
        const { error: qErr } = await supabase.from("questions").insert({
          assessment_id: assessment.id,
          question_text: q.question_text,
          options: q.options.filter((o) => o.trim()),
          correct_option: q.correct_option,
          explanation: q.explanation || null,
          sort_order: i,
        });
        if (qErr) throw qErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      toast({ title: "Assessment created" });
      setOpen(false);
      setTitle("");
      setModuleId("");
      setPassThreshold(70);
      setQuestions([{ question_text: "", options: ["", "", "", ""], correct_option: 0, explanation: "" }]);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("questions").delete().eq("assessment_id", id);
      await supabase.from("attempts").delete().eq("assessment_id", id);
      const { error } = await supabase.from("assessments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      toast({ title: "Assessment deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addQuestion = () => {
    setQuestions((q) => [...q, { question_text: "", options: ["", "", "", ""], correct_option: 0, explanation: "" }]);
  };

  const updateQuestion = (idx: number, partial: Partial<QuestionForm>) => {
    setQuestions((q) => q.map((question, i) => (i === idx ? { ...question, ...partial } : question)));
  };

  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    setQuestions((q) =>
      q.map((question, i) =>
        i === qIdx ? { ...question, options: question.options.map((o, j) => (j === optIdx ? value : o)) } : question
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Assessment</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Assessment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Assessment title" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Linked Module</Label>
                  <Select value={moduleId} onValueChange={setModuleId}>
                    <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                    <SelectContent>
                      {modules?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pass Threshold (%)</Label>
                  <Input type="number" value={passThreshold} onChange={(e) => setPassThreshold(parseInt(e.target.value) || 70)} min={0} max={100} />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Questions</Label>
                {questions.map((q, qi) => (
                  <Card key={qi} className="border-border/50">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Question {qi + 1}</span>
                        {questions.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setQuestions((q) => q.filter((_, j) => j !== qi))}><X className="h-3 w-3" /></Button>
                        )}
                      </div>
                      <Input value={q.question_text} onChange={(e) => updateQuestion(qi, { question_text: e.target.value })} placeholder="Question text" />
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${qi}`}
                            checked={q.correct_option === oi}
                            onChange={() => updateQuestion(qi, { correct_option: oi })}
                            className="accent-primary"
                          />
                          <Input value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + oi)}`} className="flex-1" />
                        </div>
                      ))}
                      <Input value={q.explanation} onChange={(e) => updateQuestion(qi, { explanation: e.target.value })} placeholder="Explanation (optional)" />
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" onClick={addQuestion} className="w-full gap-2"><Plus className="h-4 w-4" /> Add Question</Button>
              </div>

              <Button onClick={() => saveMutation.mutate()} disabled={!title || questions.every((q) => !q.question_text.trim()) || saveMutation.isPending} className="w-full">
                {saveMutation.isPending ? "Saving..." : "Create Assessment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {assessments?.map((a) => (
        <Card key={a.id} className="border-border/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-info" />
                <p className="font-medium">{a.title}</p>
              </div>
              <p className="text-xs text-muted-foreground">{a.question_count} questions · Pass: {a.pass_threshold}%</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(a.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
