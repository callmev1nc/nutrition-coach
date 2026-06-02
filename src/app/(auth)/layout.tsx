import { Flame } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0c0e14] px-4 relative overflow-hidden">
      {/* Gradient accent orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-indigo-500/5 blur-3xl" />
      </div>

      {/* Logo */}
      <div className="relative z-10 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <Flame className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          NutriCoach AI
        </h1>
      </div>

      {/* Centered card container */}
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
