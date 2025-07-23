"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";

export default function DebugPage() {
    const [session, setSession] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [cookies, setCookies] = useState<string>("");

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            setUser(data.session?.user || null);
        });
        setCookies(document.cookie);
    }, []);

    return (
        <div className="max-w-2xl mx-auto py-12 px-4">
            <h1 className="text-2xl font-bold mb-4">Debug Info</h1>
            <div className="mb-6">
                <h2 className="font-semibold mb-2">Supabase Session</h2>
                <pre className="bg-muted/50 p-2 rounded text-xs overflow-x-auto">
                    {JSON.stringify(session, null, 2)}
                </pre>
            </div>
            <div className="mb-6">
                <h2 className="font-semibold mb-2">Supabase User</h2>
                <pre className="bg-muted/50 p-2 rounded text-xs overflow-x-auto">
                    {JSON.stringify(user, null, 2)}
                </pre>
            </div>
            <div className="mb-6">
                <h2 className="font-semibold mb-2">Browser Cookies</h2>
                <pre className="bg-muted/50 p-2 rounded text-xs overflow-x-auto">
                    {cookies}
                </pre>
            </div>
        </div>
    );
} 