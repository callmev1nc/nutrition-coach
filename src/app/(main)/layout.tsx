'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSupabase } from '@/components/providers/supabase-provider';
import { useTheme } from '@/components/providers/theme-provider';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { xpProgress } from '@/lib/gamification';
import type { UserProfile } from '@/types';
import {
  LayoutDashboard,
  Grid3X3,
  MessageCircle,
  UtensilsCrossed,
  CheckSquare,
  Ruler,
  Settings,
  Zap,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Modules', href: '/modules', icon: Grid3X3 },
  { label: 'AI Coach', href: '/coach', icon: MessageCircle },
  { label: 'Meal Planner', href: '/meals', icon: UtensilsCrossed },
  { label: 'Habit Tracker', href: '/habits', icon: CheckSquare },
  { label: 'Body Fat', href: '/body-fat', icon: Ruler },
  { label: 'Settings', href: '/settings', icon: Settings },
];

function getPageTitle(pathname: string): string {
  const item = navItems.find((item) => item.href === pathname);
  return item?.label ?? 'Dashboard';
}

function BrandMark() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[var(--brand)] brand-glow">
      <Zap className="h-5 w-5 text-white" fill="currentColor" />
    </div>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = useSupabase();
  const { applyTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      if (user.email) setUserEmail(user.email);

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) {
        setProfile(data as UserProfile);
        const p = data as UserProfile;
        if (p.theme) applyTheme(p.theme);
      }

      setLoading(false);
    }
    loadUser();
  }, [supabase.auth, router, applyTheme]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  }, [supabase.auth, router]);

  const isActive = (href: string) => pathname === href;
  const pageTitle = getPageTitle(pathname);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  const avatar = profile?.avatar_emoji ?? '⚡';
  const level = profile?.level ?? 1;
  const xp = profile?.xp_total ?? 0;
  const progress = xpProgress(xp);
  const userInitials = userEmail.substring(0, 2).toUpperCase();

  const sidebarContent = (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <BrandMark />
        {!collapsed && (
          <span className="font-display text-lg font-bold text-gradient">NutriCoach</span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`press group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-primary text-primary-foreground brand-glow'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 transition-colors ${
                  active ? 'text-primary-foreground' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground'
                }`}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section with level + XP */}
      <div className="border-t border-sidebar-border p-3">
        {!collapsed && (
          <div className="mb-2 rounded-xl bg-sidebar-accent p-2.5">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-sidebar-foreground">
                <span>{avatar}</span> Level {level}
              </span>
              <span className="text-sidebar-foreground/60">{progress.pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-sidebar-border">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-[var(--brand)] transition-all duration-500"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0 border border-sidebar-border">
            <AvatarFallback className="bg-primary/10 text-xs">
              {collapsed ? <span>{avatar}</span> : userInitials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span className="truncate text-xs text-sidebar-foreground/70">{userEmail}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground"
                onClick={handleSignOut}
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
          {collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground"
              onClick={handleSignOut}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside
        className={`relative hidden lg:flex lg:flex-col lg:shrink-0 transition-all duration-300 ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        {sidebarContent}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="press absolute top-[4.75rem] -right-3 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-sidebar text-sidebar-foreground/60 hover:text-sidebar-foreground lg:flex"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        {/* Brand accent at top */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/[0.06] to-transparent" />
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Desktop header */}
        <header className="hidden h-14 items-center justify-between border-b border-border px-6 lg:flex">
          <h1 className="font-display text-base font-semibold text-foreground">{pageTitle}</h1>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {avatar} Lv {level}
            </span>
            <Avatar className="h-8 w-8 border border-border">
              <AvatarFallback className="bg-primary/10 text-xs text-primary">{userInitials}</AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleSignOut}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b border-border px-4 lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="text-sidebar-foreground/60" />}>
              <PanelLeft className="h-5 w-5" />
            </SheetTrigger>
          </Sheet>
          <div className="flex items-center gap-2">
            <BrandMark />
            <span className="font-display text-sm font-bold text-gradient">NutriCoach</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-4 lg:p-8">{children}</div>
        </main>
      </div>

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 border-sidebar-border bg-sidebar p-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </div>
  );
}
