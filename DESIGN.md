# Design System Document
 
## 1. Overview & Creative North Star: "The Digital Curator"
 
This design system transcends the "utility app" aesthetic to become a premium editorial experience. Our Creative North Star, **The Digital Curator**, reimagines the photo-management experience as a high-end gallery rather than a file folder. 
 
While the system is rooted in the familiarity of Google’s "Flow" philosophy, we elevate it through **Sophisticated Asymmetry** and **Tonal Depth**. We move away from the rigid, boxed-in "template" look by utilizing breathing room (negative space) as a structural element. The goal is a mobile web experience that feels as fluid and intentional as a physical art book—where content is framed by deep tones and luminosity rather than lines and boxes.
 
---
 
## 2. Colors: Tonal Architecture
 
Our palette is anchored in clarity, optimized for a **Dark Mode** environment. We leverage a sophisticated range of "Surfaces" to create hierarchy without clutter.
 
### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section content. Boundaries must be defined solely through background color shifts or subtle tonal transitions. Use `surface-container-low` for large sections sitting on a `surface` background to create natural separation.
 
### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Each tier represents a level of "lift" within the dark workspace:
- **Base Layer:** `surface` for the overall application background, providing a deep, immersive foundation.
- **Secondary Sections:** `surface-container-low` for grouping related content.
- **Interactive Cards:** `surface-container-lowest` to provide subtle contrast against the dark background.
 
### The "Glass & Gradient" Rule
To inject "soul" into the minimalist aesthetic:
- **Floating Elements:** Use `surface-container-lowest` with an 80% opacity and a `20px` backdrop-blur for headers or FAB backgrounds to maintain depth.
- **Signature CTAs:** Main actions should utilize a subtle linear gradient from `primary` (#1a73e8) to a slightly deeper tonal variant at a 135-degree angle. This prevents the "flat" look and adds a premium, tactile quality.
 
---
 
## 3. Typography: The Editorial Voice
 
We use a dual-font approach to balance authority with readability.
 
- **Display & Headlines (Plus Jakarta Sans):** Chosen for its wider stance and modern geometric curves. Use `display-md` and `headline-lg` to create "Editorial Moments" in the gallery view. These should feel like titles in a magazine.
- **Body & Labels (Inter):** A high-legibility sans-serif for functional text. Inter provides the precision required for metadata and UI controls.
- **Hierarchy Tip:** Use `on-surface-variant` for secondary metadata (dates, locations) to create a clear visual distinction from primary titles in `on-surface`.
 
---
 
## 4. Elevation & Depth: Tonal Layering
 
Traditional drop shadows are often too heavy. This system relies on **Ambient Light** and **Tonal Stacking** suited for dark interfaces.
 
- **The Layering Principle:** Depth is achieved by placing a `surface-container-lowest` card onto a `surface-container-low` background. This creates a "soft lift" that feels native to the screen.
- **Ambient Shadows:** For floating elements like the FAB or Search Bar, use an ultra-diffused shadow that suggests volume without becoming muddy against the dark surfaces.
- **The "Ghost Border" Fallback:** If a container lacks sufficient contrast, use the `outline-variant` token at **15% opacity**. Never use 100% opaque borders.
- **Glassmorphism:** Use semi-transparent `surface` tokens for the bottom navigation bar to allow the vibrant colors of user photos to "bleed" through, softening the interface's edges.
 
---
 
## 5. Components: Refined Primitives
 
### Floating Search Bar (The Anchor)
- **Style:** `surface-container-lowest` background, moderate (`2`) roundedness.
- **Shadow:** Ambient Shadow.
- **Interaction:** On scroll, the search bar should morph into a "Glass" state with backdrop-blur.
 
### Buttons & FABs
- **Primary FAB:** Moderately rounded (value `2`), using the Signature Gradient. Iconography must be `on-primary`.
- **Primary Button:** Moderate roundedness (value `2`). Use `primary` (#1a73e8).
- **Secondary/Tertiary:** No background. Use `primary` for text and a "Ghost Border" on hover/active states only.
 
### Cards & Gallery Grids
- **The Divider Ban:** Strictly forbid horizontal dividers between list items.
- **Geometry:** Use moderate (`2`) roundedness for photo thumbnails to ensure a structured yet sophisticated look.
- **Spacing:** Use a 16px (1rem) gutter between cards to allow the `surface` color to act as a natural separator.
 
### Chips (Filters)
- **State:** Unselected chips should be `surface-container-high` with no border. Selected chips use `primary-container` with `on-primary-container` text.
 
---
 
## 6. Do's and Don'ts
 
### Do
- **Do** prioritize vertical white space over lines. If a section feels messy, add 8px of padding rather than a divider.
- **Do** use `plusJakartaSans` for large, bold numerical displays (e.g., "1,240 Photos").
- **Do** ensure all touch targets for mobile are at least 44x44px, regardless of the visual size of the icon.
 
### Don't
- **Don't** use pure black (#000000) for backgrounds unless specified; leverage tonal surfaces for better depth. Always use `on-surface` for text to maintain a soft, premium feel.
- **Don't** use pill-shaped or maximum roundedness; the system utilizes a moderate (value `2`) corner radius for a more architectural feel.
- **Don't** use high-contrast shadows. In dark mode, shadows should be used sparingly to define "lift" rather than "distance."
- **Don't** allow high-contrast white text to vibrate against dark backgrounds; ensure `on-surface` tokens are appropriately weighted for legibility.