import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const url = import.meta.env.VITE_LOGIN_WITH_PIN_URL;

      if (!url) {
        throw new Error(
          "Missing VITE_LOGIN_WITH_PIN_URL. Check your .env file and restart the dev server."
        );
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          pin: pin.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Prefer message returned by function, otherwise generic
        throw new Error(data?.error || data?.message || "Invalid credentials");
      }

      // Your edge function should return either:
      // - { access_token, refresh_token }  (preferred)
      // OR
      // - { session: { access_token, refresh_token } }
      const access_token =
        data?.access_token || data?.session?.access_token || null;
      const refresh_token =
        data?.refresh_token || data?.session?.refresh_token || null;

      if (!access_token || !refresh_token) {
        throw new Error(
          "Login succeeded, but no session tokens were returned. Check the edge function response."
        );
      }

      const { error: setSessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (setSessionError) throw setSessionError;
      // If successful, Supabase auth state changes and your app should route accordingly.
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F4F6] flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-white border-[#2E5C6E]/20">
        <CardHeader>
          <CardTitle className="text-[#1E1E1E]">Sign in</CardTitle>
          <p className="text-sm text-[#2E5C6E]">
            Use the login details provided by your school.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#1E1E1E]">
                Username
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. john.doe"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#1E1E1E]">PIN</label>
              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                inputMode="numeric"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}