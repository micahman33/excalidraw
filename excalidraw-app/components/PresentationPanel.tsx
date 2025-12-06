import React, { useState, useEffect, useRef } from "react";
import {
  useExcalidrawActionManager,
  useExcalidrawAppState,
  useExcalidrawElements,
} from "@excalidraw/excalidraw";
import { isFrameLikeElement } from "@excalidraw/element";
import { getFrameLikeTitle } from "@excalidraw/element/frame";
import { exportToCanvas } from "@excalidraw/utils/export";

import {
  actionStartPresentation,
  actionStopPresentation,
  actionNextFrame,
  actionPreviousFrame,
  actionReorderFrames,
} from "@excalidraw/excalidraw/actions/actionPresentation";

import "./PresentationPanel.scss";

export const PresentationPanel = () => {
  const actionManager = useExcalidrawActionManager();
  const appState = useExcalidrawAppState();
  const elements = useExcalidrawElements();
  const { presentationMode } = appState;
  const {
    enabled,
    currentFrameIndex,
    frames: presentationFrames,
  } = presentationMode;

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const generatedThumbnailIdsRef = useRef<Set<string>>(new Set());

  // Get frames - use custom order if available, otherwise get from scene
  const sceneFrames = elements.filter(isFrameLikeElement);
  // Use readonly arrays properly - create mutable copies when needed
  let frames: typeof sceneFrames = sceneFrames;

  if (presentationFrames.length > 0) {
    // Preserve custom order when frames change
    const prevFrameIds = new Set(presentationFrames.map((f) => f.id));

    const existingFrames = sceneFrames.filter((f) => prevFrameIds.has(f.id));
    const newFrames = sceneFrames.filter((f) => !prevFrameIds.has(f.id));

    if (existingFrames.length > 0) {
      // Sort existing frames by custom order, then append new frames
      const customOrderMap = new Map(
        presentationFrames.map((f, idx) => [f.id, idx]),
      );
      existingFrames.sort((a, b) => {
        const aOrder = customOrderMap.get(a.id) ?? Infinity;
        const bOrder = customOrderMap.get(b.id) ?? Infinity;
        return aOrder - bOrder;
      });

      frames = [...existingFrames, ...newFrames];
    } else if (newFrames.length > 0) {
      // All frames were replaced, use scene order
      frames = [...sceneFrames];
    } else {
      // All frames match, use custom order
      frames = [...presentationFrames];
    }
  }

  const canStart = frames.length > 0 && !enabled;
  const canNavigate = enabled && frames.length > 0;

  // Generate thumbnails for frames
  useEffect(() => {
    if (frames.length === 0 || enabled) {
      return;
    }

    // Sync ref with current frames - remove IDs that no longer exist
    const currentFrameIds = new Set(frames.map((f) => f.id));
    for (const id of generatedThumbnailIdsRef.current) {
      if (!currentFrameIds.has(id)) {
        generatedThumbnailIdsRef.current.delete(id);
      }
    }

    const generateThumbnails = async () => {
      const newThumbnails = new Map<string, string>();

      for (const frame of frames) {
        if (generatedThumbnailIdsRef.current.has(frame.id)) {
          continue; // Already generated
        }

        try {
          const canvas = await exportToCanvas({
            elements,
            appState: {
              ...appState,
              exportBackground: true,
              exportWithDarkMode: appState.theme === "dark",
            },
            files: null,
            exportingFrame: frame,
            maxWidthOrHeight: 120, // Small thumbnail size
            exportPadding: 0,
          });

          // Convert canvas to data URL
          const dataUrl = canvas.toDataURL("image/png");
          newThumbnails.set(frame.id, dataUrl);
          generatedThumbnailIdsRef.current.add(frame.id);
        } catch (error) {
          console.warn(
            `Failed to generate thumbnail for frame ${frame.id}:`,
            error,
          );
        }
      }

      if (newThumbnails.size > 0) {
        setThumbnails((prev) => new Map([...prev, ...newThumbnails]));
      }
    };

    generateThumbnails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, elements, appState, enabled]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      actionManager.executeAction(actionReorderFrames, "ui", {
        fromIndex: draggedIndex,
        toIndex,
      });
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="presentation-panel">
      {!enabled ? (
        <div className="presentation-panel__start">
          <p className="presentation-panel__info">
            {frames.length === 0
              ? "Create frames on your canvas to start a presentation"
              : `Ready to present ${frames.length} frame${
                  frames.length !== 1 ? "s" : ""
                }`}
          </p>
          {frames.length > 0 && (
            <div className="presentation-panel__frames-list">
              <div className="presentation-panel__frames-header">
                <strong>Slides ({frames.length})</strong>
                <span className="presentation-panel__frames-hint">
                  Drag slides to reorder
                </span>
              </div>
              <div className="presentation-panel__frames">
                {frames.map((frame, index) => (
                  <div
                    key={frame.id}
                    className={`presentation-panel__frame-item ${
                      draggedIndex === index ? "dragging" : ""
                    } ${dragOverIndex === index ? "drag-over" : ""}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="presentation-panel__frame-thumbnail">
                      {thumbnails.has(frame.id) ? (
                        <img
                          src={thumbnails.get(frame.id)}
                          alt={getFrameLikeTitle(frame)}
                          className="presentation-panel__frame-thumbnail-image"
                        />
                      ) : (
                        <div className="presentation-panel__frame-thumbnail-placeholder">
                          <span className="presentation-panel__frame-number-small">
                            {index + 1}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="presentation-panel__frame-info">
                      <span className="presentation-panel__frame-title">
                        {getFrameLikeTitle(frame)}
                      </span>
                    </div>
                    <div className="presentation-panel__frame-drag-handle">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="4" cy="4" r="1.5" fill="currentColor" />
                        <circle cx="12" cy="4" r="1.5" fill="currentColor" />
                        <circle cx="4" cy="8" r="1.5" fill="currentColor" />
                        <circle cx="12" cy="8" r="1.5" fill="currentColor" />
                        <circle cx="4" cy="12" r="1.5" fill="currentColor" />
                        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            className="presentation-panel__button presentation-panel__button--primary"
            onClick={() => actionManager.executeAction(actionStartPresentation)}
            disabled={!canStart}
          >
            Start Presentation
          </button>
        </div>
      ) : (
        <div className="presentation-panel__controls">
          <div className="presentation-panel__frame-counter">
            Frame {currentFrameIndex + 1} of {frames.length}
          </div>
          <div className="presentation-panel__navigation">
            <button
              className="presentation-panel__button"
              onClick={() => actionManager.executeAction(actionPreviousFrame)}
              disabled={!canNavigate}
              title="Previous frame (← or Shift+Space)"
            >
              ← Previous
            </button>
            <button
              className="presentation-panel__button"
              onClick={() => actionManager.executeAction(actionNextFrame)}
              disabled={!canNavigate}
              title="Next frame (→ or Space)"
            >
              Next →
            </button>
          </div>
          <button
            className="presentation-panel__button presentation-panel__button--danger"
            onClick={() => actionManager.executeAction(actionStopPresentation)}
            title="Exit presentation (Esc)"
          >
            Exit Presentation
          </button>
        </div>
      )}
      <div className="presentation-panel__hints">
        <p className="presentation-panel__hint">
          <strong>Keyboard shortcuts:</strong>
        </p>
        <ul className="presentation-panel__hint-list">
          <li>← or Shift+Space: Previous frame</li>
          <li>→ or Space: Next frame</li>
          <li>Esc: Exit presentation</li>
        </ul>
      </div>
    </div>
  );
};
