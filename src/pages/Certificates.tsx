import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function Certificates() {
  const { user } = useAuth();

  const { data: certs, isLoading } = useQuery({
    queryKey: ["certificates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("*, training_modules(title)")
        .eq("user_id", user!.id)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Certificates</h1>
        <p className="text-muted-foreground">Your DPDP compliance certifications</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6 h-24" /></Card>
          ))}
        </div>
      ) : certs && certs.length > 0 ? (
        <div className="space-y-4">
          {certs.map((cert) => {
            const isValid = new Date(cert.valid_until) > new Date();
            return (
              <Card key={cert.id} className="border-border/50">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${isValid ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                    <Award className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{(cert.training_modules as any)?.title || "Training Module"}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> Issued: {format(new Date(cert.issued_at), "MMM d, yyyy")}
                      </span>
                      <span>Valid until: {format(new Date(cert.valid_until), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  <Badge className={isValid ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                    {isValid ? "Valid" : "Expired"}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No certificates yet</p>
            <p className="text-sm">Complete assessments to earn certifications.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
