import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, BookOpen, Clock, Target, CheckCircle2, Bookmark } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  moduleId: string;
  onBack: () => void;
}

export default function ModuleViewer({ moduleId, onBack }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: mod } = useQuery({
    queryKey: ["module-detail", moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_modules")
        .select("*")
        .eq("id", moduleId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["module-progress", moduleId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_progress")
        .select("*")
        .eq("module_id", moduleId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Parse content into sections
  const sections = useMemo(() => {
    if (!mod?.content) return [];
    const parts = mod.content.split(/^## /m).filter(Boolean);
    return parts.map((part) => {
      const lines = part.split("\n");
      const title = lines[0].replace(/^#+ /, "").trim();
      const body = lines.slice(1).join("\n").trim();
      return { title, body };
    });
  }, [mod?.content]);

  const [currentSection, setCurrentSection] = useState(0);

  // Restore last section from progress
  useEffect(() => {
    if (progress?.last_section && sections.length > 0) {
      const idx = sections.findIndex((s) => s.title === progress.last_section);
      if (idx >= 0) setCurrentSection(idx);
    }
  }, [progress?.last_section, sections.length]);

  const upsertProgress = useMutation({
    mutationFn: async ({ sectionIdx, completed }: { sectionIdx: number; completed?: boolean }) => {
      if (!user || sections.length === 0) return;
      const pct = completed ? 100 : Math.round(((sectionIdx + 1) / sections.length) * 100);
      const sectionTitle = sections[sectionIdx]?.title || "";

      const { data: existing } = await supabase
        .from("module_progress")
        .select("id")
        .eq("module_id", moduleId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("module_progress")
          .update({
            progress_percent: pct,
            last_section: sectionTitle,
            status: completed ? "completed" : "in_progress",
            completed_at: completed ? new Date().toISOString() : null,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("module_progress").insert({
          user_id: user.id,
          module_id: moduleId,
          progress_percent: pct,
          last_section: sectionTitle,
          status: completed ? "completed" : "in_progress",
          started_at: new Date().toISOString(),
          completed_at: completed ? new Date().toISOString() : null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module-progress"] });
    },
  });

  const handleNext = () => {
    const next = currentSection + 1;
    if (next < sections.length) {
      setCurrentSection(next);
      upsertProgress.mutate({ sectionIdx: next });
    }
  };

  const handlePrev = () => {
    if (currentSection > 0) setCurrentSection(currentSection - 1);
  };

  const handleComplete = () => {
    upsertProgress.mutate({ sectionIdx: sections.length - 1, completed: true });
    toast({ title: "✅ Module Completed!", description: "You can now take the assessment." });
  };

  const handleBookmark = () => {
    upsertProgress.mutate({ sectionIdx: currentSection });
    toast({ title: "Bookmarked", description: "Your progress has been saved." });
  };

  if (!mod) {
    return <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full mx-auto mt-20" />;
  }

  const progressPct = progress?.progress_percent || 0;
  const isCompleted = progress?.status === "completed";

  // Render markdown-like content simply
  const renderContent = (body: string) => {
    return body.split("\n").map((line, i) => {
      if (line.startsWith("### ")) return <h3 key={i} className="text-lg font-display font-semibold mt-4 mb-2">{line.replace("### ", "")}</h3>;
      if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold mt-3 mb-1">{line.replace(/\*\*/g, "")}</p>;
      if (line.startsWith("- ")) return <li key={i} className="ml-4 text-sm leading-relaxed list-disc">{renderBoldInline(line.substring(2))}</li>;
      if (line.startsWith("| ")) return <p key={i} className="text-sm font-mono bg-muted/50 px-2 py-1 rounded">{line}</p>;
      if (line.match(/^\d+\. /)) return <li key={i} className="ml-4 text-sm leading-relaxed list-decimal">{renderBoldInline(line.replace(/^\d+\. /, ""))}</li>;
      if (line.trim() === "") return <br key={i} />;
      return <p key={i} className="text-sm leading-relaxed">{renderBoldInline(line)}</p>;
    });
  };

  const renderBoldInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) =>
      p.startsWith("**") ? <strong key={i}>{p.replace(/\*\*/g, "")}</strong> : p
    );
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Modules
        </Button>
        <Button variant="outline" size="sm" onClick={handleBookmark} className="gap-2">
          <Bookmark className="h-4 w-4" /> Bookmark
        </Button>
      </div>

      {/* Module Header */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl font-display">{mod.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{mod.description}</p>
            </div>
            <Badge variant={mod.is_mandatory ? "default" : "secondary"}>
              {mod.is_mandatory ? "Mandatory" : "Optional"}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {mod.duration_minutes} min</span>
            <span className="flex items-center gap-1"><Target className="h-3.5 w-3.5" /> {mod.dpdp_section}</span>
            <Badge variant="outline" className="text-xs">v{mod.version}</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-3">
            <Progress value={progressPct} className="flex-1 h-2" />
            <span className="text-sm font-medium text-muted-foreground">{progressPct}%</span>
            {isCompleted && <CheckCircle2 className="h-4 w-4 text-success" />}
          </div>
        </CardContent>
      </Card>

      {/* Objectives */}
      {mod.objectives && mod.objectives.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Learning Objectives</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {mod.objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                  {obj}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Content Section Navigation */}
      {sections.length > 0 && (
        <>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {sections.map((s, i) => (
              <button
                key={i}
                onClick={() => setCurrentSection(i)}
                className={`px-3 py-1.5 text-xs rounded-md whitespace-nowrap transition-colors ${
                  i === currentSection
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {s.title.length > 25 ? s.title.substring(0, 25) + "…" : s.title}
              </button>
            ))}
          </div>

          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">{sections[currentSection].title}</CardTitle>
              <p className="text-xs text-muted-foreground">Section {currentSection + 1} of {sections.length}</p>
            </CardHeader>
            <CardContent className="prose-sm">
              {renderContent(sections[currentSection].body)}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handlePrev} disabled={currentSection === 0} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Previous
            </Button>
            {currentSection === sections.length - 1 ? (
              <Button onClick={handleComplete} disabled={isCompleted} className="gap-2">
                {isCompleted ? "Completed ✓" : "Mark as Complete"}
              </Button>
            ) : (
              <Button onClick={handleNext} className="gap-2">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </>
      )}

      {sections.length === 0 && (
        <Card className="border-border/50">
          <CardContent className="p-12 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No content available for this module yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
