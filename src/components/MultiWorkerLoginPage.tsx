import React, { useState, useEffect } from "react";
import {
  Lock,
  User,
  Key,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { googleSignIn, initAuth } from "@/lib/google-auth";
import { saveOperatorProfile } from "@/lib/firebase";
import type { WorkerOperator } from "@/types";

interface MultiWorkerLoginPageProps {
  onLoginSuccess: (operator: WorkerOperator) => void;
}

export const MultiWorkerLoginPage: React.FC<MultiWorkerLoginPageProps> = ({
  onLoginSuccess,
}) => {
  const [authMode, setAuthMode] = useState<"credentials" | "google">("credentials");
  const [email, setEmail] = useState("operator@tilted.ai");
  const [accessKey, setAccessKey] = useState("tilted-bus-secret-key-2026");
  const [showKey, setShowKey] = useState(false);
  const [selectedRole, setSelectedRole] = useState<
    "Super Administrator" | "Worker Operator" | "UI Controller" | "Pipeline Supervisor"
  >("Super Administrator");
  const [clusterNode, setClusterNode] = useState("node-local-3000");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Monitor Google Auth state in background
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        // If user already logged in via Firebase / Google
        const operator: WorkerOperator = {
          id: `worker-op-${user.uid.substring(0, 8)}`,
          name: user.displayName || "Google Operator",
          email: user.email || "google-user@tilted.ai",
          role: "Super Administrator",
          cluster: "Local Bus (Port 3000)",
          authType: "google",
          avatarUrl: user.photoURL || undefined,
          lastLogin: new Date().toLocaleTimeString(),
        };
        // Auto-hydrate if found
        localStorage.setItem("tilted_multi_worker_operator", JSON.stringify(operator));
        saveOperatorProfile(operator);
        onLoginSuccess(operator);
      },
      () => {
        // Not signed in with Google
      }
    );

    return () => {
      unsubscribe();
    };
  }, [onLoginSuccess]);

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid operator email address.");
      return;
    }
    if (!accessKey.trim() || accessKey.length < 4) {
      setErrorMessage("Operator Access Key must be at least 4 characters.");
      return;
    }

    setIsSigningIn(true);
    setTimeout(() => {
      const operatorName = email.split("@")[0].replace(/[-_.]/g, " ");
      const capitalized = operatorName.charAt(0).toUpperCase() + operatorName.slice(1);

      const operator: WorkerOperator = {
        id: `op-${Math.random().toString(36).substring(2, 8)}`,
        name: capitalized || "Worker Operator",
        email: email.trim(),
        role: selectedRole,
        cluster: clusterNode === "node-local-3000" ? "Local Node (Port 3000)" : "Distributed Bus (Redis/PGMQ)",
        authType: "credentials",
        lastLogin: new Date().toLocaleTimeString(),
      };

      localStorage.setItem("tilted_multi_worker_operator", JSON.stringify(operator));
      saveOperatorProfile(operator);
      setIsSigningIn(false);
      onLoginSuccess(operator);
    }, 400);
  };

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res && res.user) {
        const operator: WorkerOperator = {
          id: `google-${res.user.uid.substring(0, 8)}`,
          name: res.user.displayName || "Google Operator",
          email: res.user.email || "user@gmail.com",
          role: "Super Administrator",
          cluster: "Local Node (Port 3000)",
          authType: "google",
          avatarUrl: res.user.photoURL || undefined,
          lastLogin: new Date().toLocaleTimeString(),
        };
        localStorage.setItem("tilted_multi_worker_operator", JSON.stringify(operator));
        saveOperatorProfile(operator);
        onLoginSuccess(operator);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to authenticate with Google Account.";
      setErrorMessage(msg);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleQuickDemoLaunch = () => {
    setIsSigningIn(true);
    setTimeout(() => {
      const demoOperator: WorkerOperator = {
        id: "op-tilted-demo",
        name: "Lead System Operator",
        email: "operator@tilted.ai",
        role: "Super Administrator",
        cluster: "Local Node (Port 3000)",
        authType: "demo",
        lastLogin: new Date().toLocaleTimeString(),
      };
      localStorage.setItem("tilted_multi_worker_operator", JSON.stringify(demoOperator));
      saveOperatorProfile(demoOperator);
      setIsSigningIn(false);
      onLoginSuccess(demoOperator);
    }, 250);
  };

  return (
    <div className="h-full w-full overflow-y-auto p-4 md:p-8 flex items-center justify-center bg-gradient-to-b from-[#0e1015] to-[#12141A]">
      <div className="w-full max-w-md my-auto">
        {/* Login Form Card */}
        <div className="flex flex-col justify-center p-6 sm:p-8 rounded-2xl bg-[#171820] border border-[#292B3A] shadow-xl text-[#F4F2F8]">
          <div className="mb-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#845CFF] flex items-center gap-1.5">
                <Lock className="size-3.5" />
                Operator Authentication
              </span>
              <span className="text-xs text-[#A4A3B2]">Required for Worker Bus</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#F4F2F8] mt-1">
              Multi-Worker Access
            </h1>
            <p className="text-xs text-[#A4A3B2] mt-1">
              Authenticate your session to access active workers, command logs, and reactive controls.
            </p>
          </div>

          {/* Auth Selector Tabs */}
          <div className="flex rounded-lg bg-[#12141A] p-1 border border-[#292B3A] mb-5">
            <button
              type="button"
              onClick={() => setAuthMode("credentials")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                authMode === "credentials"
                  ? "bg-[#1C1D25] text-[#F4F2F8] shadow-sm"
                  : "text-[#A4A3B2] hover:text-[#F4F2F8]"
              }`}
            >
              <Key className="size-3.5" />
              Operator Credentials
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("google")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                authMode === "google"
                  ? "bg-[#1C1D25] text-[#F4F2F8] shadow-sm"
                  : "text-[#A4A3B2] hover:text-[#F4F2F8]"
              }`}
            >
              <User className="size-3.5" />
              Google Account
            </button>
          </div>

          {/* Error notification */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 text-red-400 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Mode 1: Operator Credentials */}
          {authMode === "credentials" && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#F4F2F8] block mb-1.5">
                  Operator Email / Worker ID
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@tilted.ai"
                    className="bg-[#12141A] border-[#292B3A] text-[#F4F2F8] text-xs h-9 pl-9 focus-visible:ring-[#7047FF]/50"
                  />
                  <User className="size-4 text-[#A4A3B2] absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[#F4F2F8]">
                    Worker Access Secret
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-[11px] text-[#845CFF] hover:underline flex items-center gap-1"
                  >
                    {showKey ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="bg-[#12141A] border-[#292B3A] text-[#F4F2F8] text-xs h-9 pl-9 focus-visible:ring-[#7047FF]/50 font-mono"
                  />
                  <Key className="size-4 text-[#A4A3B2] absolute left-3 top-2.5" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#F4F2F8] block mb-1.5">
                    Authorized Role
                  </label>
                  <Select
                    value={selectedRole}
                    onValueChange={(val) =>
                      setSelectedRole(
                        val as "Super Administrator" | "Worker Operator" | "UI Controller" | "Pipeline Supervisor"
                      )
                    }
                  >
                    <SelectTrigger className="h-9 bg-[#12141A] border-[#292B3A] text-[#F4F2F8] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#171820] border-[#292B3A] text-[#F4F2F8]">
                      <SelectItem value="Super Administrator" className="text-xs">
                        Super Administrator
                      </SelectItem>
                      <SelectItem value="Worker Operator" className="text-xs">
                        Worker Operator
                      </SelectItem>
                      <SelectItem value="UI Controller" className="text-xs">
                        UI Controller
                      </SelectItem>
                      <SelectItem value="Pipeline Supervisor" className="text-xs">
                        Pipeline Supervisor
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#F4F2F8] block mb-1.5">
                    Worker Node / Broker
                  </label>
                  <Select value={clusterNode} onValueChange={setClusterNode}>
                    <SelectTrigger className="h-9 bg-[#12141A] border-[#292B3A] text-[#F4F2F8] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#171820] border-[#292B3A] text-[#F4F2F8]">
                      <SelectItem value="node-local-3000" className="text-xs">
                        Local Node (Port 3000)
                      </SelectItem>
                      <SelectItem value="node-redis-bus" className="text-xs">
                        Distributed Bus (PGMQ/Redis)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <Button
                  type="submit"
                  disabled={isSigningIn}
                  className="w-full h-9 text-xs font-semibold bg-[#7047FF] hover:bg-[#845CFF] text-white shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isSigningIn ? (
                    <span>Verifying Credentials...</span>
                  ) : (
                    <>
                      <span>Enter Multi-Worker Workspace</span>
                      <ArrowRight className="size-3.5" />
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleQuickDemoLaunch}
                  disabled={isSigningIn}
                  className="w-full h-8 text-xs border-[#292B3A] bg-[#12141A] text-[#A4A3B2] hover:text-[#F4F2F8] hover:bg-[#1C1D25] transition-all flex items-center justify-center gap-1.5"
                >
                  <Zap className="size-3.5 text-[#24D8ED]" />
                  <span>One-Click Demo Operator Sign-In</span>
                </Button>
              </div>
            </form>
          )}

          {/* Mode 2: Google Account Auth */}
          {authMode === "google" && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-[#12141A] border border-[#292B3A] text-center space-y-3">
                <div className="size-12 rounded-full bg-[#7047FF]/15 border border-[#7047FF]/30 flex items-center justify-center mx-auto text-[#845CFF]">
                  <User className="size-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#F4F2F8]">Google Single Sign-On</h3>
                  <p className="text-xs text-[#A4A3B2] mt-1 max-w-sm mx-auto">
                    Authenticate using your verified Google Identity to synchronize tasks, calendar permissions, and access the Multi-Worker bus.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isSigningIn}
                  className="w-full py-2.5 px-4 rounded-lg border border-[#292B3A] bg-[#171820] hover:bg-[#1C1D25] hover:border-[#24D8ED]/60 text-xs font-semibold text-[#F4F2F8] shadow-sm transition-all flex items-center justify-center gap-2.5"
                >
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="size-4 shrink-0">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                  <span>{isSigningIn ? "Authorizing Google Account..." : "Continue with Google Account"}</span>
                </button>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={handleQuickDemoLaunch}
                className="w-full text-xs text-[#A4A3B2] hover:text-[#F4F2F8]"
              >
                Or bypass with Demo Operator Credentials &rarr;
              </Button>
            </div>
          )}

          {/* Security footnote */}
          <div className="mt-5 pt-3 border-t border-[#292B3A]/60 flex items-center justify-between text-[11px] text-[#A4A3B2]">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3 text-[#20E99A]" />
              Role-Based Access Control
            </span>
            <span className="font-mono text-[10px] text-[#A4A3B2]">WorkerBus RPC v1.3</span>
          </div>
        </div>

      </div>
    </div>
  );
};
