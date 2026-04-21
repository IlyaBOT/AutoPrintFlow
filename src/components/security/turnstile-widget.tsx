"use client";

import Script from "next/script";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

import { useI18n } from "@/components/providers/i18n-provider";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>,
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

export type TurnstileWidgetHandle = {
  reset: () => void;
};

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, {
  action: string;
  siteKey: string;
  onTokenChange: (token: string | null) => void;
}>(({ action, onTokenChange, siteKey }, ref) => {
  const { locale } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [apiReady, setApiReady] = useState(false);

  const clearToken = useCallback(() => {
    onTokenChange(null);
  }, [onTokenChange]);

  useImperativeHandle(ref, () => ({
    reset() {
      clearToken();

      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.reset(widgetIdRef.current);
      }
    },
  }), [clearToken]);

  useEffect(() => {
    if (!window.turnstile) {
      return;
    }

    setApiReady(true);
  }, []);

  useEffect(() => {
    if (!apiReady || !window.turnstile || !containerRef.current) {
      return;
    }

    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    }

    containerRef.current.innerHTML = "";

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      language: locale,
      theme: "auto",
      "response-field": false,
      callback: (token: string) => {
        onTokenChange(token);
      },
      "error-callback": clearToken,
      "expired-callback": clearToken,
      "timeout-callback": clearToken,
    });

    return () => {
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, apiReady, clearToken, locale, onTokenChange, siteKey]);

  return (
    <>
      <Script
        id="cf-turnstile-api"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setApiReady(true)}
      />
      <div ref={containerRef} className="min-h-[65px]" />
    </>
  );
});

TurnstileWidget.displayName = "TurnstileWidget";
