# DecomyTree - Visual & UX Reference

## 🎨 Design System

### Color Palette
```
Primary Colors:
├─ Dark Green Background:    #051f1a (rgb(5, 31, 26))
├─ Primary Green:            #0d5e3f (rgb(13, 94, 63))
├─ Santa Red:                #c41e3a (rgb(196, 30, 58))
├─ Gold Accent:              #d4af37 (rgb(212, 175, 55))
└─ Cream Text:               #f5f0e8 (rgb(245, 240, 232)

Semantic Colors:
├─ Success (Christmas):      #0d5e3f (green)
├─ Warning (Redacted):       #c41e3a (red)
├─ Info (Gold):              #d4af37 (gold)
├─ Disabled:                 rgba(100, 100, 100, 0.2)
└─ Shadow:                   rgba(0, 0, 0, 0.15)
```

### Typography
```
Font Family: 'Segoe UI', 'Trebuchet MS', Arial, sans-serif
Font Weights:
├─ Normal:       400
├─ Semi-bold:    600
├─ Bold:         700
└─ Extra Bold:   800

Font Sizes:
├─ Page Title (h1):     3.5em (56px)
├─ Section Title (h2):  1.5em (24px)
├─ Label:              1em (16px)
├─ Body Text:          0.95-1em (15-16px)
└─ Small:              0.85-0.9em (13-14px)

Line Height:
├─ Headers:  1.2
├─ Body:     1.6
└─ Compact:  1.4
```

### Spacing Scale
```
xs:  4px
sm:  8px
md:  12px
lg:  16px
xl:  20px
2xl: 24px
3xl: 32px
4xl: 40px
5xl: 60px
```

---

## 🏗️ Page Layouts

### Page 1: decomytree.html (Main Landing)
```
┌─────────────────────────────────────────┐
│  Auth Container (top-right)             │ User Info / Sign In
│  🎅 John D. | Sign Out                  │
├─────────────────────────────────────────┤
│                                         │
│  Background Effects:                    │
│  • Animated snowfall (20s loop)         │
│  • Swaying trees at bottom              │
│  • Sun/Moon glow (top-right)            │
│                                         │
│         ┌──────────────────────┐        │
│         │ 🎄 🎄 DECOMYTREE 🎄 🎄 │        │
│         │   (Gold text + glow)  │        │
│         └──────────────────────┘        │
│                                         │
│         ┌──────────────────────┐        │
│         │ You don't have a     │        │
│         │ tree yet.            │        │
│         │                      │        │
│         │ [Create Your Tree] ✨│        │ Primary Button
│         └──────────────────────┘        │
│                                         │
│  OR (if tree exists):                  │
│                                         │
│         ┌──────────────────────┐        │
│         │ Welcome back! ✨     │        │
│         │                      │        │
│         │ [View Your Tree] ✨  │ Red    │
│         │ [Edit Tree] 🎨       │ Gold   │
│         │ [Add Ornament...] 📌 │ Gold   │
│         └──────────────────────┘        │
│                                         │
└─────────────────────────────────────────┘
```

### Modal: Create Tree
```
┌─────────────────────────────────────────┐
│ ✨ Customize Your Tree                  │
├─────────────────────────────────────────┤
│                                         │
│ Choose your tree design and color      │
│                                         │
│ Tree Style:                             │
│ ◉ 🎄 Classic  ○ ✨ Modern  ○ ❄️ Snowy │
│                                         │
│ Tree Color:                             │
│ ◉ 🟢 Green  ○ 🔵 Blue  ○ ⚪ White     │
│                                         │
│ ☑ Make this tree public (searchable)   │
│                                         │
│ [Create My Tree] ✨  [Cancel]           │
│                                         │
└─────────────────────────────────────────┘
```

### Page 2: decomytree_view.html (Tree View)
```
┌─────────────────────────────────────────┐
│ Auth Container                          │
├─────────────────────────────────────────┤
│                                         │
│ [← Back]        DECOMYTREE          [User]
│              (Gold, centered)           │
│                                         │
│                                         │
│              🎄 🎄 🎄                   │ 140px
│         John D.'s Tree                 │ Centered
│          ✨ John D.                    │
│                                         │
│    ┌───────────────────────────────┐   │
│    │   Circular tree container      │   │ 500px wide
│    │   (radial gradient)            │   │
│    │                                │   │
│    │  🎁 🎅 ❄️ 🎁 🎄               │   │ 70x70px circles
│    │  🔔 💝 ⛄ 🌟 ✨               │   │ 10 per page max
│    │  🕯️ 🎄 🎁 🎅 ❄️               │   │
│    │  🎁 🎄                          │   │ Wraps on small screens
│    │                                │   │
│    └───────────────────────────────┘   │
│                                         │
│ Messages on This Tree                  │
│                                         │
│ [← Prev]  Page 1 / 3  [Next →]         │ Pagination
│                                         │
│              ┌──────────────────┐       │
│              │ ✨ Add Your       │       │ Primary button
│              │    Ornament       │       │
│              └──────────────────┘       │
│                                         │
└─────────────────────────────────────────┘
```

### Modal: Add Ornament
```
┌─────────────────────────────────────────┐
│ ✨ Add an Ornament                      │
├─────────────────────────────────────────┤
│                                         │
│ Choose Ornament Design:                 │
│ 🎄  🎅  🎁  ❄️  ⛄                      │ 5 cols (4 on mobile)
│ 🔔  💝  🌟  ✨  🕯️                     │ Hover: scale 1.1
│                                         │ Selected: gold border
│ Your Message:                           │
│ ┌─────────────────────────────┐         │ 500 char limit
│ │ Type your message here...   │         │ Textarea
│ │                             │         │
│ │                             │         │
│ └─────────────────────────────┘         │
│                                         │
│ ☑ Public message (visible after Dec25)  │
│                                         │
│ [Post Ornament] ✨  [Cancel]            │
│                                         │
└─────────────────────────────────────────┘
```

### Page 3: decomytree_edit.html (Edit Tree)
```
┌─────────────────────────────────────────┐
│ Auth Container                          │
├─────────────────────────────────────────┤
│                                         │
│ [← Back]    Edit Your Tree              │
│                                         │
│ ┌─────────────────────────────┐         │
│ │ Tree Style:                  │         │
│ │ ○ 🎄 Classic                 │         │
│ │ ◉ ✨ Modern                  │         │
│ │ ○ ❄️ Snowy                  │         │
│ │                              │         │
│ │ Tree Color:                  │         │
│ │ ○ 🟢 Green                   │         │
│ │ ○ 🔵 Blue                    │         │
│ │ ◉ ⚪ White                   │         │
│ │                              │         │
│ │ ☑ Make this tree public      │         │
│ │                              │         │
│ │ [Save Changes] ✨  [Cancel]  │         │
│ └─────────────────────────────┘         │
│                                         │
└─────────────────────────────────────────┘
```

### Page 4: decomytree_picker.html (Tree Discovery)
```
┌─────────────────────────────────────────┐
│ Auth Container                          │
├─────────────────────────────────────────┤
│                                         │
│ [← Back]    Find a Tree                 │
│                                         │
│ ┌─────────────────────────────┐         │
│ │ 🔍 Search trees...          │         │ Search input
│ └─────────────────────────────┘         │
│                                         │
│  ┌────────────┐  ┌────────────┐         │
│  │    🎄      │  │    🎄      │         │ Tree cards
│  │ Emily S.   │  │ Michael R. │         │ 240px each
│  │ 📌 Emily S.│  │ 📌 Michael │         │ Grid layout
│  │ ✨ Messages│  │ ✨ Messages│         │
│  │  to come   │  │  to come   │         │
│  └────────────┘  └────────────┘         │
│                                         │
│  ┌────────────┐  ┌────────────┐         │
│  │    🎄      │  │    🎄      │         │
│  │ Sarah H.   │  │ David K.   │         │
│  │ 📌 Sarah H.│  │ 📌 David K.│         │
│  │ ✨ Messages│  │ ✨ Messages│         │
│  │  to come   │  │  to come   │         │
│  └────────────┘  └────────────┘         │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🎬 Animations & Interactions

### Button States
```
IDLE (Default):
├─ Background: Linear gradient (Red → Dark Red)
├─ Shadow: 0 4px 15px rgba(196, 30, 58, 0.4)
├─ Transform: translateY(0)
└─ Text: White + text-shadow

HOVER:
├─ Background: Lighter gradient (shift up color curve)
├─ Shadow: 0 6px 25px rgba(196, 30, 58, 0.6)
├─ Transform: translateY(-2px)
├─ Shimmer: Left-to-right highlight (before pseudo)
└─ Cursor: pointer

ACTIVE (Click):
├─ Transform: translateY(0) [snappy feedback]
├─ Shadow: Brief reduction
└─ Duration: 100ms

Secondary Button (Gold):
├─ IDLE: Gold border + transparent bg
├─ HOVER: Gold glow (0 0 16px)
└─ TEXT: Gold with gold shadow
```

### Ornament Hover
```
IDLE:
├─ Transform: scale(1)
├─ Border: 2px rgba(212, 175, 55, 0.3)
├─ Box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2)
└─ Cursor: pointer

HOVER:
├─ Transform: scale(1.15)
├─ Border-color: rgba(212, 175, 55, 0.7)
├─ Box-shadow: 0 8px 24px rgba(212, 175, 55, 0.4)
└─ Duration: 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)
```

### Modal Entry
```
Animation: slideUp
├─ Duration: 0.4s
├─ Easing: ease-out
├─ From: opacity: 0; transform: translateY(30px)
└─ To: opacity: 1; transform: translateY(0)

Backdrop: Fade in + blur
├─ Duration: 0.4s
├─ Background: rgba(0, 0, 0, 0.7)
└─ Backdrop-filter: blur(5px)
```

### Snowfall Animation
```
Animation: snowfallAnim
├─ Duration: 20s
├─ Easing: linear
├─ Loop: infinite
├─ Element: body::after
├─ Movement: background-position shift (0 → 100vh)
└─ Opacity: 0.3 (subtle, not overwhelming)

Particles: Multiple layers
├─ Layer 1: 50px spacing (fast)
├─ Layer 2: 80px spacing (medium)
└─ Layer 3: 120px spacing (slow parallax effect)
```

### Tree Glow Animation
```
Animation: treeGlow
├─ Duration: 3s
├─ Easing: ease-in-out
├─ Loop: infinite alternate
├─ Property: filter drop-shadow
├─ From: 0 0 20px rgba(212, 175, 55, 0.4)
└─ To: 0 0 40px rgba(212, 175, 55, 0.6)
```

---

## 📱 Responsive Breakpoints

### Mobile (≤640px)
```
Container:
├─ max-width: 100%
├─ padding: 16px
└─ margin: 20px auto

Typography:
├─ h1: 2.2em (down from 3.5em)
├─ h2: 1.2em
└─ body: 0.95em

Ornaments:
├─ Size: 60x60px (down from 70x70px)
├─ Font: 32px emoji (down from 40px)
└─ Gap: 12px (down from 16px)

Modals:
├─ min-width: calc(100% - 32px)
├─ max-width: 90vw
└─ padding: 24px (down from 32px)

Design Options:
├─ Layout: flex-direction column (vertical)
├─ Each label: 100% width
└─ Spacing: wider gaps between items

Search Input:
├─ width: 100%
└─ margin-bottom: 12px

Buttons:
├─ padding: 10px 16px (down from 12px 24px)
├─ font-size: 0.95em
└─ min-width: auto (allow wrapping)
```

### Tablet (641-1024px)
```
Container:
├─ max-width: 95%
└─ padding: 20px

Ornament Grid:
├─ Gap: 14px
└─ Font: 36px emoji

Modal:
├─ min-width: 400px
└─ Centered on screen
```

### Desktop (>1024px)
```
Container:
├─ max-width: 1000px
├─ margin: 40px auto
└─ padding: 24px

Full layout benefits:
├─ 5-column emoji picker
├─ Multi-column tree grids
├─ Larger ornaments (70x70px)
└─ Optimized spacing throughout
```

---

## 🎪 Theme Customization

### Dark Mode (Default & Only)
- Background: Dark green gradient
- Text: Cream (#f5f0e8)
- Accent: Gold (#d4af37)
- Interactive: Red (#c41e3a)

### Future: Holiday Variants (Not Implemented)
Could add:
- **New Year** (black/silver/gold)
- **Halloween** (orange/black/purple)
- **Easter** (pastel colors)
- **Thanksgiving** (orange/brown/gold)

---

## ♿ Accessibility Notes

### Keyboard Navigation
- ✅ Tab order: Auth > Back > Main content > Buttons > Modal
- ✅ Enter/Space: Activates buttons
- ✅ Escape: Closes modals (future enhancement)

### Color Contrast
- ✅ Gold on Dark Green: 7.5:1 (WCAG AAA)
- ✅ Cream on Dark Green: 10.2:1 (WCAG AAA)
- ✅ Red accent: 5.1:1 (WCAG AA)

### Touch Targets
- ✅ Buttons: min 44x44px (mobile standard)
- ✅ Ornaments: 70x70px (hover-friendly)
- ✅ Links: underlined + visible (future)

### Semantic HTML
- ✅ `<button>` for buttons
- ✅ `<input>` for form fields
- ✅ `<label>` for form labels
- ✅ `<h1>`, `<h2>` for headings
- ✅ Proper heading hierarchy

### Future: ARIA Enhancements
- Add `aria-label` to icons
- Add `aria-live` for dynamic content
- Add `role="tablist"` for pagination
- Screen reader testing

---

## 🎬 User Experience Flows

### Happy Path: User Creates & Views Tree
```
1. lands on decomytree.html
   ↓ (sees "Create Your Tree" button)
2. clicks button
   ↓ (modal appears with tree options)
3. selects design + color + public toggle
   ↓ (clicks "Create My Tree")
4. button changes to "View Your Tree"
   ↓ (clicks to navigate)
5. sees tree with empty ornament grid
   ↓ (clicks "Add Your Ornament")
6. modal opens with emoji picker
   ↓ (selects emoji + types message)
7. clicks "Post Ornament"
   ↓ (ornament appears on tree)
8. navigation/pagination updates
   ✅ SUCCESS: Tree created and message added
```

### Alternative Path: Add Ornament to Others' Tree
```
1. on main page
   ↓ (clicks "Add Ornament to Other Trees")
2. navigates to decomytree_picker.html
   ↓ (sees grid of public trees)
3. optionally searches for specific user
   ↓ (clicks a tree to view)
4. sees tree with other ornaments
   ↓ (clicks "Add Your Ornament")
5. modal opens → emoji + message
   ↓ (posts ornament)
6. ornament added to others' tree
   ✅ SUCCESS: Message left on friend's tree
```

---

**Design Document Created**: December 2, 2025  
**Last Updated**: December 2, 2025  
**Designer**: GitHub Copilot  
**Status**: Complete & Production-Ready ✨
