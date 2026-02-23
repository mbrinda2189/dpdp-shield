import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ShieldCheck, UserCog, Briefcase } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin", icon: ShieldCheck },
  { value: "compliance_officer", label: "Compliance Officer", icon: UserCog },
  { value: "employee", label: "Employee", icon: Briefcase },
] as const;

const DEPARTMENTS = Constants.public.Enums.department;

export default function UsersAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allRoles } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: allProgress } = useQuery({
    queryKey: ["admin-all-progress"],
    queryFn: async () => {
      const { data } = await supabase.from("module_progress").select("user_id, status");
      return data || [];
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      // Delete existing role
      const { error: delError } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delError) throw delError;
      // Insert new role
      const { error: insError } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
      if (insError) throw insError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-roles"] });
      toast({ title: "Role updated", description: "User role has been changed successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const getRoles = (userId: string) =>
    allRoles?.filter((r) => r.user_id === userId).map((r) => r.role) || [];

  const getUserProgress = (userId: string) => {
    const userProg = allProgress?.filter((p) => p.user_id === userId) || [];
    const completed = userProg.filter((p) => p.status === "completed").length;
    return { completed, total: userProg.length };
  };

  const changeDept = useMutation({
    mutationFn: async ({ profileId, dept }: { profileId: string; dept: string }) => {
      const { error } = await supabase.from("profiles").update({ department: dept as any }).eq("id", profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
      toast({ title: "Department updated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const roleCounts = {
    admin: allRoles?.filter((r) => r.role === "admin").length || 0,
    compliance_officer: allRoles?.filter((r) => r.role === "compliance_officer").length || 0,
    employee: allRoles?.filter((r) => r.role === "employee").length || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage users and role assignments</p>
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {ROLE_OPTIONS.map((r) => (
          <Card key={r.value} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10 text-accent">
                <r.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{roleCounts[r.value]}</p>
                <p className="text-xs text-muted-foreground">{r.label}s</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> All Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Training Progress</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles?.map((p) => {
                  const userRoles = getRoles(p.user_id);
                  const currentRole = userRoles[0] || "employee";
                  const prog = getUserProgress(p.user_id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                      <TableCell>
                        <Select
                          value={p.department || ""}
                          onValueChange={(val) => changeDept.mutate({ profileId: p.id, dept: val })}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue placeholder="Assign" />
                          </SelectTrigger>
                          <SelectContent>
                            {DEPARTMENTS.map((d) => (
                              <SelectItem key={d} value={d} className="text-xs capitalize">
                                {d}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={currentRole}
                          onValueChange={(val) => changeRole.mutate({ userId: p.user_id, newRole: val })}
                        >
                          <SelectTrigger className="w-[160px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((r) => (
                              <SelectItem key={r.value} value={r.value} className="text-xs capitalize">
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{prog.completed}/{prog.total} modules</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
