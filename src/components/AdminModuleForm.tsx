import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Trash2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ModuleFormData {
  title: string;
  description: string;
  dpdp_section: string;
  duration_minutes: number;
  is_mandatory: boolean;
  content: string;
  objectives: string[];
  version: string;
}

const EMPTY_FORM: ModuleFormData = {
  title: "",
  description: "",
  dpdp_section: "",
  duration_minutes: 30,
  is_mandatory: true,
  content: "",
  objectives: [],
  version: "1.0",
};

export default function AdminModuleForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ModuleFormData>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [newObjective, setNewObjective] = useState("");

  const { data: modules } = useQuery({
    queryKey: ["training-modules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("training_modules").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from("training_modules").update({
          title: form.title,
          description: form.description,
          dpdp_section: form.dpdp_section,
          duration_minutes: form.duration_minutes,
          is_mandatory: form.is_mandatory,
          content: form.content,
          objectives: form.objectives,
          version: form.version,
        }).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("training_modules").insert({
          title: form.title,
          description: form.description,
          dpdp_section: form.dpdp_section,
          duration_minutes: form.duration_minutes,
          is_mandatory: form.is_mandatory,
          content: form.content,
          objectives: form.objectives,
          version: form.version,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-modules"] });
      queryClient.invalidateQueries({ queryKey: ["module-count"] });
      toast({ title: editId ? "Module updated" : "Module created" });
      setOpen(false);
      setForm(EMPTY_FORM);
      setEditId(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("training_modules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-modules"] });
      toast({ title: "Module deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openEdit = (mod: any) => {
    setForm({
      title: mod.title,
      description: mod.description || "",
      dpdp_section: mod.dpdp_section,
      duration_minutes: mod.duration_minutes,
      is_mandatory: mod.is_mandatory,
      content: mod.content || "",
      objectives: mod.objectives || [],
      version: mod.version,
    });
    setEditId(mod.id);
    setOpen(true);
  };

  const addObjective = () => {
    if (newObjective.trim()) {
      setForm((f) => ({ ...f, objectives: [...f.objectives, newObjective.trim()] }));
      setNewObjective("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(EMPTY_FORM); setEditId(null); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Module</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Module" : "Create Training Module"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Module title" />
                </div>
                <div className="space-y-2">
                  <Label>DPDP Section *</Label>
                  <Input value={form.dpdp_section} onChange={(e) => setForm((f) => ({ ...f, dpdp_section: e.target.value }))} placeholder="e.g., Section 4" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Module description" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Duration (min)</Label>
                  <Input type="number" value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: parseInt(e.target.value) || 30 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Version</Label>
                  <Input value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} />
                </div>
                <div className="space-y-2 flex items-end gap-2">
                  <div className="flex items-center gap-2 pb-2">
                    <Switch checked={form.is_mandatory} onCheckedChange={(v) => setForm((f) => ({ ...f, is_mandatory: v }))} />
                    <Label>Mandatory</Label>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Objectives</Label>
                <div className="flex gap-2">
                  <Input value={newObjective} onChange={(e) => setNewObjective(e.target.value)} placeholder="Add objective" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addObjective())} />
                  <Button type="button" variant="outline" onClick={addObjective} size="icon"><Plus className="h-4 w-4" /></Button>
                </div>
                {form.objectives.map((obj, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded">
                    <span className="flex-1">{obj}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setForm((f) => ({ ...f, objectives: f.objectives.filter((_, j) => j !== i) }))}><X className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Content (Markdown — use ## for sections)</Label>
                <Textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} rows={10} placeholder="## Section 1&#10;Content here...&#10;&#10;## Section 2&#10;More content..." />
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.title || !form.dpdp_section || saveMutation.isPending} className="w-full">
                {saveMutation.isPending ? "Saving..." : editId ? "Update Module" : "Create Module"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Admin list with edit/delete */}
      {modules?.map((mod) => (
        <Card key={mod.id} className="border-border/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{mod.title}</p>
              <p className="text-xs text-muted-foreground">{mod.dpdp_section} · {mod.duration_minutes} min · v{mod.version}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => openEdit(mod)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(mod.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
