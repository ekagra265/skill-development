"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Loader2, LockKeyhole, LogIn } from "lucide-react";

import { fetchCurrentUser, hasAccessToken, login, register } from "@/lib/api";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function LoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loadingAction, setLoadingAction] = useState<
    "login" | "register" | "verify" | null
  >(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const loading = loadingAction !== null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingAction("login");
    setError("");
    setMessage("");
    try {
      const response = await login(username, password);
      setMessage(
        `Signed in as ${response.user.username}. You can now access report history and PDF downloads.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function verifySession() {
    setLoadingAction("verify");
    setError("");
    setMessage("");
    try {
      const user = await fetchCurrentUser();
      setMessage(`Active session found for ${user.username}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Session check failed.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleRegister() {
    setLoadingAction("register");
    setError("");
    setMessage("");
    try {
      const response = await register(username, password);
      setMessage(
        `Account created for ${response.user.username}. You are now signed in.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-background py-12">
        <div className="container">
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 shadow-card md:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Sign In</h1>
                <p className="text-sm text-muted-foreground">
                  Required for report history and PDF endpoints.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Username
                </label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Password
                </label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {loadingAction === "login" ? "Signing in..." : "Working..."}
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleRegister}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {loadingAction === "register"
                      ? "Creating account..."
                      : "Working..."}
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={verifySession}
                disabled={loading || !hasAccessToken()}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
              >
                Check Session
              </button>
              <Link
                href="/history"
                className="rounded-lg border border-border bg-card px-3 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Open History
              </Link>
            </div>

            {message && (
              <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                {message}
              </p>
            )}
            {error && (
              <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
