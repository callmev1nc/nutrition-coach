import Link from 'next/link';
import {
  Calculator,
  Dumbbell,
  MessageCircle,
  UtensilsCrossed,
  Moon,
  TrendingUp,
  ClipboardList,
  Sparkles,
  BarChart3,
} from 'lucide-react';

const features = [
  {
    icon: Calculator,
    title: 'Smart Calorie Calculator',
    description:
      'AI-powered TDEE and macro calculations using Mifflin-St Jeor and Katch-McArdle equations, personalized to your body.',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    icon: Dumbbell,
    title: '21-Day Workout',
    description:
      'Low-impact workout programs designed for your fitness level. No gym required -- just a chair and a mat.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: MessageCircle,
    title: 'AI Coach Chat',
    description:
      'Your personal nutrition coach available 24/7. Get evidence-based advice, encouragement, and accountability.',
    gradient: 'from-emerald-500 to-green-600',
  },
  {
    icon: UtensilsCrossed,
    title: 'Meal Planning',
    description:
      'Auto-generated meal plans that fit your macros and budget. Complete with grocery lists and recipes.',
    gradient: 'from-orange-500 to-amber-500',
  },
  {
    icon: Moon,
    title: 'Sleep Optimization',
    description:
      'Personalized sleep schedules and wind-down routines to optimize recovery and fat loss hormones.',
    gradient: 'from-indigo-500 to-blue-600',
  },
  {
    icon: TrendingUp,
    title: 'Progress Tracking',
    description:
      'Log weight, body fat, and habits. Visualize trends and get AI predictions on your timeline to goal.',
    gradient: 'from-pink-500 to-rose-600',
  },
];

const steps = [
  {
    number: '01',
    icon: ClipboardList,
    title: 'Enter your details',
    description:
      'Share your age, weight, height, activity level, and goals. Our AI handles the rest.',
  },
  {
    number: '02',
    icon: Sparkles,
    title: 'Get personalized plan',
    description:
      'Receive a tailored calorie target, macro split, meal plan, and workout program in seconds.',
  },
  {
    number: '03',
    icon: BarChart3,
    title: 'Track & transform',
    description:
      'Log your progress daily. Your AI coach adapts your plan and keeps you motivated every step.',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 via-zinc-950 to-purple-900/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-32 sm:pb-32 sm:pt-40">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-700/50 bg-zinc-800/50 px-4 py-1.5 text-sm text-zinc-300 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              Powered by AI
            </div>

            <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl sm:leading-tight">
              Transform Your Body with{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                AI-Powered Coaching
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400 sm:text-xl">
              Personalized meal plans, workout programs, and 24/7 coaching
              tailored to your body, goals, and budget. Science meets
              convenience.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:brightness-110"
              >
                Get Started Free
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 px-8 py-3.5 text-base font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-zinc-800/50 bg-zinc-950 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to succeed
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              Six powerful tools working together to transform your health.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-zinc-700 hover:bg-zinc-900"
              >
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity group-hover:opacity-5`}
                />
                <div
                  className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${feature.gradient} p-2.5`}
                >
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-zinc-800/50 bg-gradient-to-b from-zinc-950 to-zinc-900 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              Three simple steps to your transformation.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800">
                  <step.icon className="h-8 w-8 text-emerald-400" />
                </div>
                <span className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-400">
                  Step {step.number}
                </span>
                <h3 className="text-xl font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-zinc-800/50 bg-zinc-900 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to start your transformation?
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Join thousands who have already taken the first step. It only takes
            a few minutes to set up your personalized plan.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-10 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:brightness-110"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 bg-zinc-950 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="text-sm text-zinc-500">
            Powered by AI | NutriCoach
          </p>
        </div>
      </footer>
    </div>
  );
}
