# Presentation Mode Documentation

## Overview

Presentation Mode allows users to create slide-based presentations using Excalidraw frames. Each frame acts as a slide, and the view smoothly transitions between them. The feature supports keyboard navigation, visual indicators, and shareable presentation links.

## Features

- **Frame-based slides**: Each frame on the canvas becomes a presentation slide
- **Smooth transitions**: Automatic scrolling and zooming between frames
- **Keyboard navigation**: Arrow keys, Space, and Escape for navigation
- **Visual indicators**: Active frame highlighting and dimming of non-active frames
- **URL sharing**: Share links that automatically start in presentation mode
- **UI controls**: Sidebar panel and overlay controls for presentation management

## Architecture

### State Management

Presentation mode state is stored in `AppState.presentationMode`:

```typescript
presentationMode: {
  enabled: boolean;              // Whether presentation mode is active
  currentFrameIndex: number;      // Index of the currently displayed frame
  frames: ExcalidrawFrameLikeElement[];  // Ordered list of frames
}
```

**Location**: `packages/excalidraw/types.ts`

### Core Components

#### 1. State & Types
- **`packages/excalidraw/types.ts`**: Defines `AppState.presentationMode` interface
- **`packages/excalidraw/appState.ts`**: Initializes default presentation mode state

#### 2. Utilities
- **`packages/excalidraw/utils/presentation.ts`**: Core presentation logic
  - `getFramesInOrder()`: Retrieves and sorts frames from the scene
  - `getNextFrameIndex()`: Calculates next frame index (with wrapping)
  - `getPreviousFrameIndex()`: Calculates previous frame index (with wrapping)

#### 3. Actions
- **`packages/excalidraw/actions/actionPresentation.ts`**: Presentation mode actions
  - `actionStartPresentation`: Initiates presentation mode
  - `actionStopPresentation`: Exits presentation mode
  - `actionNextFrame`: Navigates to next frame
  - `actionPreviousFrame`: Navigates to previous frame

#### 4. UI Components
- **`excalidraw-app/components/PresentationPanel.tsx`**: Sidebar panel for presentation controls
- **`excalidraw-app/components/PresentationOverlay.tsx`**: Full-screen overlay with navigation controls
- **`excalidraw-app/components/PresentationPanel.scss`**: Styles for presentation panel
- **`excalidraw-app/components/PresentationOverlay.scss`**: Styles for presentation overlay

#### 5. Rendering
- **`packages/excalidraw/renderer/staticScene.ts`**: Applies dimming to non-active frames during presentation
- **`packages/excalidraw/renderer/interactiveScene.ts`**: Highlights the active frame
- **`packages/excalidraw/components/App.tsx`**: Syncs presentation frames when scene changes

#### 6. Sharing
- **`excalidraw-app/share/ShareDialog.tsx`**: Share dialog with presentation option
- **`excalidraw-app/data/index.ts`**: URL generation with presentation parameter
- **`excalidraw-app/App.tsx`**: Auto-starts presentation mode from URL parameter

## Implementation Details

### Starting Presentation Mode

1. **Manual Start**: User clicks "Start Presentation" in the sidebar
   - Action: `actionStartPresentation`
   - Gets frames using `getFramesInOrder()`
   - Navigates to first frame with `scrollToContent()`
   - Updates `AppState.presentationMode.enabled = true`

2. **URL Parameter Start**: Link contains `?presentation=true`
   - Detected in `useEffect` hook in `excalidraw-app/App.tsx`
   - Waits for API and elements to be ready
   - Executes `actionStartPresentation` via actionManager
   - Falls back to manual state update if actionManager unavailable

### Frame Navigation

Navigation uses the `scrollToContent` API with these options:
```typescript
{
  fitToViewport: true,
  viewportZoomFactor: 0.9,  // Frame covers 90% of viewport
  animate: true             // Smooth transition
}
```

**Key Pattern**: Always call `scrollToContent()` BEFORE updating state. This ensures the scroll happens with the correct context.

### Visual Indicators

1. **Frame Highlighting**: 
   - Active frame is highlighted via `appState.frameToHighlight`
   - Rendered in `interactiveScene.ts` using `renderFrameHighlight()`

2. **Dimming**:
   - Non-active frames are dimmed to 30% opacity
   - Implemented in `staticScene.ts` by checking if element is in active frame
   - Uses `context.globalAlpha = 0.3` for dimming

### Frame Ordering

Frames are ordered using `getFramesInOrder()` which:
1. Gets all non-deleted frame-like elements from the scene
2. Sorts them based on position (top-to-bottom, then left-to-right)
3. Returns them in presentation order

**Note**: Frame order is determined by their position on the canvas, not creation order.

## Code Patterns

### Adding a New Presentation Action

1. **Define the action** in `packages/excalidraw/actions/actionPresentation.ts`:
```typescript
export const actionMyNewAction = register({
  name: "myNewAction",
  label: "labels.myNewAction",
  trackEvent: { category: "canvas" },
  predicate: (elements, appState, _, app) => {
    // When is this action available?
    return appState.presentationMode.enabled;
  },
  perform: (elements, appState, _, app) => {
    // What does this action do?
    return {
      elements,
      appState: {
        ...appState,
        presentationMode: {
          ...appState.presentationMode,
          // Update presentation state
        },
      },
      captureUpdate: CaptureUpdateAction.NEVER,
    };
  },
  keyTest: (event) => {
    // Optional: keyboard shortcut
    return event.key === KEYS.SOME_KEY;
  },
});
```

2. **Add to action types** in `packages/excalidraw/actions/types.ts`:
```typescript
export type ActionName =
  // ... existing actions
  | "myNewAction";
```

3. **Export from** `packages/excalidraw/actions/index.ts`:
```typescript
export { actionMyNewAction } from "./actionPresentation";
```

4. **Add translation** in `packages/excalidraw/locales/en.json`:
```json
{
  "labels": {
    "myNewAction": "My New Action"
  }
}
```

### Modifying Visual Indicators

**To change dimming opacity**:
- Edit `packages/excalidraw/renderer/staticScene.ts`
- Find the `context.globalAlpha = 0.3` line
- Adjust the value (0.0 = invisible, 1.0 = fully visible)

**To change frame highlight color**:
- Edit `packages/excalidraw/renderer/interactiveScene.ts`
- Find `renderFrameHighlight()` function
- Modify `context.strokeStyle` value

### Adding UI Controls

**Sidebar Panel** (`PresentationPanel.tsx`):
- Use `useExcalidrawActionManager()` to execute actions
- Use `useExcalidrawAppState()` to read presentation state
- Use `useExcalidrawElements()` to get scene elements

**Overlay** (`PresentationOverlay.tsx`):
- Only renders when `presentationMode.enabled === true`
- Auto-hides after 2 seconds of mouse inactivity
- Shows frame counter and navigation buttons

### Sharing Presentation Links

**To modify sharing behavior**:
1. **Share Dialog**: `excalidraw-app/share/ShareDialog.tsx`
   - Add new share options in `ShareDialogPicker` component
   - Pass `asPresentation` parameter to `onExportToBackend`

2. **URL Generation**: `excalidraw-app/data/index.ts`
   - `exportToBackend()` function adds `?presentation=true` when `asPresentation` is true
   - URL format: `https://yoursite.com/?presentation=true#json=id,key`

3. **Auto-start**: `excalidraw-app/App.tsx`
   - `useEffect` hook checks for `?presentation=true` parameter
   - Executes `actionStartPresentation` when detected

## Testing

### Manual Testing Checklist

1. **Basic Functionality**:
   - [ ] Create multiple frames on canvas
   - [ ] Start presentation mode from sidebar
   - [ ] Navigate forward/backward with arrow keys
   - [ ] Navigate with Space/Shift+Space
   - [ ] Exit with Escape key
   - [ ] Verify frame highlighting works
   - [ ] Verify non-active frames are dimmed

2. **URL Sharing**:
   - [ ] Share as regular board (should open normally)
   - [ ] Share as presentation (should auto-start)
   - [ ] Verify `?presentation=true` parameter in URL
   - [ ] Test opening shared link in new tab/window

3. **Edge Cases**:
   - [ ] Presentation with single frame
   - [ ] Presentation with many frames (10+)
   - [ ] Start presentation when no frames exist
   - [ ] Add/remove frames during presentation
   - [ ] Switch between frames rapidly

### Debugging

**Common Issues**:

1. **Presentation doesn't start from URL**:
   - Check browser console for errors
   - Verify `?presentation=true` is in URL (before `#`)
   - Check if frames exist on canvas
   - Verify `excalidrawAPI` is ready (check `useEffect` dependency)

2. **Frames not dimming**:
   - Verify `presentationMode.enabled === true` in appState
   - Check `staticScene.ts` dimming logic
   - Ensure `getContainingFrame()` is working correctly

3. **Navigation not working**:
   - Verify actions are registered in `actions/index.ts`
   - Check keyboard shortcuts aren't conflicting
   - Verify `scrollToContent` is being called

**Debug Logging**:
Add console logs in:
- `excalidraw-app/App.tsx` useEffect (presentation auto-start)
- `packages/excalidraw/actions/actionPresentation.ts` (action execution)
- `packages/excalidraw/renderer/staticScene.ts` (dimming logic)

## Future Enhancements

### Potential Features

1. **Presentation Settings**:
   - Auto-advance timer
   - Transition animations (fade, slide, etc.)
   - Loop presentation option

2. **Frame Management**:
   - Reorder frames in presentation
   - Skip/hide specific frames
   - Frame thumbnails in sidebar

3. **Presentation Controls**:
   - Fullscreen mode
   - Presenter notes
   - Remote control support

4. **Export**:
   - Export presentation as video
   - Export as PDF slides
   - Export as animated GIF

### Implementation Guidelines

When adding new features:

1. **Follow existing patterns**: Use actions for state changes, hooks for UI
2. **Update types**: Add new properties to `AppState.presentationMode` if needed
3. **Add translations**: Update all locale files (start with `en.json`)
4. **Consider performance**: Presentation mode should be smooth even with many frames
5. **Maintain backward compatibility**: Don't break existing presentation links
6. **Test edge cases**: Empty scenes, single frames, many frames, etc.

## File Reference

### Core Files
- `packages/excalidraw/types.ts` - Type definitions
- `packages/excalidraw/appState.ts` - Default state
- `packages/excalidraw/utils/presentation.ts` - Utility functions
- `packages/excalidraw/actions/actionPresentation.ts` - Actions
- `packages/excalidraw/components/App.tsx` - Frame syncing logic

### UI Files
- `excalidraw-app/components/PresentationPanel.tsx` - Sidebar panel
- `excalidraw-app/components/PresentationOverlay.tsx` - Overlay controls
- `excalidraw-app/components/PresentationPanel.scss` - Panel styles
- `excalidraw-app/components/PresentationOverlay.scss` - Overlay styles

### Rendering Files
- `packages/excalidraw/renderer/staticScene.ts` - Dimming logic
- `packages/excalidraw/renderer/interactiveScene.ts` - Highlight rendering
- `packages/excalidraw/components/canvases/StaticCanvas.tsx` - Canvas state

### Sharing Files
- `excalidraw-app/share/ShareDialog.tsx` - Share dialog
- `excalidraw-app/data/index.ts` - URL generation
- `excalidraw-app/App.tsx` - Auto-start logic

### Translation Files
- `packages/excalidraw/locales/en.json` - English translations

## Dependencies

### Internal Dependencies
- `@excalidraw/element` - Frame element types and utilities
- `@excalidraw/common` - Common utilities (KEYS, etc.)
- Excalidraw action system - For registering and executing actions

### External Dependencies
- React hooks (`useState`, `useEffect`, `useRef`)
- React context (for accessing app state and action manager)

## Notes

- Presentation mode closes the sidebar automatically when started
- Frame order is based on canvas position, not creation time
- The `frameToHighlight` state is used for both presentation and regular frame selection
- URL parameter must be in query string (`?presentation=true`), not hash
- Presentation mode state persists during navigation but resets on page reload

