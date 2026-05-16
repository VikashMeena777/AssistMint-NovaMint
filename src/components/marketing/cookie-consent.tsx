"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X } from "lucide-react";
import { getCookie, setCookie } from "cookies-next";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = getCookie("cookie_consent");
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    setCookie("cookie_consent", "accepted", { maxAge: 60 * 60 * 24 * 365 });
    setShow(false);
  };

  const decline = () => {
    setCookie("cookie_consent", "declined", { maxAge: 60 * 60 * 24 * 365 });
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-4 right-4 z-[100] sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md"
        >
          <div className="relative rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl p-5 shadow-2xl">
            <button
              onClick={decline}
              className="absolute top-3 right-3 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close cookie banner"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Cookie className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">We value your privacy 🍪</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  We use cookies to enhance your experience and analyze site
                  traffic. By accepting, you agree to our{" "}
                  <a href="#" className="underline text-primary hover:text-primary/80">
                    Cookie Policy
                  </a>
                  .
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={accept}
                className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Accept All
              </button>
              <button
                onClick={decline}
                className="flex-1 h-9 rounded-lg border border-border bg-background text-xs font-semibold hover:bg-muted transition-colors"
              >
                Decline
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
