import { SplineScene } from "@/components/ui/splite";
import { Card } from "@/components/ui/card"
import { Spotlight } from "@/components/ui/spotlight"
import Link from "next/link";
 
export default function Home() {
  return (
    <main className="flex flex-col bg-black min-h-screen">
      {/* Hero Section - Full Screen */}
      <section className="relative flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-[1400px] h-[calc(100vh-4rem)] min-h-[600px] bg-black/[0.96] relative overflow-hidden border-zinc-800 rounded-3xl">
          <Spotlight
            className="-top-40 left-0 md:left-60 md:-top-20"
            fill="white"
          />
          
          <div className="flex h-full flex-col md:flex-row">
            {/* Left content */}
            <div className="flex-1 p-8 md:p-14 relative z-10 flex flex-col justify-center">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 tracking-tight">
                BrandForge
              </h1>
              <p className="mt-6 text-neutral-300 max-w-lg text-lg leading-relaxed">
                Automated multi-image branding, precise 1:1 cropping, and sleek custom typography—all processed instantly on the cloud.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/login" className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-neutral-200 transition-colors">
                  Get Started
                </Link>
              </div>
            </div>

            {/* Right content */}
            <div className="flex-1 relative min-h-[300px] hidden md:block">
              <SplineScene 
                scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                className="w-full h-full"
              />
            </div>
          </div>
        </Card>
      </section>

      {/* Contact Section */}
      <section className="w-full bg-zinc-950 py-24 px-4 sm:px-8 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-16">
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Get in Touch</h2>
            <p className="text-zinc-400 text-lg max-w-md mx-auto md:mx-0">
              Have questions about integrating BrandForge into your workflow? We're here to help you scale your brand beautifully and efficiently.
            </p>
          </div>
          
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
            <div className="bg-black border border-zinc-800 p-8 rounded-3xl flex flex-col items-center md:items-start text-center md:text-left hover:border-zinc-700 transition-colors">
              <div className="bg-zinc-900 p-3 rounded-full mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </div>
              <h3 className="text-white font-semibold text-xl mb-2">Email Us</h3>
              <p className="text-zinc-400">hello@brandforge.ai</p>
            </div>
            <div className="bg-black border border-zinc-800 p-8 rounded-3xl flex flex-col items-center md:items-start text-center md:text-left hover:border-zinc-700 transition-colors">
              <div className="bg-zinc-900 p-3 rounded-full mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              </div>
              <h3 className="text-white font-semibold text-xl mb-2">Visit Us</h3>
              <p className="text-zinc-400">123 AI Avenue<br/>San Francisco, CA</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="w-full bg-black py-8 border-t border-zinc-900 text-center text-zinc-600 text-sm">
        <p>© 2026 BrandForge. All rights reserved.</p>
      </footer>
    </main>
  )
}
