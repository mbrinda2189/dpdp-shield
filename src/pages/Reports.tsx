import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = [
  "hsl(174, 60%, 40%)",
  "hsl(220, 60%, 50%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
];

export default function Reports() {
  const { data: attempts } = useQuery({
    queryKey: ["all-attempts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("attempts").select("*");
      if (error) throw error;
      return data;
    },
  });

  const totalAttempts = attempts?.length || 0;
  const passed = attempts?.filter((a) => a.passed).length || 0;
  const failed = totalAttempts - passed;

  const pieData = [
    { name: "Passed", value: passed },
    { name: "Failed", value: failed },
  ];

  const { data: certs } = useQuery({
    queryKey: ["all-certs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("certificates").select("*, training_modules(title)");
      if (error) throw error;
      return data;
    },
  });

  // Certs by module
  const certsByModule: Record<string, number> = {};
  certs?.forEach((c) => {
    const title = (c.training_modules as any)?.title || "Unknown";
    certsByModule[title] = (certsByModule[title] || 0) + 1;
  });
  const barData = Object.entries(certsByModule).map(([name, count]) => ({ name, certifications: count }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Compliance Reports</h1>
        <p className="text-muted-foreground">Organization-wide compliance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Attempts</CardTitle></CardHeader>
          <CardContent><span className="text-3xl font-display font-bold">{totalAttempts}</span></CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pass Rate</CardTitle></CardHeader>
          <CardContent><span className="text-3xl font-display font-bold text-success">{totalAttempts ? Math.round((passed / totalAttempts) * 100) : 0}%</span></CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Certifications Issued</CardTitle></CardHeader>
          <CardContent><span className="text-3xl font-display font-bold text-accent">{certs?.length || 0}</span></CardContent>
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
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
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
      </div>
    </div>
  );
}
