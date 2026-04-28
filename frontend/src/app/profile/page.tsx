"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Spotlight } from "@/components/ui/spotlight";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const [generations, setGenerations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setCurrentUser(user);

      try {
        const q = query(
          collection(db, "generations"),
          where("uid", "==", user.uid),
        );
        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort manually because composite index might be missing
        docs.sort((a: any, b: any) => {
            if (!a.timestamp || !b.timestamp) return 0;
            return b.timestamp.seconds - a.timestamp.seconds;
        });
        setGenerations(docs);
      } catch (error) {
        console.error("Error fetching generations", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center bg-black p-4 sm:p-8 pt-32">
      {/* Navbar matching the Dashboard's MiniNavbar */}
      <header className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center justify-between px-6 py-3 backdrop-blur-md rounded-full border border-zinc-800 bg-zinc-900/40 w-[90%] max-w-[500px]">
        <Link href="/" className="flex items-center gap-3 text-white font-semibold">
          <div className="relative w-5 h-5 flex items-center justify-center">
            <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 top-0 left-1/2 transform -translate-x-1/2 opacity-80"></span>
            <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 left-0 top-1/2 transform -translate-y-1/2 opacity-80"></span>
            <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 right-0 top-1/2 transform -translate-y-1/2 opacity-80"></span>
            <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 bottom-0 left-1/2 transform -translate-x-1/2 opacity-80"></span>
          </div>
          BrandForge
        </Link>
        <div className="flex gap-3">
          <Link href="/dashboard" className="px-4 py-2 text-sm border border-zinc-800 bg-zinc-800/60 text-zinc-300 rounded-full hover:border-zinc-500 hover:text-white transition-colors">
            Dashboard
          </Link>
          <button onClick={() => signOut(auth)} className="px-4 py-2 text-sm font-semibold text-black bg-gradient-to-br from-gray-100 to-gray-300 rounded-full hover:from-gray-200 hover:to-gray-400 transition-colors">
            Logout
          </button>
        </div>
      </header>

      <Card className="w-full max-w-7xl min-h-[80vh] bg-black/[0.96] relative overflow-hidden border-zinc-800 p-8 sm:p-12 rounded-3xl">
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
        
        <div className="relative z-10 w-full flex flex-col h-full">
          {currentUser && (
            <div className="flex items-center gap-6 mb-10 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 shadow-xl backdrop-blur-sm">
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="Profile" className="w-20 h-20 rounded-full border-2 border-zinc-700 object-cover shadow-lg" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-3xl font-bold text-zinc-400 shadow-lg">
                  {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : currentUser.email.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">{currentUser.displayName || "BrandForge User"}</h2>
                <p className="text-zinc-400 mt-1 font-medium">{currentUser.email}</p>
              </div>
            </div>
          )}

          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 mb-2 tracking-tight">
            Generation History
          </h1>
          <p className="text-zinc-400 mb-8">View and download your past branded images.</p>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
          ) : generations.length === 0 ? (
            <div className="text-center py-20 border border-zinc-800 border-dashed rounded-2xl">
              <p className="text-zinc-500 mb-4 text-lg">No generations yet.</p>
              <Link href="/dashboard" className="px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-neutral-200 transition-colors inline-block">
                Generate Something
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[55vh] overflow-y-auto pr-4 pb-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
              {generations.map((gen) => (
                <div key={gen.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all flex flex-col">
                  {/* Results Images */}
                  <div className="p-4 grid gap-2 grid-cols-2 bg-black/50">
                    {gen.results && gen.results.map((res: any, idx: number) => (
                      <div key={idx} className="aspect-square relative rounded-xl overflow-hidden group">
                        <img src={res.url} alt="Result" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <a href={res.url} target="_blank" rel="noreferrer" className="text-xs bg-white text-black px-3 py-1 rounded-full font-medium">View</a>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Info */}
                  <div className="p-5 border-t border-zinc-900 flex-1 flex flex-col">
                    <p className="text-xs text-zinc-500 mb-4 uppercase tracking-wider font-medium">
                      {gen.timestamp ? new Date(gen.timestamp.seconds * 1000).toLocaleDateString() : "Just now"}
                    </p>
                    {gen.inputs && (
                      <div className="space-y-3 mt-auto">
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Business</p>
                          <p className="text-sm text-zinc-300 bg-zinc-900 px-2 py-1 rounded w-fit">{gen.inputs.business_name}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Services</p>
                          <p className="text-sm text-zinc-300 bg-zinc-900 px-2 py-1 rounded w-fit truncate">{gen.inputs.services}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Input Prompt</p>
                          <p className="text-sm text-zinc-300 bg-zinc-900 p-2 rounded italic line-clamp-3">"{gen.inputs.prompt}"</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </main>
  );
}
