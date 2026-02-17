## 2025-02-17 - Disabled Button Tooltips
**Learning:** Radix UI Tooltips on disabled buttons require wrapping the button in a span with `tabIndex={0}` (when disabled) to be keyboard accessible and hoverable. The button itself should have `pointer-events-none` to ensure mouse events bubble to the wrapper.
**Action:** Use this pattern for all disabled actions that need explanation.
