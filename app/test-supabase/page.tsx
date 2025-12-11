"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function TestPage() {
  const [status, setStatus] = useState("Testing connection...");
  const [envVars, setEnvVars] = useState<any>({});

  useEffect(() => {
    const checkConnection = async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      setEnvVars({
        url: url ? "Defined" : "Undefined",
        key: key ? "Defined" : "Undefined",
        urlValue: url, // Be careful showing this in prod, but ok for local debug
      });

      if (!url || !key) {
        setStatus("Missing environment variables");
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase.from("test").select("*").limit(1);
        
        // Even if table doesn't exist, we should get a specific error, not a connection error
        if (error) {
            // 404 or 400 means we reached supabase but request failed (which is good for connection test)
            // 500 or network error means we can't reach it
            setStatus(`Connected to Supabase, but got error: ${error.message} (Code: ${error.code})`);
        } else {
            setStatus("Successfully connected to Supabase!");
        }
      } catch (err: any) {
        setStatus(`Failed to connect: ${err.message}`);
      }
    };

    checkConnection();
  }, []);

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      <div className="mb-4">
        <strong>Status:</strong> {status}
      </div>
      <div className="mb-4">
        <strong>Environment Variables:</strong>
        <pre className="bg-gray-100 p-4 rounded mt-2">
          {JSON.stringify(envVars, null, 2)}
        </pre>
      </div>
    </div>
  );
}
