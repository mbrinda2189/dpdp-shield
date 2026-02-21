import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Calendar, Shield, Hash, Clock } from "lucide-react";
import { format } from "date-fns";

export default function Certificates() {
  const { user } = useAuth();

  const { data: certs, isLoading } = useQuery({
    queryKey: ["certificates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("*, training_modules(title, dpdp_section)")
        .eq("user_id", user!.id)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user!.id)
        .single();
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
            const daysLeft = Math.ceil((new Date(cert.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const mod = cert.training_modules as any;
            return (
              <Card key={cert.id} className={`border-2 ${isValid ? "border-success/20" : "border-destructive/20"}`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${isValid ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      <Award className="h-8 w-8" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-display font-semibold text-lg">{mod?.title || "Training Module"}</h3>
                          <p className="text-sm text-muted-foreground">DPDP Act 2023 — {mod?.dpdp_section || "Compliance"}</p>
                        </div>
                        <Badge className={`${isValid ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}>
                          {isValid ? "Valid" : "Expired"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Shield className="h-3 w-3" />
                        <span>Awarded to: {profile?.full_name || user?.email}</span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Hash className="h-3.5 w-3.5" />
                          <span className="text-xs font-mono">{cert.certificate_number.substring(0, 8)}…</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span className="text-xs">Issued: {format(new Date(cert.issued_at), "MMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs">Expires: {format(new Date(cert.valid_until), "MMM d, yyyy")}</span>
                        </div>
                        <div>
                          {isValid && daysLeft < 60 && (
                            <Badge variant="outline" className="text-xs text-warning border-warning/50">
                              Re-certify in {daysLeft}d
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
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
