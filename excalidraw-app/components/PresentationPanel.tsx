import React from "react";
import {
  useExcalidrawActionManager,
  useExcalidrawAppState,
  useExcalidrawElements,
} from "@excalidraw/excalidraw";
import { isFrameLikeElement } from "@excalidraw/element";

import {
  actionStartPresentation,
  actionStopPresentation,
  actionNextFrame,
  actionPreviousFrame,
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

  // Get frames from scene when not in presentation mode, otherwise use presentation frames
  const frames =
    enabled && presentationFrames.length > 0
      ? presentationFrames
      : elements.filter(isFrameLikeElement);

  const canStart = frames.length > 0 && !enabled;
  const canNavigate = enabled && frames.length > 0;

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
