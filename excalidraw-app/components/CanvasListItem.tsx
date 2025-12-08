import React, { useState } from "react";

import "./CanvasListItem.scss";

import type { Canvas } from "../data/CanvasService";

interface CanvasListItemProps {
  canvas: Canvas;
  onSelect: (canvas: Canvas) => void;
  onDelete: (canvas: Canvas) => void;
  onRename: (canvas: Canvas, newName: string) => void;
}

export const CanvasListItem: React.FC<CanvasListItemProps> = ({
  canvas,
  onSelect,
  onDelete,
  onRename,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(canvas.name);
  const [showMenu, setShowMenu] = useState(false);

  const handleRename = () => {
    if (newName.trim() && newName !== canvas.name) {
      onRename(canvas, newName.trim());
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setNewName(canvas.name);
      setIsRenaming(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return "Just now";
    }
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return date.toLocaleDateString();
  };

  return (
    <div
      className="CanvasListItem"
      onClick={() => !isRenaming && onSelect(canvas)}
    >
      <div className="CanvasListItem__thumbnail">
        {canvas.thumbnail_url ? (
          <img src={canvas.thumbnail_url} alt={canvas.name} />
        ) : (
          <div className="CanvasListItem__placeholder">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 9h6v6H9z" />
            </svg>
          </div>
        )}
      </div>

      <div className="CanvasListItem__content">
        {isRenaming ? (
          <input
            type="text"
            className="CanvasListItem__name-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <div className="CanvasListItem__name" title={canvas.name}>
            {canvas.name}
          </div>
        )}

        <div className="CanvasListItem__meta">
          <span className="CanvasListItem__date">
            {formatDate(canvas.updated_at)}
          </span>
        </div>
      </div>

      <div className="CanvasListItem__actions">
        <button
          className="CanvasListItem__menu-button"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          title="More options"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>

        {showMenu && (
          <div className="CanvasListItem__menu">
            <button
              className="CanvasListItem__menu-item"
              onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
                setShowMenu(false);
              }}
            >
              Rename
            </button>
            <button
              className="CanvasListItem__menu-item CanvasListItem__menu-item--danger"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete "${canvas.name}"?`)) {
                  onDelete(canvas);
                }
                setShowMenu(false);
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {showMenu && (
        <div
          className="CanvasListItem__menu-overlay"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
          }}
        />
      )}
    </div>
  );
};
