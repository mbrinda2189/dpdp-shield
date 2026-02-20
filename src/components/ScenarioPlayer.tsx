import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, XCircle, GitBranch } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface Props {
  scenarioId: string;
  onBack: () => void;
}

export default function ScenarioPlayer({ scenarioId, onBack }: Props) {
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const { data: nodes, isLoading } = useQuery({
    queryKey: ["scenario-nodes", scenarioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scenario_nodes")
        .select("*")
        .eq("scenario_id", scenarioId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const rootNode = nodes?.find((n) => n.is_root);
  const activeNode = nodes?.find((n) => n.id === (currentNodeId || rootNode?.id));
  const children = nodes?.filter((n) => n.parent_node_id === activeNode?.id) || [];
  const isLeaf = children.length === 0 && activeNode;

  const handleChoice = (nodeId: string) => {
    setHistory((h) => [...h, activeNode?.id || ""]);
    setCurrentNodeId(nodeId);
  };

  const handleRestart = () => {
    setCurrentNodeId(null);
    setHistory([]);
  };

  if (isLoading) {
    return <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full mx-auto mt-20" />;
  }

  if (!nodes || nodes.length === 0) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Scenarios
        </Button>
        <Card className="border-border/50">
          <CardContent className="p-12 text-center text-muted-foreground">
            <p>No decision tree configured for this scenario yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to Scenarios
      </Button>

      <Card className="border-border/50 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-warning" />
            <CardTitle className="text-lg">Scenario Simulation</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">Step {history.length + 1}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current node text */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-base leading-relaxed">{activeNode?.node_text}</p>
          </div>

          {/* Leaf / outcome */}
          {isLeaf && activeNode && (
            <div className={`p-4 rounded-lg border ${activeNode.is_compliant ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"}`}>
              <div className="flex items-center gap-2 mb-2">
                {activeNode.is_compliant ? (
                  <><CheckCircle2 className="h-5 w-5 text-success" /><Badge className="bg-success text-success-foreground">Compliant</Badge></>
                ) : (
                  <><XCircle className="h-5 w-5 text-destructive" /><Badge variant="destructive">Violation</Badge></>
                )}
              </div>
              {activeNode.explanation && (
                <p className="text-sm text-muted-foreground">{activeNode.explanation}</p>
              )}
              <Button onClick={handleRestart} className="mt-4" variant="outline">
                Restart Scenario
              </Button>
            </div>
          )}

          {/* Choices */}
          {!isLeaf && children.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Choose your action:</p>
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => handleChoice(child.id)}
                  className="w-full text-left p-4 rounded-lg border border-border/50 hover:border-accent/50 hover:bg-accent/5 transition-colors"
                >
                  {child.node_text}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
