import React, { useState } from "react";

import { Card } from "@excalidraw/excalidraw/components/Card";
import { ToolButton } from "@excalidraw/excalidraw/components/ToolButton";
import { getFrame } from "@excalidraw/common";
import { trackEvent } from "@excalidraw/excalidraw/analytics";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

import { useAuth } from "../auth/AuthProvider";
import { CanvasService } from "../data/CanvasService";

// Simple folder icon SVG
const FolderIcon = () => (
  <svg
    width="2.8rem"
    height="2.8rem"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

export const SaveToMyCanvases: React.FC<{
  elements: readonly NonDeletedExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
  name: string;
  currentCanvasId: string | null;
  onError: (error: Error) => void;
  onSuccess: () => void;
  onCanvasSaved?: (canvasId: string, canvasName: string) => void;
}> = ({
  elements,
  appState,
  files,
  name,
  currentCanvasId,
  onError,
  onSuccess,
  onCanvasSaved,
}) => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!user) {
      onError(new Error("Please sign in to save canvases"));
      return;
    }

    setIsSaving(true);
    try {
      trackEvent("export", "myCanvases", `ui (${getFrame()})`);

      const canvasName = name || appState.name || "Untitled Canvas";

      if (currentCanvasId) {
        // Update existing canvas
        const { canvas, error } = await CanvasService.updateCanvas(
          currentCanvasId,
          user.id,
          {
            name: canvasName,
            elements,
            appState: {
              ...appState,
              name: canvasName,
            },
            files,
          },
        );

        if (error) {
          throw new Error(error.message || "Failed to save canvas");
        }

        if (canvas && onCanvasSaved) {
          onCanvasSaved(canvas.id, canvas.name);
        }
      } else {
        // Create new canvas
        const { canvas, error } = await CanvasService.saveCanvas(
          user.id,
          canvasName,
          elements,
          appState,
          files,
        );

        if (error) {
          throw new Error(error.message || "Failed to save canvas");
        }

        if (canvas && onCanvasSaved) {
          onCanvasSaved(canvas.id, canvas.name);
        }
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error saving to My Canvases:", error);
      onError(
        error instanceof Error
          ? error
          : new Error("Failed to save canvas. Please try again."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <Card color="primary">
        <div className="Card-icon">
          <FolderIcon />
        </div>
        <h2>My Canvases</h2>
        <div className="Card-details">
          Sign in to save your canvas to your account.
        </div>
      </Card>
    );
  }

  return (
    <Card color="primary">
      <div className="Card-icon">
        <FolderIcon />
      </div>
      <h2>My Canvases</h2>
      <div className="Card-details">
        {currentCanvasId
          ? "Save changes to your canvas."
          : "Save this canvas to your account for easy access later."}
      </div>
      <ToolButton
        className="Card-button"
        type="button"
        title={currentCanvasId ? "Save Changes" : "Save to My Canvases"}
        aria-label={
          isSaving ? "Saving..." : currentCanvasId ? "Save Changes" : "Save"
        }
        showAriaLabel={true}
        onClick={handleSave}
        disabled={isSaving}
      />
    </Card>
  );
};
