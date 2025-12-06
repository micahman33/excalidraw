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
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        ),
      );
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener(
        "MSFullscreenChange",
        handleFullscreenChange,
      );
    };
  }, []);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).mozRequestFullScreen) {
        (elem as any).mozRequestFullScreen();
      } else if ((elem as any).msRequestFullscreen) {
        (elem as any).msRequestFullscreen();
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      (document as any).mozCancelFullScreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
  };

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
          className="presentation-overlay__button"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          <span className="presentation-overlay__fullscreen-icon">
            {isFullscreen ? "⤓" : "⤢"}
          </span>
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
