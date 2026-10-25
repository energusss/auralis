import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: Record<string, string | number | boolean>,
          ) => void;
        };
      };
    };
  }
}

export function GoogleLoginButton({
  label,
  onCredential,
}: {
  label: string;
  onCredential: (credential: string) => void;
}) {
  const target = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  callback.current = onCredential;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId || !target.current) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !target.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        auto_select: false,
        callback: ({ credential }) => callback.current(credential),
      });
      window.google.accounts.id.renderButton(target.current, {
        type: "standard",
        theme: "filled_black",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: Math.min(360, target.current.clientWidth || 360),
        locale: label.startsWith("Kontynuuj") ? "pl" : "en",
      });
    };
    const loaded = document.getElementById("google-identity-services");
    if (window.google) render();
    else if (loaded) loaded.addEventListener("load", render, { once: true });
    else {
      const script = document.createElement("script");
      script.id = "google-identity-services";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = render;
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
    };
  }, [clientId, label]);

  return clientId ? (
    <div ref={target} className="google-login" aria-label={label} />
  ) : (
    <p className="muted">{label} · VITE_GOOGLE_CLIENT_ID</p>
  );
}
