# DecomyTree Implementation Guide

## Overview
DecomyTree is a collaborative Christmas tree messaging application built with vanilla JavaScript and Firebase. Users create personalized trees and leave ornament messages for each other, with all messages hidden and revealed on Christmas Day.

## Architecture

### Frontend Structure
```
Browser
├── decomytree.html (Main landing/tree creation hub)
│   └── decomytree.js
│   └── decomytree.css (shared styles)
├── decomytree_view.html (View your tree + add ornaments)
│   └── decomytree_view.js
│   └── decomytree_view.css
├── decomytree_edit.html (Edit tree customization)
│   └── decomytree_edit.js
├── decomytree_picker.html (Browse public trees)
│   └── decomytree_picker.js
│   └── decomytree_picker.css
└── Firebase SDK (loaded in each HTML file)
```

### Backend (Firebase)
```
Firestore Database
├── trees/{treeId}
│   └── ownerUid, ownerEmail, design, color, public, createdAt, updatedAt
├── ornaments/{ornamentId}
│   └── treeId, emoji, text, private, createdBy, createdByEmail, createdAt, likes
├── comments/{commentId} (future)
└── shares/{shareId} (future)

Authentication
└── Google Sign-In (domain restricted to @lakesideschool.org)
```

## Key Workflows

### 1. User Registration & Sign-In
**File**: `decomytree.js` (lines ~35-60)

```javascript
// Enforce @lakesideschool.org domain
const email = user.email.toLowerCase();
if (!email.endsWith('@lakesideschool.org')) {
    // Reject user
}

// Auto-derive display name from email (firstl## -> First L.)
const local = email.split('@')[0];
const match = local.match(/^([a-z]+)([a-z])\d*$/i);
// "johnl30" → "John L."
```

**What Happens:**
1. User clicks "Sign In with Google"
2. Firebase auth popup appears
3. If email doesn't end with @lakesideschool.org, user is signed out with error
4. If valid, display name is auto-generated and shown in top-right

### 2. Tree Creation
**Files**: `decomytree.html` (modal), `decomytree.js` (lines ~80-100)

```javascript
// Create new document in trees collection
await firebaseSetDoc(newRef, {
    ownerUid: currentUser.uid,
    ownerEmail: currentUser.email,
    design: "classic" | "modern" | "snowy",
    color: "green" | "blue" | "white",
    public: true | false,
    createdAt: serverTimestamp()
});
```

**User Flow:**
1. Click "Create Your Tree" button
2. Modal opens with 3 design + 3 color options
3. Toggle "Make public" checkbox (default: on)
4. Click "Create My Tree"
5. Tree document created in Firestore
6. Page updates to show "View Your Tree" and "Edit Tree" buttons

### 3. Tree Viewing & Ornament Display
**Files**: `decomytree_view.html`, `decomytree_view.js`

**Layout:**
```
┌─ Tree Visual (🎄 emoji, 140px)
├─ Tree Name ("John D.'s Tree")
├─ Owner Info ("✨ John D.")
├─ Ornaments Container (circular, 10 ornaments max per page)
│  ├─ Ornament #1 (70x70px circle, 🎁 emoji)
│  ├─ Ornament #2 (🎅 emoji)
│  └─ ... (wraps to next row)
├─ Pagination (Previous | Page 1/3 | Next)
└─ Add Ornament Button
```

**Redaction Logic (Lines ~20-30):**
```javascript
function isReleased() {
    const now = new Date();
    const releaseDate = new Date(2025, 11, 25); // Dec 25, 2025
    releaseDate.setHours(releaseDate.getHours() + 7); // PT adjustment
    return now >= releaseDate;
}

// Before Dec 25: ornaments show ❌ "Redacted" 
// After Dec 25: ornaments show ✅ message text
```

**Pagination (Lines ~70-95):**
```javascript
const ornamesPerPage = 10;
const totalPages = Math.ceil(ornaments.length / ornamesPerPage);
const start = (currentPage - 1) * ornamesPerPage;
const end = start + ornamesPerPage;
const pageOrnaments = ornaments.slice(start, end);
```

### 4. Adding Ornaments
**Files**: `decomytree_view.html` (modal), `decomytree_view.js` (lines ~110-145)

**Modal Sections:**
1. Emoji picker (10 options: 🎄, 🎅, 🎁, ❄️, ⛄, 🔔, 💝, 🌟, ✨, 🕯️)
2. Message textarea (500 char limit)
3. Public/Private toggle
4. Post button

**Firestore Write:**
```javascript
await firebaseAddDoc(col, {
    treeId: treeId,
    emoji: selectedEmoji,
    text: userMessage,
    private: !isPublic,
    createdBy: currentUser.uid,
    createdByEmail: currentUser.email,
    createdAt: serverTimestamp(),
    likes: 0
});
```

### 5. Tree Editing
**Files**: `decomytree_edit.html`, `decomytree_edit.js`

**Allowed Changes:**
- Design (classic/modern/snowy)
- Color (green/blue/white)
- Public/Private status

**Update Operation:**
```javascript
await firebaseUpdateDoc(treeRef, {
    design: newDesign,
    color: newColor,
    public: newPublic,
    updatedAt: serverTimestamp()
});
```

**Validation:**
- Only tree owner can edit
- Checked via `treeData.ownerUid !== currentUser.uid`

### 6. Tree Discovery (Picker)
**Files**: `decomytree_picker.html`, `decomytree_picker.js`

**Query:**
```javascript
const q = firebaseQuery(col, 
    firebaseWhere('public', '==', true),
    firebaseOrderBy('createdAt', 'desc')
);
```

**Search Filtering:**
```javascript
filteredTrees = allTrees.filter(t =>
    (t.ownerEmail || '').toLowerCase().includes(query) ||
    // (note: no title field, trees named after owner)
);
```

## Styling & Animations

### CSS Architecture
**Shared** (`decomytree.css`):
- Root colors (green, red, gold, cream)
- Snowfall animation (body::after)
- Button styles and hover effects
- Modal styling
- Auth container

**Page-Specific**:
- `decomytree_view.css`: Tree container, ornament items (circular, absolute positioning), pagination
- `decomytree_picker.css`: Tree cards grid layout
- Page-specific variables and layouts

### Key Animations
1. **Snowfall**: 20s linear infinite (fixed position, full viewport)
2. **Tree Glow**: 3s ease-in-out infinite alternate
3. **Ornament Hover**: scale(1.15) + border-color shift
4. **Modal Slide**: slideUp 0.4s ease-out (transform: translateY)
5. **Sway**: 4s ease-in-out infinite (background trees)

### Responsive Breakpoints
- Mobile: max-width 640px
  - Smaller fonts and padding
  - Single-column layouts
  - Smaller ornaments (60x60px instead of 70x70px)
  - Emoji picker grid 4 cols instead of 5

## Security Model

### Firestore Rules Summary
```
trees:
  ✅ Anyone can read public trees
  ✅ Only owner can edit/delete
  ✅ Create restricted to @lakesideschool.org users

ornaments:
  ✅ Before Dec 25: only owner + tree owner can read
  ✅ After Dec 25: public ornaments visible to all
  ✅ Only creator can edit/delete
  
comments (future):
  ✅ Only after Dec 25
  ✅ Deleted to/by ornament creator
```

### Data Privacy
- **In Transit**: HTTPS enforced by browser
- **At Rest**: Firestore encryption (Firebase managed)
- **Redaction**: Enforced at query time (Firestore rules) + UI layer

### Audit Trail
- All writes include `createdAt` timestamp
- Creator UID/email recorded
- No deletion logs (consider adding in future)

## Testing Checklist

### Authentication
- [ ] User without @lakesideschool.org email is rejected
- [ ] Valid user sees auto-generated display name
- [ ] Sign-out works and redirects to login

### Tree Creation
- [ ] Can create 1 tree
- [ ] Cannot create 2 trees (needs check in `loadTree`)
- [ ] Tree design/color saves correctly
- [ ] Public toggle works

### Ornament Posting
- [ ] Ornament emoji selects correctly
- [ ] Message text saves (up to 500 chars)
- [ ] Private toggle saves
- [ ] Ornament appears on tree immediately

### Tree Viewing
- [ ] Tree name shows as "Username's Tree"
- [ ] 10 ornaments per page
- [ ] Pagination next/prev buttons work
- [ ] Before Dec 25: messages redacted ✅
- [ ] After Dec 25: messages visible ✅
- [ ] Clicking ornament shows message (after Dec 25)

### Tree Discovery
- [ ] Only public trees appear in picker
- [ ] Search filters by owner name
- [ ] Clicking tree navigates to view page
- [ ] Can add ornament from picker

### Mobile Responsiveness
- [ ] All buttons tap-friendly (min 44x44px)
- [ ] Text readable on small screens
- [ ] Modals fit in viewport (90vw)
- [ ] Pagination buttons visible and usable

## Performance Considerations

### Query Optimization
- **Indexes**: Recommend Firestore index on:
  - `ornaments: treeId + createdAt (descending)`
  - `trees: public + createdAt (descending)`

### Caching
- Page loads tree data on auth state change
- Ornaments reloaded after posting
- No aggressive client-side caching (fresh data priority)

### Pagination
- 10 ornaments per page reduces DOM nodes
- For 100 ornaments: only 10 nodes rendered at once
- Page load time negligible

## Future Enhancements

### Comments on Ornaments (Post-MVP)
1. New `comments` collection
2. Comment form appears on ornament modal
3. Comments indexed by ornamentId
4. Owner badge on comments from tree owner

### Likes
1. Add `likes` counter to ornament UI
2. Track liked ornaments per user (separate collection or array)
3. Increment on click

### Share Links
1. Generate unique `shareToken` in `shares` collection
2. Private URLs: `decomytree_view.html?share=TOKEN`
3. Token-based access to private trees

### Notifications (Post-MVP)
1. Unread message counter in header
2. Red badge on ornament if new (client-side tracking)
3. Notification popup on page visit

## Deployment

### Firebase Hosting
```bash
firebase deploy --only hosting
```

### Custom Domain
1. In Firebase Console > Hosting > Settings
2. Add custom domain (e.g., decomytree.lakesideschool.org)
3. Follow DNS setup instructions

### Environment Variables
- Currently hardcoded Firebase config in HTML
- For prod: consider moving to `.env` + build step
- Config is public (API key is intended to be public for web apps)

## Common Issues & Solutions

### Issue: Firebase 404 config error
**Cause**: SDK trying to fetch project config from endpoint  
**Solution**: Harmless; app still works. Ignore or suppress in console.

### Issue: "Tree not found" after creation
**Cause**: Firestore write latency  
**Solution**: Wait a moment and refresh, or add loading state

### Issue: Messages appear blank before Dec 25
**Cause**: Intentional redaction  
**Solution**: User must wait until Dec 25 or be tree owner to see

### Issue: "You can only edit your own tree"
**Cause**: User trying to edit another's tree  
**Solution**: Only tree owners can edit. This is intentional.

---

**For questions or contributions**: Contact the development team.
