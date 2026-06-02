'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSupabase } from '@/components/providers/supabase-provider';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Grid3X3,
  MessageCircle,
  UtensilsCrossed,
  CheckSquare,
  Ruler,
  Settings,
  Flame,
  Menu,
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

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = useSupabase();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userInitials, setUserInitials] = useState('U');
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

      if (user.email) {
        setUserEmail(user.email);
        setUserInitials(user.email.substring(0, 2).toUpperCase());
      }

      setLoading(false);
    }
    loadUser();
  }, [supabase.auth, router]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  }, [supabase.auth, router]);

  const isActive = (href: string) => pathname === href;
  const pageTitle = getPageTitle(pathname);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0c0e14]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span className="text-sm text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0c0e14]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
          <Flame className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-lg font-bold text-transparent">
            NutriCoach AI
          </span>
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
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-gradient-to-r from-indigo-500/20 to-indigo-500/5 text-indigo-400 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.15)]'
                  : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 transition-colors ${
                  active ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'
                }`}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0 border border-white/[0.08]">
            <AvatarFallback className="bg-indigo-500/20 text-xs text-indigo-300">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span className="truncate text-xs text-gray-400">{userEmail}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-gray-500 hover:text-gray-300"
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
              className="h-7 w-7 text-gray-500 hover:text-gray-300"
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
    <div className="flex h-screen overflow-hidden bg-[#0c0e14]">
      {/* Desktop sidebar */}
      <aside
        className={`relative hidden lg:flex lg:flex-col lg:shrink-0 transition-all duration-300 ${
          collapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        {sidebarContent}

        {/* Collapse toggle - desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-[4.75rem] -right-3 z-10 hidden lg:flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.08] bg-[#0c0e14] text-gray-500 hover:text-gray-300 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Subtle gradient accent at top of sidebar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-indigo-500/[0.04] to-transparent" />
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Desktop header */}
        <header className="hidden lg:flex h-14 items-center justify-between border-b border-white/[0.06] px-6">
          <h1 className="text-base font-semibold text-gray-200">{pageTitle}</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{userEmail}</span>
            <Avatar className="h-8 w-8 border border-white/[0.08]">
              <AvatarFallback className="bg-indigo-500/20 text-xs text-indigo-300">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-gray-300"
              onClick={handleSignOut}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b border-white/[0.06] px-4 lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="text-gray-400" />
              }
            >
              <PanelLeft className="h-5 w-5" />
            </SheetTrigger>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600">
              <Flame className="h-4 w-4 text-white" />
            </div>
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-sm font-bold text-transparent">
              NutriCoach AI
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-4 lg:p-8">{children}</div>
        </main>
      </div>

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 border-white/[0.06] bg-[#0c0e14] p-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </div>
  );
}
