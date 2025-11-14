"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

import { API_BASE } from "@/lib/api-base";

function formatDisplayName(user: ReturnType<typeof usePrivy>["user"]) {
  const email = user?.email?.address;
  if (email) {
    return email;
  }

  const walletAddress = user?.wallet?.address;
  if (walletAddress) {
    return `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`;
  }

  return user?.id ?? "已登录";
}

export function AuthControls() {
  const { ready, authenticated, user, login, logout, getAccessToken } =
    usePrivy();
  const [pending, setPending] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);
  const [hasExchanged, setHasExchanged] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const disabled = useMemo(
    () => pending || isExchanging,
    [pending, isExchanging]
  );

  const resolveAccessToken = useCallback(
    async (tokenOverride?: string): Promise<string> => {
      if (tokenOverride) {
        return tokenOverride;
      }
      if (!getAccessToken) {
        throw new Error("Privy 客户端未就绪，稍后再试。");
      }

      const maxAttempts = 5;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const token = await getAccessToken();
        if (token) {
          return token;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      throw new Error("无法获取 Privy Access Token，请重试登录。");
    },
    [getAccessToken]
  );

  const exchangeSession = useCallback(
    async (accessTokenOverride?: string) => {
      setSessionError(null);
      setIsExchanging(true);
      try {
        const token = await resolveAccessToken(accessTokenOverride);
        const endpoint = `${API_BASE}/sessions/privy`;

        console.debug("[auth-controls] Exchanging Privy session", {
          endpoint,
          hasOverride: Boolean(accessTokenOverride),
          tokenPreview: token.slice(0, 6),
        });

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ token }),
        });

        console.debug("[auth-controls] Exchange response", {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
        });

        if (!response.ok) {
          let message = "会话同步失败，请稍后再试。";
          try {
            const body = await response.json();
            console.warn("[auth-controls] Exchange error payload", body);
            if (body?.detail) {
              message = body.detail as string;
            }
          } catch (error) {
            console.warn(
              "[auth-controls] Failed to parse exchange error response",
              error
            );
          }
          throw new Error(message);
        }

        setHasExchanged(true);
      } catch (error) {
        console.error("[auth-controls] Privy session exchange failed", error);
        throw error;
      } finally {
        setIsExchanging(false);
      }
    },
    [resolveAccessToken]
  );

  const handleLogin = async () => {
    if (disabled) return;
    setSessionError(null);
    setPending(true);
    try {
      await login();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "登录失败，请稍后重试。";
      setSessionError(message);
      console.error("Privy login failed", error);
    } finally {
      setPending(false);
    }
  };

  const handleLogout = async () => {
    if (disabled) return;
    setPending(true);
    try {
      await logout();
    } finally {
      setPending(false);
      setHasExchanged(false);
      setSessionError(null);
    }
  };

  useEffect(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    if (!ready) {
      return;
    }

    if (!authenticated) {
      setHasExchanged(false);
      setRetryAttempt(0);
      return;
    }

    if (hasExchanged || isExchanging) {
      return;
    }

    const baseDelay = 1000;
    const maxDelay = 30_000;
    const delay =
      retryAttempt === 0
        ? 0
        : Math.min(maxDelay, baseDelay * 2 ** Math.max(0, retryAttempt - 1));

    retryTimerRef.current = setTimeout(() => {
      exchangeSession()
        .then(() => {
          setRetryAttempt(0);
        })
        .catch((error) => {
          const message =
            error instanceof Error
              ? error.message
              : "会话同步失败，请重新登录。";
          setSessionError(message);
          console.error("Failed to synchronize Privy session", error);
          setRetryAttempt((attempt) => Math.min(attempt + 1, 8));
        });
    }, delay);

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [
    ready,
    authenticated,
    hasExchanged,
    isExchanging,
    exchangeSession,
    retryAttempt,
  ]);

  if (!ready) {
    return (
      <div className="h-9 w-24 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
    );
  }

  if (!authenticated) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={handleLogin}
          disabled={disabled}
          className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
        >
          {disabled ? "连接中..." : "登录"}
        </button>
        {sessionError && (
          <span className="text-xs text-red-500 dark:text-red-400">
            {sessionError}
          </span>
        )}
      </div>
    );
  }

  const displayName = formatDisplayName(user);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white/80 px-4 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
        <span className="max-w-[160px] truncate font-medium text-zinc-800 dark:text-zinc-100">
          {displayName}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          disabled={disabled}
          className="rounded-full border border-transparent px-3 py-1 text-xs font-medium text-zinc-500 transition hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:hover:text-white"
        >
          退出
        </button>
      </div>
      {sessionError && (
        <span className="text-xs text-red-500 dark:text-red-400">
          {sessionError}
        </span>
      )}
    </div>
  );
}

