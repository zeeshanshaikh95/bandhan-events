import { Suspense, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Users,
  X,
} from "lucide-react";
import { ROLE_LABELS, type Permission } from "@bandhan/shared";
import { useAuth } from "@/providers/AuthProvider";
import Logo from "@/components/ui/Logo";
import RouteFallback from "@/components/ui/RouteFallback";
import { cn } from "@/utils/cn";

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
  end?: boolean;
}

/**
 * Only modules that actually exist are listed. A menu of dead links would be
 * worse than a shorter menu.
 */
const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard, permission: "dashboard:read", end: true },
  { label: "Leads", to: "/admin/leads", icon: ClipboardList, permission: "leads:read" },
  { label: "Settings", to: "/admin/settings", icon: Settings, permission: "settings:read" },
  { label: "Users", to: "/admin/users", icon: Users, permission: "users:manage" },
  { label: "Audit Logs", to: "/admin/audit", icon: ScrollText, permission: "audit:read" },
];

export default function AdminLayout() {
  const { user, can, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const items = NAV_ITEMS.filter((item) => can(item.permission));

  // A route change should always leave the mobile drawer closed.
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  // Escape closes the drawer, matching the public site's menu behaviour.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const handleSignOut = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-forest text-ivory">
      <div className="border-b border-ivory/10 px-6 py-6">
        <Logo variant="light" className="h-12 w-auto" />
        <p className="mt-3 font-sans text-[10px] font-semibold uppercase tracking-label text-gold-soft">
          Business Dashboard
        </p>
      </div>

      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-5">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-ivory/10 text-ivory"
                        : "text-ivory/70 hover:bg-ivory/5 hover:text-ivory"
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0 text-gold-soft" aria-hidden="true" />
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-ivory/10 px-6 py-5">
        {user && (
          <>
            <p className="truncate text-sm text-ivory">{user.name}</p>
            <p className="mt-0.5 truncate text-[11px] text-ivory/55">{user.email}</p>
            <p className="mt-2 inline-block border border-ivory/20 px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-widest2 text-gold-soft">
              {ROLE_LABELS[user.role]}
            </p>
          </>
        )}
        <div className="mt-4 space-y-2">
          <Link
            to="/"
            className="flex items-center gap-2 text-[11px] uppercase tracking-widest2 text-ivory/60 transition hover:text-ivory"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> View website
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 text-[11px] uppercase tracking-widest2 text-ivory/60 transition hover:text-ivory"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream/40">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-forest-dark/60"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="absolute inset-y-0 left-0 w-[17rem] max-w-[85%] shadow-card"
          >
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-4 z-10 p-2 text-ivory/70 transition hover:text-ivory"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-forest/10 bg-ivory/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              aria-expanded={drawerOpen}
              className="p-2 text-forest lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <p className="hidden text-[11px] uppercase tracking-widest2 text-charcoal-muted lg:block">
              Bandhan Events · Internal
            </p>
            <div className="flex items-center gap-3">
              {user && (
                <span className="hidden text-xs text-charcoal-muted sm:inline">
                  {user.name} · {ROLE_LABELS[user.role]}
                </span>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="btn-outline !px-4 !py-2 !text-[10px]"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
