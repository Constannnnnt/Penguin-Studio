## 2026-02-18 - Full Store Subscription Re-renders
**Learning:** Components rendering items from a store list (like `DraggableMaskOverlay`) cause O(N) re-renders when subscribing to the full store state, even if they are memoized. Each store update triggers a re-render for every item because the hook returns a new state object.
**Action:** Always use targeted selectors with `useShallow` (or granular selectors) in list item components to subscribe only to the specific data needed for that item.
