import { BrandMark } from "@/components/BrandMark";
import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getCustomerZeroState } from "@/lib/customer-zero.functions";
import {
  LayoutDashboard,
  Package,
  Video,
  Wand2,
  BadgeDollarSign,
  LogOut,
  Sparkles,
  Users,
  CreditCard,
  Send,
  Plug,
  Route as RouteIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/campaigns", label: "Campaigns", icon: RouteIcon },
  { to: "/products", label: "Products", icon: Package },
  { to: "/personas", label: "Personas", icon: Users },
  { to: "/studio", label: "Studio", icon: Wand2 },
  { to: "/videos", label: "Videos", icon: Video },
  { to: "/publishing", label: "Publishing", icon: Send },
  { to: "/affiliate-programs", label: "Affiliate IDs", icon: BadgeDollarSign },
  { to: "/settings/integrations", label: "Integrations", icon: Plug },
  { to: "/billing", label: "Billing", icon: CreditCard },
] as const;



function AuthLayout() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const gateFn = useServerFn(getCustomerZeroState);
  const gate = useQuery({
    queryKey: ["customer-zero"],
    queryFn: () => gateFn({}),
    enabled: Boolean(session),
    staleTime: 5 * 60 * 1000,
  });



  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === null) navigate({ to: "/auth" });
  }, [session, navigate]);

  if (session === undefined) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (session === null) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
          <Link to="/dashboard" className="mb-8 flex items-center gap-2 px-2">
            <BrandMark className="h-8 w-8 rounded-lg" />

            <span className="font-display text-lg font-semibold">Influencer Echo</span>
          </Link>
          <nav className="space-y-1">
            {NAV.map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    active
                      ? "bg-primary text-primary-foreground shadow-pop"
                      : "text-foreground/70 hover:bg-card hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto space-y-2 border-t border-border pt-4 text-xs">
            <p className="truncate px-2 text-muted-foreground">{session.user.email}</p>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-foreground/70 hover:bg-card hover:text-foreground"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
