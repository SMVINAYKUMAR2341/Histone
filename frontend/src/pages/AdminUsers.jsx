import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const ROLES = ["provider", "admin", "nurse", "genetic_counselor"];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);

  const load = () => api.get("/admin/users").then((r) => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const setRole = async (user_id, role) => {
    try {
      await api.patch(`/admin/users/${user_id}`, { role });
      toast.success("Role updated");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    }
  };

  return (
    <div>
      <div className="label-eyebrow mb-3">Admin · users</div>
      <h1 className="font-heading font-bold text-4xl tracking-tight text-slate-900">Users & roles</h1>
      <p className="mt-2 text-sm text-slate-600">Assign roles for team members who signed in with Google.</p>

      <div className="mt-8 space-y-3">
        {users.map((u) => (
          <Card key={u.user_id} className="border-slate-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="font-heading font-semibold text-slate-900">{u.name || u.email}</div>
                <div className="text-xs text-slate-500">{u.email}</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="uppercase text-[10px] tracking-wider">{u.role}</Badge>
                <Select value={u.role} onValueChange={(r) => setRole(u.user_id, r)}>
                  <SelectTrigger data-testid={`role-select-${u.email}`} className="w-[180px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
