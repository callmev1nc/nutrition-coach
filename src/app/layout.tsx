import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google"
import "./globals.css"
import { SupabaseProvider } from "@/components/providers/supabase-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/components/providers/theme-provider"

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })
const heading = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "NutriCoach — your hype nutrition coach",
  description: "Gamified, teen-friendly AI nutrition & fitness coaching. Level up, keep streaks, hit your goals.",
}

export const viewport: Viewport = {
  themeColor: "#7C3AED",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${geistMono.variable} ${heading.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <ThemeProvider>
          <SupabaseProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
