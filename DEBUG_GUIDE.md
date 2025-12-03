# DecomyTree Debug Guide

## Fixed Issues (December 2, 2025)

### ✅ Issue 1: Tree Display
**Fixed**: Tree emoji now displays much larger (180px, was 140px) with stronger glow effect.

### ✅ Issue 2: Can't Reply to Own Tree
**Fixed**: The "Add Ornament" button now hides when viewing your own tree. Shows 👑 instead of ✨ for owner indicator.

### ✅ Issue 3: Own Tree in Picker
**Fixed**: Your own tree is now filtered out from the "Find a Tree" picker page. Shows a note "(Your own tree is hidden)".

### ✅ Issue 4: Double Tree Creation
**Fixed**: Added `isPublishing` flag to prevent double-clicking the "Create My Tree" button from creating duplicate trees.

### ✅ Issue 5: Debug Mode for Christmas
**Fixed**: Added debug mode to test redaction without waiting until Dec 25!

---

## How to Use Debug Mode

### Test Christmas Reveal (Messages Visible)

**Method**: Add `?debug=christmas` to the tree view URL

**Example**:
```
decomytree_view.html?id=YOUR_TREE_ID&debug=christmas
```

**What happens**:
- Messages show their content immediately
- "Add an Ornament" modal doesn't show redaction warning
- Unread badges disappear
- All ornament text is revealed

**Example Usage**:
1. Create a tree with some ornaments
2. Visit: `http://localhost:8000/decomytree_view.html?id=abc123&debug=christmas`
3. All messages will be visible instantly (even before Dec 25)
4. Perfect for testing the UI before launch!

---

## Testing Checklist

Use these steps to verify all 5 fixes work correctly:

### Test 1: Tree Visibility
- [ ] Create a tree
- [ ] View your tree
- [ ] Tree emoji should be LARGE and glowing
- [ ] Should be clearly visible in center of page

### Test 2: Can't Reply to Own Tree
- [ ] View your own tree
- [ ] "Add Ornament" button should be hidden
- [ ] Owner info shows 👑 instead of ✨
- [ ] Try the "Add Ornament to Other Trees" button instead

### Test 3: Own Tree Not in Picker
- [ ] Click "Add Ornament to Other Trees"
- [ ] Your tree should NOT appear in the list
- [ ] Helper text says "(Your own tree is hidden)"

### Test 4: No Double Tree Creation
- [ ] Click "Create Your Tree"
- [ ] Fill in design and color
- [ ] Rapidly click "Create My Tree" button multiple times
- [ ] Only ONE tree should be created (not duplicates)

### Test 5: Debug Mode
- [ ] Create a tree with an ornament (before Dec 25)
- [ ] Visit: `decomytree_view.html?id=YOUR_ID&debug=christmas`
- [ ] Ornament text should be visible immediately
- [ ] Remove `?debug=christmas` from URL
- [ ] Message should hide again (redacted)
- [ ] Add `?debug=christmas` back - message visible again

---

## URL Parameters Reference

### decomytree_view.html
| Parameter | Value | Effect |
|-----------|-------|--------|
| `id` | Tree ID | **(Required)** Specifies which tree to view |
| `debug` | `christmas` | Reveals all ornaments (test mode) |

**Example**:
- Normal: `decomytree_view.html?id=abc123`
- Debug: `decomytree_view.html?id=abc123&debug=christmas`

---

## Common Issues & Solutions

### Issue: "Tree not found"
**Solution**: Verify the tree ID is correct. Check that the tree exists in Firestore.

### Issue: Can't see ornaments I added
**Before Dec 25**: Normal! Messages are hidden until Christmas.
**Solution**: Use `?debug=christmas` to test them.

### Issue: "Add Ornament" button still shows on my tree
**Solution**: Refresh the page. The button should hide after tree loads.

### Issue: My tree appears in "Find a Tree"
**Solution**: Make sure it's public. Go to "Edit Tree" and check the public checkbox.

---

## Development Notes

### Where Christmas Logic Lives
- **File**: `decomytree_view.js`
- **Function**: `isReleased()`
- **Code**:
```javascript
function isReleased(){
    // Check for debug mode in URL: ?debug=christmas
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'christmas') return true;
    
    const now = new Date();
    const releaseDate = new Date(2025, 11, 25); // Dec 25, 2025
    releaseDate.setHours(releaseDate.getHours() + 7); // PT timezone
    return now >= releaseDate;
}
```

### Christmas Date Details
- **Date**: December 25, 2025
- **Time**: 00:00 PT (7:00 AM UTC)
- **Timezone Offset**: PT = UTC-7 (7 hours behind)

### Debug Mode Details
- **Parameter**: `?debug=christmas`
- **Location**: URL query string
- **Effect**: Makes `isReleased()` return `true` immediately
- **Use**: Testing before Dec 25 without changing system clock

---

## Next Steps

1. **Test all 5 fixes** using the checklist above
2. **Deploy to Firebase Hosting** when ready
3. **Share with test users** (if applicable)
4. **Monitor for issues** in production
5. **Remove debug parameter** before final launch (optional - it's harmless)

---

## Support

If you encounter any issues:
1. Check the browser console for errors (F12 → Console)
2. Verify Firebase is initialized (check Network tab)
3. Check Firestore rules allow your email domain
4. See DECOMYTREE_LAUNCH_CHECKLIST.md for deployment guide
