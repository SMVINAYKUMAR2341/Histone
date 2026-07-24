import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, LayoutGrid, Users, ClipboardList, ShieldCheck, BarChart3, UserCog, Send } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import UnvalidatedBanner from "@/components/UnvalidatedBanner";
import BrandMark from "@/components/BrandMark";

const NAV_ITEMS = [
  { to: "/dashboard", label: "New assessment", icon: LayoutGrid, roles: ["provider", "admin", "nurse", "genetic_counselor"] },
  { to: "/referrals", label: "Referrals", icon: Send, roles: ["provider", "admin", "genetic_counselor"] },
  { to: "/patients", label: "Patients", icon: Users, roles: ["provider", "admin", "nurse", "genetic_counselor"] },
  { to: "/assessments", label: "History", icon: ClipboardList, roles: ["provider", "admin", "genetic_counselor"] },
  { to: "/admin/criteria", label: "Criteria", icon: ShieldCheck, roles: ["admin"] },
  { to: "/admin/users", label: "Users", icon: UserCog, roles: ["admin"] },
  { to: "/admin/metrics", label: "Metrics", icon: BarChart3, roles: ["admin"] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const items = NAV_ITEMS.filter((i) => i.roles.includes(user?.role));

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--background))]">
      <UnvalidatedBanner />
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center gap-8">
          <button
            data-testid="brand-home-btn"
            onClick={() => nav("/dashboard")}
            className="flex items-center gap-2.5"
          >
            <BrandMark size={36} />
            <div className="text-left leading-tight">
              <div className="font-heading font-bold text-[16px] text-brand tracking-tight">HistoNe</div>
              <div className="text-[10px] tracking-[0.18em] uppercase text-slate-500">Genetics DSS</div>
            </div>
          </button>
          <nav className="flex items-center gap-1 flex-1">
            {items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                data-testid={`nav-${it.to.replace(/\//g, "-").replace(/^-/, "")}`}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors duration-150 ${
                    isActive
                      ? "bg-brand text-white"
                      : "text-slate-700 hover:bg-blush hover:text-brand"
                  }`
                }
              >
                <it.icon className="w-4 h-4" />
                {it.label}
              </NavLink>
            ))}
          </nav>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button data-testid="user-menu-trigger" className="flex items-center gap-2 rounded-md hover:bg-blush px-2 py-1">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.picture} />
                  <AvatarFallback className="text-xs bg-brand text-white">
                    {(user?.name || "?").split(" ").map(w => w[0]).slice(0, 2).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left leading-tight hidden md:block">
                  <div className="text-sm font-medium text-slate-900">{user?.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">{user?.role}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="text-sm">{user?.email}</div>
                <Badge variant="outline" className="mt-1 uppercase tracking-wider text-[10px]">{user?.role}</Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid="logout-item" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="flex-1 w-full">
        <div className="max-w-[1400px] mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 py-4 text-xs text-slate-500 flex justify-between">
          <span>Decision support only — clinical judgement required.</span>
          <span className="font-mono">HistoNe v1.0 · placeholder criteria</span>
        </div>
      </footer>
      <Toaster position="top-right" richColors />
    </div>
  );
}
