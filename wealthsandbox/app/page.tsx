"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900 relative overflow-hidden">

      {/* BACKGROUND */}
      <div className="absolute inset-0 grid grid-cols-2 -space-x-52 opacity-40 pointer-events-none">
        <div className="blur-[120px] h-56 bg-gradient-to-br from-purple-500 to-indigo-400"></div>
        <div className="blur-[120px] h-32 bg-gradient-to-r from-cyan-400 to-purple-300"></div>
      </div>

      {/* HEADER */}
      <header className="fixed top-0 left-0 w-full z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <Sparkles className="w-5 h-5 text-purple-600" />
            WealthSandbox
          </div>
          <Link
            href="/login"
            className="px-5 py-2 text-sm font-medium rounded-full text-white bg-gradient-to-r from-purple-600 to-indigo-500 hover:scale-105 active:scale-95 transition flex items-center gap-2"
          >
            Sign In <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-40 pb-20">
        <h1 className="text-4xl md:text-6xl font-bold max-w-3xl">
          Simulate Your Wealth.{" "}
          <span className="bg-gradient-to-r from-purple-600 to-indigo-500 bg-clip-text text-transparent">
            Decide with Confidence.
          </span>
        </h1>

        <p className="mt-6 text-lg text-gray-600 max-w-xl">
          WealthSandbox lets you explore financial scenarios.
        </p>

        <div className="mt-8">
          <Link
            href="/login"
            className="px-6 py-3 rounded-full text-white bg-gradient-to-r from-purple-600 to-indigo-500 inline-flex items-center gap-2 hover:scale-105 active:scale-95 transition"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}