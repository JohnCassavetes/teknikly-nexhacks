"use client"

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

// TODO: put the actual backend link
async function handleLogin(email: string, password: string) {
    let username = email;

    const res = await fetch(`http://127.0.0.1:8000/users/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({username, password})
    });

    return res.json();
}

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        handleLogin(email, password);
    }

    return (
        <div className="flex flex-col items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
            <Navbar/>
        
            <div className="min-h-screen w-full max-w-screen-xl mx-auto px-6 flex flex-col justify-center items-center">
        
                <div className="w-full max-w-md rounded-xl shadow-lg p-8 flex flex-col gap-5
                    bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950
                ">
                    <p className="text-2xl text-white text-center">
                        Welcome back
                    </p>

                    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-1">
                                <p className="text-white">
                                    Email
                                </p>

                                <input
                                    placeholder="Your email"
                                    className="px-4 py-2 rounded-lg bg-zinc-800 
                                        focus:outline-none focus:shadow-[0_2px_0_0_theme(colors.emerald.600)]
                                    "
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <p className="text-white">
                                    Password
                                </p>
                                <input
                                    type="password"
                                    placeholder="Your password"
                                    className="px-4 py-2 rounded-lg bg-zinc-800 
                                        focus:outline-none focus:shadow-[0_2px_0_0_theme(colors.emerald.600)]
                                    "
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                        

                        <div className="flex flex-col gap-4">
                            <button
                                type="submit"
                                className="
                                    text-white py-2 rounded-lg bg-gradient-to-b from-emerald-600 to-emerald-900
                                    hover:bg-gradient-to-b hover:from-emerald-700 hover:to-emerald-900 
                                "
                                onClick={() => {}}
                            >
                                Sign in
                            </button>

                            <button
                                type="submit"
                                className="
                                    text-white py-2 rounded-lg bg-zinc-900
                                    hover:bg-zinc-800
                                    border border-2 border-emerald-600
                                "
                                onClick={() => {}}
                            >
                                Sign in with Google
                            </button>
                        </div>

                        <p className="text-center">
                            Don't have an account? <Link href="/signup" className="text-emerald-500 hover:underline">Sign up.</Link>
                        </p>
                    </form>
                </div>
        
                
            </div>
        </div>
    )
}
