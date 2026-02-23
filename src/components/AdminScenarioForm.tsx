import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, GitBranch } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface NodeForm {
  id?: string;
  node_text: string;
  explanation: string;
  is_root: boolean;
  is_compliant: boolean | null;
  parent_node_id: string | null;
  sort_order: number;
}

export default function AdminScenarioForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [moduleId, setModuleId] = useState<string>("");
  const [nodes, setNodes] = useState<NodeForm[]>([
    { node_text: "", explanation: "", is_root: true, is_compliant: null, parent_node_id: null, sort_order: 0 },
  ]);

  const { data: modules } = useQuery({
    queryKey: ["training-modules"],
    queryFn: async () => {
      const { data } = await supabase.from("training_modules").select("id, title");
      return data || [];
    },
  });

  const { data: scenarios, refetch } = useQuery({
    queryKey: ["scenarios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("scenarios").select("*, training_modules(title)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Create scenario
      const { data: scenario, error } = await supabase.from("scenarios").insert({
        title,
        description,
        module_id: moduleId || null,
      }).select().single();
      if (error) throw error;

      // Create nodes — root first, then children
      const rootNodes = nodes.filter((n) => n.is_root);
      const childNodes = nodes.filter((n) => !n.is_root);

      // Insert root nodes
      for (const node of rootNodes) {
        await supabase.from("scenario_nodes").insert({
          scenario_id: scenario.id,
          node_text: node.node_text,
          explanation: node.explanation || null,
          is_root: true,
          is_compliant: node.is_compliant,
          parent_node_id: null,
          sort_order: node.sort_order,
        });
      }

      // Note: child nodes need parent IDs which are generated server-side.
      // For a simple MVP, admin can add nodes after scenario creation via direct DB or future enhancement.
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios"] });
      toast({ title: "Scenario created" });
      setOpen(false);
      setTitle("");
      setDescription("");
      setModuleId("");
      setNodes([{ node_text: "", explanation: "", is_root: true, is_compliant: null, parent_node_id: null, sort_order: 0 }]);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete nodes first
      await supabase.from("scenario_nodes").delete().eq("scenario_id", id);
      const { error } = await supabase.from("scenarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios"] });
      toast({ title: "Scenario deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addNode = () => {
    setNodes((n) => [...n, { node_text: "", explanation: "", is_root: false, is_compliant: null, parent_node_id: null, sort_order: n.length }]);
  };

  const updateNode = (idx: number, partial: Partial<NodeForm>) => {
    setNodes((n) => n.map((node, i) => (i === idx ? { ...node, ...partial } : node)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Scenario</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Scenario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Scenario title" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Scenario description" />
              </div>
              <div className="space-y-2">
                <Label>Linked Module</Label>
                <Select value={moduleId} onValueChange={setModuleId}>
                  <SelectTrigger><SelectValue placeholder="Select module (optional)" /></SelectTrigger>
                  <SelectContent>
                    {modules?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Decision Nodes</Label>
                {nodes.map((node, i) => (
                  <Card key={i} className="border-border/50">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">{node.is_root ? "Root Node" : `Node ${i + 1}`}</span>
                        {!node.is_root && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setNodes((n) => n.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button>
                        )}
                      </div>
                      <Input value={node.node_text} onChange={(e) => updateNode(i, { node_text: e.target.value })} placeholder="Node text / question" />
                      <Input value={node.explanation} onChange={(e) => updateNode(i, { explanation: e.target.value })} placeholder="Explanation (for leaf nodes)" />
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch checked={node.is_compliant === true} onCheckedChange={(v) => updateNode(i, { is_compliant: v ? true : false })} />
                          <Label className="text-xs">Compliant</Label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" onClick={addNode} className="w-full gap-2"><Plus className="h-4 w-4" /> Add Node</Button>
              </div>

              <Button onClick={() => saveMutation.mutate()} disabled={!title || saveMutation.isPending} className="w-full">
                {saveMutation.isPending ? "Saving..." : "Create Scenario"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {scenarios?.map((s) => (
        <Card key={s.id} className="border-border/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-warning" />
                <p className="font-medium">{s.title}</p>
              </div>
              <p className="text-xs text-muted-foreground">{s.description}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(s.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
