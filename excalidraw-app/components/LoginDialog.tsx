import React, { useState, useEffect, useRef } from "react";
import { Dialog } from "@excalidraw/excalidraw/components/Dialog";
import { FilledButton } from "@excalidraw/excalidraw/components/FilledButton";

import { useAuth } from "../auth/AuthProvider";

import "./LoginDialog.scss";

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const LoginDialog: React.FC<LoginDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Prevent keyboard shortcuts from reaching Excalidraw when dialog is open
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDownCapture = (event: KeyboardEvent) => {
      // Capture events in the capture phase to prevent them from reaching Excalidraw
      // Only stop if the target is within our dialog/form
      const target = event.target as Node;
      if (formRef.current?.contains(target)) {
        // Stop propagation to prevent Excalidraw shortcuts from triggering
        // This prevents shortcuts like "i" (eyedropper) from activating while typing
        event.stopPropagation();
      }
    };

    // Add listener in capture phase to intercept before Excalidraw
    // Using capture phase ensures we catch events before they reach Excalidraw's handlers
    document.addEventListener("keydown", handleKeyDownCapture, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDownCapture, true);
    };
  }, [isOpen]);

  const handleSubmit = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);

      if (authError) {
        setError(authError.message || "Authentication failed");
      } else {
        // Success
        setEmail("");
        setPassword("");
        onSuccess?.();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog
      onCloseRequest={onClose}
      title={isSignUp ? "Sign Up" : "Sign In"}
      className="LoginDialog"
    >
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        onKeyDown={(e) => {
          // Stop keyboard events from propagating to Excalidraw
          e.stopPropagation();
        }}
        className="LoginDialog__form"
      >
        {error && <div className="LoginDialog__error">{error}</div>}

        <div className="LoginDialog__field">
          <label className="LoginDialog__label">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="LoginDialog__input"
            required
            autoFocus
          />
        </div>

        <div className="LoginDialog__field">
          <label className="LoginDialog__label">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="LoginDialog__input"
            required
            minLength={6}
          />
        </div>

        <div className="LoginDialog__actions">
          <FilledButton
            onClick={loading || !email || !password ? undefined : handleSubmit}
            label={isSignUp ? "Sign Up" : "Sign In"}
            status={loading ? "loading" : null}
          />
        </div>

        <div className="LoginDialog__toggle">
          {isSignUp ? (
            <span>
              Already have an account?{" "}
              <button
                type="button"
                className="LoginDialog__link"
                onClick={() => {
                  setIsSignUp(false);
                  setError(null);
                }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{" "}
              <button
                type="button"
                className="LoginDialog__link"
                onClick={() => {
                  setIsSignUp(true);
                  setError(null);
                }}
              >
                Sign Up
              </button>
            </span>
          )}
        </div>
      </form>
    </Dialog>
  );
};
