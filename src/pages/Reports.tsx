import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useState, useMemo } from "react";

const COLORS = [
  "hsl(174, 60%, 40%)",
  "hsl(220, 60%, 50%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(160, 60%, 40%)",
];

export default function Reports() {
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  const { data: attempts } = useQuery({
    queryKey: ["all-attempts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("attempts").select("*, assessments(title, module_id, training_modules(title))");
      if (error) throw error;
      return data;
    },
  });

  const { data: certs } = useQuery({
    queryKey: ["all-certs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("certificates").select("*, training_modules(title)");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, department");
      if (error) throw error;
      return data;
    },
  });

  const { data: userRoles } = useQuery({
    queryKey: ["all-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data;
    },
  });

  const { data: progressData } = useQuery({
    queryKey: ["all-progress"],
    queryFn: async () => {
      const { data, error } = await supabase.from("module_progress").select("*, training_modules(title)");
      if (error) throw error;
      return data;
    },
  });

  // Build filtered user set
  const filteredUserIds = useMemo(() => {
    if (!profiles) return new Set<string>();
    let users = profiles;
    if (deptFilter !== "all") {
      users = users.filter((p) => p.department === deptFilter);
    }
    let userIds = new Set(users.map((p) => p.user_id));
    if (roleFilter !== "all" && userRoles) {
      const roleUserIds = new Set(userRoles.filter((r) => r.role === roleFilter).map((r) => r.user_id));
      userIds = new Set([...userIds].filter((id) => roleUserIds.has(id)));
    }
    return userIds;
  }, [profiles, userRoles, roleFilter, deptFilter]);

  const isFiltering = roleFilter !== "all" || deptFilter !== "all";

  const filteredAttempts = useMemo(() => {
    if (!attempts) return [];
    return isFiltering ? attempts.filter((a) => filteredUserIds.has(a.user_id)) : attempts;
  }, [attempts, filteredUserIds, isFiltering]);

  const filteredCerts = useMemo(() => {
    if (!certs) return [];
    return isFiltering ? certs.filter((c) => filteredUserIds.has(c.user_id)) : certs;
  }, [certs, filteredUserIds, isFiltering]);

  const filteredProgress = useMemo(() => {
    if (!progressData) return [];
    return isFiltering ? progressData.filter((p) => filteredUserIds.has(p.user_id)) : progressData;
  }, [progressData, filteredUserIds, isFiltering]);

  const totalAttempts = filteredAttempts.length;
  const passed = filteredAttempts.filter((a) => a.passed).length;
  const failed = totalAttempts - passed;

  const pieData = [
    { name: "Passed", value: passed },
    { name: "Failed", value: failed },
  ];

  const certsByModule: Record<string, number> = {};
  filteredCerts.forEach((c) => {
    const title = (c.training_modules as any)?.title || "Unknown";
    certsByModule[title] = (certsByModule[title] || 0) + 1;
  });
  const barData = Object.entries(certsByModule).map(([name, count]) => ({
    name: name.length > 20 ? name.substring(0, 20) + "…" : name,
    certifications: count,
  }));

  const scoresByModule: Record<string, { total: number; count: number }> = {};
  filteredAttempts.forEach((a) => {
    const modTitle = ((a.assessments as any)?.training_modules as any)?.title || "Unknown";
    if (!scoresByModule[modTitle]) scoresByModule[modTitle] = { total: 0, count: 0 };
    const pct = a.total_questions > 0 ? Math.round((a.score / a.total_questions) * 100) : 0;
    scoresByModule[modTitle].total += pct;
    scoresByModule[modTitle].count += 1;
  });
  const avgScoreData = Object.entries(scoresByModule).map(([name, v]) => ({
    name: name.length > 20 ? name.substring(0, 20) + "…" : name,
    avgScore: Math.round(v.total / v.count),
  }));

  const completedCount = filteredProgress.filter((p) => p.status === "completed").length;
  const inProgressCount = filteredProgress.filter((p) => p.status === "in_progress").length;
  const completionPie = [
    { name: "Completed", value: completedCount },
    { name: "In Progress", value: inProgressCount },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Compliance Reports</h1>
          <p className="text-muted-foreground">
            Organization-wide compliance metrics
            {isFiltering && <span className="text-accent ml-1">• Filtered ({filteredUserIds.size} users)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="compliance_officer">CO</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
            </SelectContent>
          </Select>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Depts</SelectItem>
              <SelectItem value="hr">HR</SelectItem>
              <SelectItem value="it">IT</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="operations">Operations</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Attempts</CardTitle></CardHeader>
          <CardContent><span className="text-3xl font-display font-bold">{totalAttempts}</span></CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pass Rate</CardTitle></CardHeader>
          <CardContent><span className="text-3xl font-display font-bold text-success">{totalAttempts ? Math.round((passed / totalAttempts) * 100) : 0}%</span></CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Certifications</CardTitle></CardHeader>
          <CardContent><span className="text-3xl font-display font-bold text-accent">{filteredCerts.length}</span></CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Modules Completed</CardTitle></CardHeader>
          <CardContent><span className="text-3xl font-display font-bold text-info">{completedCount}</span></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader><CardTitle>Pass/Fail Distribution</CardTitle></CardHeader>
          <CardContent className="h-64">
            {totalAttempts > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">No data yet</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader><CardTitle>Certifications by Module</CardTitle></CardHeader>
          <CardContent className="h-64">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="certifications" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">No data yet</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader><CardTitle>Average Score by Module</CardTitle></CardHeader>
          <CardContent className="h-64">
            {avgScoreData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={avgScoreData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="avgScore" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">No data yet</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader><CardTitle>Training Completion Status</CardTitle></CardHeader>
          <CardContent className="h-64">
            {completedCount + inProgressCount > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={completionPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {completionPie.map((_, i) => <Cell key={i} fill={COLORS[i === 0 ? 0 : 2]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
