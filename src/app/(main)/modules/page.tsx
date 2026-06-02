'use client'

import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Calculator,
  Dumbbell,
  Moon,
  Cookie,
  BedDouble,
  ShoppingCart,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'

const modules = [
  {
    href: '/modules/calculator',
    icon: Calculator,
    title: 'Calorie & Macro Calculator',
    desc: 'Calculate your BMR, TDEE, and optimal macro split',
    gradient: 'from-indigo-500/20 to-indigo-900/10',
    accent: 'indigo',
    borderColor: 'border-indigo-500/30',
    iconBg: 'bg-indigo-500/10',
    iconColor: 'text-indigo-400',
    btnClass:
      'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border-indigo-500/20',
  },
  {
    href: '/modules/workout',
    icon: Dumbbell,
    title: '21-Day Workout Program',
    desc: 'Low-impact fat loss program, no jumping required',
    gradient: 'from-green-500/20 to-green-900/10',
    accent: 'green',
    borderColor: 'border-green-500/30',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
    btnClass:
      'bg-green-500/20 text-green-300 hover:bg-green-500/30 border-green-500/20',
  },
  {
    href: '/modules/night-hunger',
    icon: Moon,
    title: 'Night Hunger Protocol',
    desc: '14-day program to eliminate late-night cravings',
    gradient: 'from-purple-500/20 to-purple-900/10',
    accent: 'purple',
    borderColor: 'border-purple-500/30',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    btnClass:
      'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border-purple-500/20',
  },
  {
    href: '/modules/cravings',
    icon: Cookie,
    title: 'Cravings Management',
    desc: '7-day tactical craving control plan',
    gradient: 'from-orange-500/20 to-orange-900/10',
    accent: 'orange',
    borderColor: 'border-orange-500/30',
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-400',
    btnClass:
      'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border-orange-500/20',
  },
  {
    href: '/modules/sleep',
    icon: BedDouble,
    title: 'Sleep & Fat Loss',
    desc: 'Optimize your sleep for maximum fat loss',
    gradient: 'from-blue-500/20 to-blue-900/10',
    accent: 'blue',
    borderColor: 'border-blue-500/30',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    btnClass:
      'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border-blue-500/20',
  },
  {
    href: '/modules/grocery',
    icon: ShoppingCart,
    title: 'Grocery Budget Planner',
    desc: 'Budget-friendly high-protein shopping plans',
    gradient: 'from-emerald-500/20 to-emerald-900/10',
    accent: 'emerald',
    borderColor: 'border-emerald-500/30',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    btnClass:
      'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border-emerald-500/20',
  },
  {
    href: '/modules/plateau',
    icon: TrendingUp,
    title: 'Plateau Breakthrough',
    desc: 'Analyze stalls and break through plateaus',
    gradient: 'from-red-500/20 to-red-900/10',
    accent: 'red',
    borderColor: 'border-red-500/30',
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-400',
    btnClass:
      'bg-red-500/20 text-red-300 hover:bg-red-500/30 border-red-500/20',
  },
]

export default function ModulesPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Modules
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Choose a module to get personalized plans and recommendations.
        </p>
      </div>

      {/* Responsive grid: 1 col mobile, 2 tablet, 3 desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((m) => {
          const Icon = m.icon
          return (
            <Link key={m.href} href={m.href} className="group block">
              <Card
                className={`relative bg-gradient-to-br ${m.gradient} to-[#1a1d27] ${m.borderColor} hover:scale-[1.02] transition-all duration-200 cursor-pointer h-full overflow-hidden`}
              >
                {/* Subtle gradient accent glow at top */}
                <div
                  className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-${m.accent}-400/40 to-transparent`}
                />

                <CardHeader>
                  <div
                    className={`w-10 h-10 rounded-lg ${m.iconBg} flex items-center justify-center mb-3`}
                  >
                    <Icon className={`w-5 h-5 ${m.iconColor}`} />
                  </div>
                  <CardTitle className="text-white text-base leading-snug">
                    {m.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex flex-col gap-4">
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {m.desc}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-full justify-center gap-2 border text-xs font-medium transition-colors ${m.btnClass}`}
                  >
                    Start
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
