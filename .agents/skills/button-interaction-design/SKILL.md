---
name: button-interaction-design
description: Rule for button creation and clickable elements. Always use this skill when asked to create, style, or refactor buttons or interactive UI components.
context: fork
---

# Button Interaction Design Rules

This skill enforces strict UI/UX guidelines for creating buttons and clickable elements in the application.

## Core Rule: Cursor Styling

When creating or modifying buttons, links, or any interactive elements that act as buttons (like `AlertDialogAction`, `DialogClose`, etc.):

- **MUST ALWAYS** include the `cursor-pointer` utility class (or equivalent CSS).
- This ensures that when a user hovers over an interactive element, the mouse cursor turns into a pointer (hand) icon, clearly indicating that the element is clickable.
- Even if a framework component (like shadcn/ui) is used, verify if it natively provides the pointer cursor. If not, explicitly append `cursor-pointer` to its `className`.
- In this repository, `src/app/globals.css` also provides a site-wide fallback for actionable elements. Do not rely on that fallback alone when the element is an abstracted button-like component.
- Disabled controls must not show a pointer cursor.

## Mandatory Workflow

- Before finishing a button or link related task, run the checklist in `.agents/hooks/interactive-cursor-check.md`.
- If you add a new interactive primitive, confirm whether the global fallback selector in `src/app/globals.css` already covers it.
- If it is not covered, add `cursor-pointer` explicitly or extend the shared selector deliberately.

## Implementation Example

```tsx
// ❌ BAD
<Button className="bg-blue-500 text-white">Click Me</Button>

// ✅ GOOD (If base Button doesn't have it natively)
<Button className="bg-blue-500 text-white cursor-pointer">Click Me</Button>
```

Remember: Do not rely solely on default browser behaviors for non-`<button>` elements or abstracted UI components. When in doubt, explicitly add `cursor-pointer`.
