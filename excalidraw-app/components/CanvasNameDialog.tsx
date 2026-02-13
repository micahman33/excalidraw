import React, { useState, useEffect, useRef } from "react";
import { Dialog } from "@excalidraw/excalidraw/components/Dialog";
import { FilledButton } from "@excalidraw/excalidraw/components/FilledButton";

import "./CanvasNameDialog.scss";

interface CanvasNameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  defaultName?: string;
}

export const CanvasNameDialog: React.FC<CanvasNameDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  defaultName = "",
}) => {
  const [canvasName, setCanvasName] = useState(defaultName);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset name when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCanvasName(defaultName);
      // Focus and select the input text
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, defaultName]);

  // Prevent keyboard shortcuts from reaching Excalidraw when dialog is open
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDownCapture = (event: KeyboardEvent) => {
      // Capture events in the capture phase to prevent them from reaching Excalidraw
      const target = event.target as Node;
      if (formRef.current?.contains(target)) {
        // Stop propagation to prevent Excalidraw shortcuts from triggering
        event.stopPropagation();
      }
    };

    // Add listener in capture phase to intercept before Excalidraw
    document.addEventListener("keydown", handleKeyDownCapture, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDownCapture, true);
    };
  }, [isOpen]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    const trimmedName = canvasName.trim();
    if (trimmedName) {
      onConfirm(trimmedName);
      onClose();
    }
  };

  const handleCancel = () => {
    setCanvasName("");
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog
      onCloseRequest={handleCancel}
      title="Name Your Canvas"
      className="CanvasNameDialog"
    >
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          // Stop keyboard events from propagating to Excalidraw
          e.stopPropagation();
        }}
        className="CanvasNameDialog__form"
      >
        <div className="CanvasNameDialog__field">
          <label className="CanvasNameDialog__label">Canvas Name</label>
          <input
            ref={inputRef}
            type="text"
            value={canvasName}
            onChange={(e) => setCanvasName(e.target.value)}
            className="CanvasNameDialog__input"
            placeholder="Enter canvas name..."
            required
            autoFocus
          />
        </div>

        <div className="CanvasNameDialog__actions">
          <button
            type="button"
            onClick={handleCancel}
            className="CanvasNameDialog__button CanvasNameDialog__button--secondary"
          >
            Cancel
          </button>
          <FilledButton
            onClick={!canvasName.trim() ? undefined : () => handleSubmit()}
            label="Create"
          />
        </div>
      </form>
    </Dialog>
  );
};
