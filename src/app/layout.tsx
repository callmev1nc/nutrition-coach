import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { SupabaseProvider } from "@/components/providers/supabase-provider"
import { TooltipProvider } from "@/components/ui/tooltip"

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "NutriCoach AI - Weight Loss & Body Transformation Coach",
  description: "AI-powered personalized weight loss coaching",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.variable} ${geistMono.variable} antialiased min-h-screen bg-[#0c0e14] text-gray-200`}>
        <SupabaseProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </SupabaseProvider>
      </body>
    </html>
  )
}
