# Accessibility Features

This document describes the accessibility features implemented in the Interactive Object Manipulation system.

## Overview

The system follows WCAG 2.1 Level AA standards and implements comprehensive accessibility features including:

- ARIA labels and roles
- Keyboard navigation
- Screen reader announcements
- Focus management
- Semantic HTML

## Components

### ObjectsTab

**ARIA Attributes:**
- `role="list"` - Identifies the container as a list
- `aria-label="Detected objects"` - Provides context for screen readers

**Features:**
- Smooth scrolling to hovered items
- Empty state messaging for no objects

### ObjectListItem

**ARIA Attributes:**
- `role="listitem"` - Identifies each item as a list item
- `aria-label` - Descriptive label including object name, index, and confidence
- `aria-selected` - Indicates selection state
- `aria-expanded` - Indicates expansion state
- `tabindex="0"` - Makes items keyboard focusable

**Keyboard Navigation:**
- `Enter` or `Space` - Select/activate item
- `ArrowDown` - Move focus to next item
- `ArrowUp` - Move focus to previous item

**Features:**
- Focus ring styling for keyboard navigation
- Descriptive alt text for mask thumbnails
- Labeled expand/collapse buttons

### DraggableMaskOverlay

**ARIA Attributes:**
- `role="button"` - Identifies as interactive element
- `aria-label` - Descriptive label including object name and state
- `aria-grabbed` - Indicates drag state (true when dragging)
- `tabindex` - 0 when selected (focusable), -1 when not (not focusable)

**Features:**
- Descriptive alt text for mask images
- Dynamic aria-label based on selection state
- Keyboard accessible when selected

### ResizeHandles

**ARIA Attributes:**
- `role="button"` - Identifies each handle as interactive
- `aria-label` - Describes handle position (e.g., "Resize handle nw")
- `tabindex="-1"` - Not directly keyboard accessible (controlled via parent)

**Features:**
- Visual cursor changes on hover
- Proper cursor styling during resize

## Screen Reader Announcements

The system provides live announcements for key interactions:

### Selection
- "Object name selected" - When an object is selected
- "Object name deselected" - When an object is deselected

### Manipulation
- "Object name moved to new position" - After drag operation completes
- "Object name resized" - After resize operation completes
- "Object name reset to original position" - After reset operation
- "Object name hidden" - When object is hidden

### Implementation

Announcements use:
- `role="status"` - For polite announcements
- `aria-live="polite"` - Announces when screen reader is idle
- `aria-atomic="true"` - Reads entire message
- `.sr-only` class - Visually hidden but accessible to screen readers

## Keyboard Shortcuts

When a mask is selected, the following keyboard shortcuts are available:

### Movement
- `Arrow Keys` - Move mask 1 pixel in direction
- `Shift + Arrow Keys` - Move mask 10 pixels in direction

### Actions
- `R` - Reset mask to original position and size
- `Delete` or `Backspace` - Hide mask from view
- `Escape` - Deselect current mask

**Note:** Keyboard shortcuts are disabled when focus is in input fields or textareas.

## Focus Management

### Focus Indicators
- All interactive elements have visible focus indicators
- Focus ring uses `outline: 2px solid var(--ring)`
- Focus offset of 2px for clarity
- Respects `prefers-reduced-motion` for animations

### Focus Order
1. Object list items (sequential)
2. Expand/collapse buttons
3. Reset buttons (when visible)
4. Selected mask overlays

### Skip Links
The application includes skip links for keyboard navigation:
- Skip to main content
- Skip to object list

## Color Contrast

All color combinations meet WCAG AA standards:
- Normal text: Minimum 4.5:1 contrast ratio
- Large text: Minimum 3:1 contrast ratio
- UI components: Minimum 3:1 contrast ratio

### Light Mode
- Foreground on background: 16.9:1 (AAA)
- Primary foreground on primary: 15.8:1 (AAA)
- Muted foreground on background: 4.6:1 (AA)

### Dark Mode
- Foreground on background: 15.8:1 (AAA)
- Primary foreground on primary: 16.9:1 (AAA)
- Muted foreground on background: 4.7:1 (AA)

## Touch Targets

All interactive elements meet minimum touch target sizes:
- Mobile: 44x44px minimum (WCAG 2.1 Level AAA)
- Desktop: Comfortable click targets with hover states

## Reduced Motion

The system respects user preferences for reduced motion:
- `prefers-reduced-motion: reduce` - Disables animations
- Transitions reduced to 0.01ms
- Smooth scrolling disabled

## Testing

### Automated Tests
- ARIA attribute validation
- Keyboard navigation testing
- Screen reader announcement verification
- Focus management testing

### Manual Testing Checklist
- [ ] Navigate entire interface with keyboard only
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Verify focus indicators are visible
- [ ] Test with high contrast mode
- [ ] Verify with zoom at 200%
- [ ] Test with reduced motion enabled

## Browser Support

Accessibility features are tested and supported in:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/)

## Future Improvements

Potential enhancements for accessibility:
- Voice control integration
- Customizable keyboard shortcuts
- High contrast theme option
- Adjustable text size controls
- More granular screen reader verbosity settings
