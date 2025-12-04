# Presentation Mode Development Guide

## Quick Start

### Adding a New Feature

1. **Plan the feature**: What state changes? What UI changes? What actions needed?

2. **Update types** (if needed):
   ```typescript
   // packages/excalidraw/types.ts
   presentationMode: {
     enabled: boolean;
     currentFrameIndex: number;
     frames: ExcalidrawFrameLikeElement[];
     // Add your new property here
     yourNewProperty?: YourType;
   }
   ```

3. **Update default state**:
   ```typescript
   // packages/excalidraw/appState.ts
   presentationMode: {
     enabled: false,
     currentFrameIndex: 0,
     frames: [],
     yourNewProperty: defaultValue,
   }
   ```

4. **Create/update actions**:
   ```typescript
   // packages/excalidraw/actions/actionPresentation.ts
   export const actionYourFeature = register({
     name: "yourFeature",
     label: "labels.yourFeature",
     trackEvent: { category: "canvas" },
     predicate: (elements, appState) => {
       return appState.presentationMode.enabled;
     },
     perform: (elements, appState, _, app) => {
       // Your logic here
       return {
         elements,
         appState: {
           ...appState,
           presentationMode: {
             ...appState.presentationMode,
             // Update state
           },
         },
         captureUpdate: CaptureUpdateAction.NEVER,
       };
     },
   });
   ```

5. **Add translations**:
   ```json
   // packages/excalidraw/locales/en.json
   {
     "labels": {
       "yourFeature": "Your Feature Label"
     }
   }
   ```

6. **Update UI** (if needed):
   - Add buttons/controls to `PresentationPanel.tsx` or `PresentationOverlay.tsx`
   - Use `useExcalidrawActionManager()` to execute actions
   - Use `useExcalidrawAppState()` to read state

## Code Style Guide

### Action Pattern

Always follow this pattern for presentation actions:

```typescript
export const actionExample = register({
  name: "example",
  label: "labels.example",
  trackEvent: { category: "canvas" },  // Always "canvas" for presentation
  predicate: (elements, appState, _, app) => {
    // Check if action should be available
    return appState.presentationMode.enabled && /* other conditions */;
  },
  perform: (elements, appState, _, app) => {
    // 1. Get current presentation state
    const { currentFrameIndex, frames } = appState.presentationMode;
    
    // 2. Perform navigation/scroll FIRST if needed
    if (needsScroll) {
      app.scrollToContent(target, {
        fitToViewport: true,
        viewportZoomFactor: 0.9,
        animate: true,
      });
    }
    
    // 3. Return updated state
    return {
      elements,
      appState: {
        ...appState,
        presentationMode: {
          ...appState.presentationMode,
          // Update only what changed
          currentFrameIndex: newIndex,
          frameToHighlight: newFrame,  // Always update highlight
        },
      },
      captureUpdate: CaptureUpdateAction.NEVER,  // Never capture for presentation
    };
  },
  keyTest: (event) => {
    // Optional: keyboard shortcut
    return event.key === KEYS.SOME_KEY;
  },
});
```

### State Update Pattern

**DO**:
```typescript
// Update presentation mode state
appState: {
  ...appState,
  presentationMode: {
    ...appState.presentationMode,  // Preserve existing state
    enabled: true,                 // Update only what changed
    currentFrameIndex: 0,
    frames: newFrames,
  },
  frameToHighlight: frame,  // Always set when changing frames
}
```

**DON'T**:
```typescript
// Don't replace entire presentationMode object
presentationMode: {
  enabled: true,
  currentFrameIndex: 0,
  frames: newFrames,
  // Missing other properties!
}
```

### Navigation Pattern

**Always call scrollToContent BEFORE updating state**:

```typescript
// ✅ CORRECT
const nextFrame = frames[nextIndex];
app.scrollToContent(nextFrame, {
  fitToViewport: true,
  viewportZoomFactor: 0.9,
  animate: true,
});

return {
  appState: {
    ...appState,
    presentationMode: {
      ...appState.presentationMode,
      currentFrameIndex: nextIndex,
    },
  },
};
```

```typescript
// ❌ WRONG - State update before scroll
return {
  appState: {
    presentationMode: { currentFrameIndex: nextIndex },
  },
};
// scrollToContent called after...
```

### Frame Access Pattern

**Always use getFramesInOrder for consistent ordering**:

```typescript
import { getFramesInOrder } from "../utils/presentation";

// ✅ CORRECT
const frames = getFramesInOrder(app.scene);

// ❌ WRONG - Manual filtering loses ordering
const frames = elements.filter(isFrameLikeElement);
```

## Common Tasks

### Adding a Keyboard Shortcut

1. Add `keyTest` to your action:
```typescript
keyTest: (event) => {
  return event.key === KEYS.YOUR_KEY && 
         !event.shiftKey &&  // Optional modifiers
         !event.ctrlKey &&
         !event.metaKey;
}
```

2. Import KEYS:
```typescript
import { KEYS } from "@excalidraw/common";
```

### Adding a UI Button

In `PresentationPanel.tsx` or `PresentationOverlay.tsx`:

```typescript
import { actionYourAction } from "@excalidraw/excalidraw/actions/actionPresentation";

const actionManager = useExcalidrawActionManager();

<button
  onClick={() => actionManager.executeAction(actionYourAction)}
  disabled={!canPerformAction}
>
  Your Button Label
</button>
```

### Modifying Visual Effects

**Change dimming** (`staticScene.ts`):
```typescript
// Current: 30% opacity
context.globalAlpha = 0.3;

// Make it darker: 20% opacity
context.globalAlpha = 0.2;

// Make it lighter: 50% opacity
context.globalAlpha = 0.5;
```

**Change highlight color** (`interactiveScene.ts`):
```typescript
// Current: blue
context.strokeStyle = "rgb(0,118,255)";

// Change to green
context.strokeStyle = "rgb(0,255,0)";
```

### Adding a New Share Option

1. Update `ShareDialog.tsx`:
```typescript
<div className="ShareDialog__picker__button">
  <FilledButton
    size="large"
    label={t("shareDialog.yourOption")}
    icon={YourIcon}
    onClick={async () => {
      await props.onExportToBackend(/* your options */);
      props.handleClose();
    }}
  />
</div>
```

2. Update `exportToBackend` in `data/index.ts`:
```typescript
export const exportToBackend = async (
  elements,
  appState,
  files,
  options?: { asPresentation?: boolean; yourOption?: boolean }
) => {
  // ... existing code ...
  
  if (options?.yourOption) {
    url.searchParams.set("yourParam", "true");
  }
};
```

## Testing Your Changes

### Local Testing

1. **Start dev server**:
   ```bash
   yarn start
   ```

2. **Test manually**:
   - Create frames
   - Start presentation
   - Test your new feature
   - Check console for errors

3. **Test URL sharing**:
   - Share as presentation
   - Copy URL
   - Open in incognito/private window
   - Verify auto-start works

### Type Checking

```bash
yarn test:typecheck
```

### Linting

```bash
yarn lint
```

## Troubleshooting

### Presentation doesn't start

**Check**:
1. Are frames on the canvas? (`elements.filter(isFrameLikeElement).length > 0`)
2. Is `excalidrawAPI` ready? (check `useEffect` dependencies)
3. Is URL parameter correct? (`?presentation=true` before `#`)
4. Check browser console for errors

### State not updating

**Check**:
1. Are you spreading existing state? (`...appState.presentationMode`)
2. Is `captureUpdate` set correctly? (`CaptureUpdateAction.NEVER`)
3. Is action registered? (check `actions/index.ts`)

### Visual effects not working

**Check**:
1. Is `presentationMode.enabled === true`?
2. Is `frameToHighlight` set correctly?
3. Are you checking the right frame? (compare frame IDs)
4. Check renderer files for correct logic

### Keyboard shortcuts not working

**Check**:
1. Is `keyTest` function correct?
2. Are modifiers (shift, ctrl) handled?
3. Is action registered?
4. Check for conflicts with other shortcuts

## Best Practices

1. **Always preserve state**: Use spread operator when updating `presentationMode`
2. **Scroll before state**: Call `scrollToContent` before updating state
3. **Use actions**: Don't manually update state from UI components
4. **Check predicates**: Actions should check if they're applicable
5. **Update highlights**: Always set `frameToHighlight` when changing frames
6. **Never capture updates**: Use `CaptureUpdateAction.NEVER` for presentation actions
7. **Handle edge cases**: Empty frames, single frame, many frames
8. **Add translations**: Always add i18n keys for new UI strings
9. **Test URL sharing**: Always test that shared links work
10. **Check console**: Look for warnings/errors during development

## File Modification Checklist

When adding a feature, check these files:

- [ ] `types.ts` - Add new types if needed
- [ ] `appState.ts` - Update default state
- [ ] `actionPresentation.ts` - Add/modify actions
- [ ] `actions/types.ts` - Add action name
- [ ] `actions/index.ts` - Export action
- [ ] `utils/presentation.ts` - Add utilities if needed
- [ ] `PresentationPanel.tsx` - Add UI controls
- [ ] `PresentationOverlay.tsx` - Add overlay controls (if needed)
- [ ] `staticScene.ts` - Update rendering (if needed)
- [ ] `interactiveScene.ts` - Update rendering (if needed)
- [ ] `App.tsx` - Update frame syncing (if needed)
- [ ] `locales/en.json` - Add translations
- [ ] `ShareDialog.tsx` - Add share options (if needed)

## Questions to Ask

Before implementing a feature:

1. **Does it need new state?** → Update `types.ts` and `appState.ts`
2. **Does it need an action?** → Create action in `actionPresentation.ts`
3. **Does it need UI?** → Add to `PresentationPanel` or `PresentationOverlay`
4. **Does it need rendering changes?** → Update renderer files
5. **Does it need translations?** → Add to `locales/en.json`
6. **Does it affect sharing?** → Update `ShareDialog` and `exportToBackend`
7. **Does it need keyboard shortcuts?** → Add `keyTest` to action
8. **Does it need URL parameters?** → Update auto-start logic in `App.tsx`

## Resources

- **Excalidraw Actions**: See `packages/excalidraw/actions/` for examples
- **Frame Utilities**: See `packages/excalidraw/utils/presentation.ts`
- **Rendering**: See `packages/excalidraw/renderer/` for canvas rendering
- **State Management**: See `packages/excalidraw/components/App.tsx` for state patterns

