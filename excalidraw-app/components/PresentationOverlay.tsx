import React, { useState, useEffect } from "react";
import {
  useExcalidrawActionManager,
  useExcalidrawAppState,
} from "@excalidraw/excalidraw";

import {
  actionStopPresentation,
  actionNextFrame,
  actionPreviousFrame,
} from "@excalidraw/excalidraw/actions/actionPresentation";
import "./PresentationOverlay.scss";

export const PresentationOverlay = () => {
  const actionManager = useExcalidrawActionManager();
  const appState = useExcalidrawAppState();
  const { presentationMode } = appState;
  const { enabled, currentFrameIndex, frames } = presentationMode;
  const [isVisible, setIsVisible] = useState(true);
  const mouseTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleMouseMove = () => {
      setIsVisible(true);
      if (mouseTimerRef.current) {
        clearTimeout(mouseTimerRef.current);
      }
      mouseTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 2000);
    };

    window.addEventListener("mousemove", handleMouseMove);
    setIsVisible(true);
    mouseTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 2000);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (mouseTimerRef.current) {
        clearTimeout(mouseTimerRef.current);
      }
    };
  }, [enabled]);

  if (!enabled || frames.length === 0) {
    return null;
  }

  const canNavigate = frames.length > 0;

  return (
    <div
      className={`presentation-overlay ${isVisible ? "visible" : "hidden"}`}
      onMouseMove={() => {
        setIsVisible(true);
        if (mouseTimerRef.current) {
          clearTimeout(mouseTimerRef.current);
        }
        mouseTimerRef.current = setTimeout(() => {
          setIsVisible(false);
        }, 2000);
      }}
    >
      <div className="presentation-overlay__content">
        <button
          className="presentation-overlay__button"
          onClick={() => actionManager.executeAction(actionPreviousFrame)}
          disabled={!canNavigate}
          title="Previous frame (← or Shift+Space)"
        >
          ←
        </button>
        <div className="presentation-overlay__counter">
          {currentFrameIndex + 1} / {frames.length}
        </div>
        <button
          className="presentation-overlay__button"
          onClick={() => actionManager.executeAction(actionNextFrame)}
          disabled={!canNavigate}
          title="Next frame (→ or Space)"
        >
          →
        </button>
        <button
          className="presentation-overlay__button presentation-overlay__button--exit"
          onClick={() => actionManager.executeAction(actionStopPresentation)}
          title="Exit presentation (Esc)"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
