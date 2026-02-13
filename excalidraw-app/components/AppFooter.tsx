import { Footer } from "@excalidraw/excalidraw/index";
import React, { useState } from "react";

import { isExcalidrawPlusSignedUser } from "../app_constants";

import { DebugFooter, isVisualDebuggerEnabled } from "./DebugCanvas";
import { EncryptedIcon } from "./EncryptedIcon";

import "./AppFooter.scss";

interface AppFooterProps {
  onChange: () => void;
  onManualSave?: () => Promise<void>;
  canvasName?: string;
  isAuthenticated?: boolean;
}

export const AppFooter = React.memo(
  ({
    onChange,
    onManualSave,
    canvasName,
    isAuthenticated,
  }: AppFooterProps) => {
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
      if (onManualSave && !isSaving) {
        setIsSaving(true);
        try {
          await onManualSave();
        } finally {
          setIsSaving(false);
        }
      }
    };

    return (
      <Footer>
        <div
          style={{
            display: "flex",
            gap: ".5rem",
            alignItems: "center",
          }}
        >
          {isVisualDebuggerEnabled() && <DebugFooter onChange={onChange} />}
          {!isExcalidrawPlusSignedUser && <EncryptedIcon />}
          {isAuthenticated && onManualSave && (
            <button
              className="AppFooter__save-button"
              onClick={handleSave}
              disabled={isSaving}
              title={`Save ${canvasName || "canvas"} to My Canvases`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span className="AppFooter__save-text">
                {isSaving ? "Saving..." : canvasName || "Untitled Canvas"}
              </span>
            </button>
          )}
        </div>
      </Footer>
    );
  },
);
