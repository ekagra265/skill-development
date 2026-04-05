"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  LogIn,
  UserPlus,
} from "lucide-react";

import { fetchCurrentUser, hasAccessToken, login, register } from "@/lib/api";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,32}$/;
const MIN_PASSWORD_LENGTH = 8;
const LAST_USERNAME_KEY = "agripulse_last_username";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberUsername, setRememberUsername] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"submit" | "verify" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loading = loadingAction !== null;
  const isRegisterMode = mode === "register";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const remembered = window.localStorage.getItem(LAST_USERNAME_KEY);
    if (remembered?.trim()) {
      setUsername(remembered.trim());
    }
  }, []);

  function validateForm(): string | null {
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!USERNAME_PATTERN.test(cleanUsername)) {
      return "Username must be 3-32 chars (letters, numbers, ., _, -).";
    }
    if (cleanPassword.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (isRegisterMode && cleanPassword !== confirmPassword.trim()) {
      return "Passwords do not match.";
    }
    return null;
  }

  function persistUsernamePreference(cleanUsername: string): void {
    if (typeof window === "undefined") return;
    if (rememberUsername) {
      window.localStorage.setItem(LAST_USERNAME_KEY, cleanUsername);
    } else {
      window.localStorage.removeItem(LAST_USERNAME_KEY);
    }
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoadingAction("submit");
    try {
      const cleanUsername = username.trim();
      const response = isRegisterMode
        ? await register(cleanUsername, password)
        : await login(cleanUsername, password);
      persistUsernamePreference(cleanUsername);

      setMessage(
        isRegisterMode
          ? `Account created for ${response.user.username}. Redirecting to history...`
          : `Signed in as ${response.user.username}. Redirecting to history...`
      );

      setTimeout(() => {
        router.push("/history");
      }, 700);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isRegisterMode
          ? "Registration failed."
          : "Login failed."
      );
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

  function switchMode(nextMode: Mode): void {
    setMode(nextMode);
    setError("");
    setMessage("");
  }

  const submitLabel = isRegisterMode ? "Create Account" : "Sign In";
  const submitLoadingLabel = isRegisterMode ? "Creating account..." : "Signing in...";

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
                <h1 className="text-xl font-bold text-foreground">Account Access</h1>
                <p className="text-sm text-muted-foreground">
                  Sign in or create an account for report history and PDF endpoints.
                </p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
              <button
                type="button"
                onClick={() => switchMode("login")}
                disabled={loading}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  mode === "login"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </span>
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                disabled={loading}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  mode === "register"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4" />
                  Create Account
                </span>
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-11 text-sm outline-none ring-ring focus:ring-2"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isRegisterMode ? "new-password" : "current-password"}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {isRegisterMode && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Confirm Password</label>
                  <div className="relative">
                    <input
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-11 text-sm outline-none ring-ring focus:ring-2"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={rememberUsername}
                    onChange={(event) => setRememberUsername(event.target.checked)}
                    className="h-4 w-4 accent-primary"
                    disabled={loading}
                  />
                  Remember username
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setUsername("admin");
                    setPassword("admin123");
                    setConfirmPassword("admin123");
                    setError("");
                    setMessage("Demo credentials filled. Press Sign In.");
                  }}
                  disabled={loading}
                  className="text-xs font-medium text-primary transition-colors hover:text-primary/80 disabled:opacity-50"
                >
                  Use Demo Credentials
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                Username: 3-32 chars (`a-z`, `0-9`, `.`, `_`, `-`) and password at least {" "}
                {MIN_PASSWORD_LENGTH} chars.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {loadingAction === "submit" ? submitLoadingLabel : "Working..."}
                  </>
                ) : (
                  <>
                    {isRegisterMode ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                    {submitLabel}
                  </>
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
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Open History <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard"
                className="col-span-2 inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Open Dashboard <ArrowRight className="h-4 w-4" />
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
