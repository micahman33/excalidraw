import React, { useState, useEffect } from "react";
import { Dialog } from "@excalidraw/excalidraw/components/Dialog";
import { FilledButton } from "@excalidraw/excalidraw/components/FilledButton";

import { useAuth } from "../auth/AuthProvider";
import {
  CanvasService,
  type Canvas,
  type SortOption,
} from "../data/CanvasService";

import { CanvasListItem } from "./CanvasListItem";
import "./CanvasGallery.scss";

interface CanvasGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCanvas: (canvas: Canvas) => void;
  onNewCanvas: () => void;
  currentCanvasId?: string | null;
  onCanvasRenamed?: (canvasId: string, newName: string) => void;
}

export const CanvasGallery: React.FC<CanvasGalleryProps> = ({
  isOpen,
  onClose,
  onSelectCanvas,
  onNewCanvas,
  currentCanvasId,
  onCanvasRenamed,
}) => {
  const { user } = useAuth();
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("updated_at");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen && user) {
      loadCanvases();
    }
  }, [isOpen, user, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCanvases = async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setError(null);

    const { canvases: loadedCanvases, error: loadError } =
      await CanvasService.listCanvases(user.id, sortBy);

    if (loadError) {
      setError(loadError.message || "Failed to load canvases");
      setCanvases([]);
    } else {
      setCanvases(loadedCanvases);
    }

    setLoading(false);
  };

  const handleDelete = async (canvas: Canvas) => {
    if (!user) {
      return;
    }

    const { error: deleteError } = await CanvasService.deleteCanvas(
      canvas.id,
      user.id,
    );

    if (deleteError) {
      setError(deleteError.message || "Failed to delete canvas");
    } else {
      // Remove from local state
      setCanvases(canvases.filter((c) => c.id !== canvas.id));
    }
  };

  const handleRename = async (canvas: Canvas, newName: string) => {
    if (!user) {
      return;
    }

    const { canvas: updatedCanvas, error: updateError } =
      await CanvasService.updateCanvas(canvas.id, user.id, {
        name: newName,
      });

    if (updateError) {
      setError(updateError.message || "Failed to rename canvas");
    } else if (updatedCanvas) {
      // Update local state - replace the canvas with the updated one
      setCanvases(
        canvases.map((c) => (c.id === canvas.id ? updatedCanvas : c)),
      );

      // If this canvas is currently open, notify App.tsx to update its state
      if (currentCanvasId === canvas.id && onCanvasRenamed) {
        onCanvasRenamed(canvas.id, newName);
      }
    }
  };

  const filteredCanvases = canvases.filter((canvas) =>
    canvas.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog
      onCloseRequest={onClose}
      title="My Canvases"
      className="CanvasGallery"
      size="wide"
    >
      <div className="CanvasGallery__content">
        <div className="CanvasGallery__toolbar">
          <div className="CanvasGallery__search">
            <input
              type="text"
              placeholder="Search canvases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="CanvasGallery__search-input"
            />
          </div>

          <div className="CanvasGallery__controls">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="CanvasGallery__sort"
            >
              <option value="updated_at">Recently Updated</option>
              <option value="created_at">Recently Created</option>
              <option value="name">Alphabetical</option>
            </select>

            <FilledButton
              label="New Canvas"
              onClick={() => {
                onNewCanvas();
                onClose();
              }}
            />
          </div>
        </div>

        {error && <div className="CanvasGallery__error">{error}</div>}

        {loading ? (
          <div className="CanvasGallery__loading">Loading canvases...</div>
        ) : filteredCanvases.length === 0 ? (
          <div className="CanvasGallery__empty">
            {searchQuery
              ? "No canvases match your search"
              : "No canvases yet. Create your first canvas!"}
          </div>
        ) : (
          <div className="CanvasGallery__grid">
            {filteredCanvases.map((canvas) => (
              <CanvasListItem
                key={canvas.id}
                canvas={canvas}
                onSelect={onSelectCanvas}
                onDelete={handleDelete}
                onRename={handleRename}
              />
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
};
