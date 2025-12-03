# DecomyTree 🎄

A festive, collaborative Christmas tree web application where students can create personalized trees and leave messages (ornaments) for each other. Messages are encrypted and hidden until Christmas Day (December 25).

## Features

✨ **User Authentication**
- Mandatory Google sign-in with `@lakesideschool.org` email accounts
- Auto-generated display names (First Initial + Last Initial, e.g., "John D.")

🎄 **Tree Customization**
- Choose tree design: Classic (🎄), Modern (✨), or Snowy (❄️)
- Choose tree color: Green, Blue, or White
- Public or private trees (public trees are searchable)
- Edit tree settings at any time
- Max 1 tree per user

💬 **Ornaments (Messages)**
- Add messages to your own tree and others' public trees
- Choose from 10+ ornament designs (emojis)
- Rich text support (messages up to 500 chars)
- Public or private message options
- Pagination: 10 ornaments per page
- All messages are **redacted until December 25, 2025** (Christmas Day, PT time)

🔐 **Security**
- Firestore security rules enforce domain restrictions
- Messages hidden from non-owners before Dec 25
- Private messages only visible to tree owner after Dec 25
- Data encrypted in transit via HTTPS

📱 **Responsive Design**
- Beautiful dark/Christmas-themed interface
- Smooth animations and glassmorphism effects
- Mobile-optimized layout
- Animated background (snowflakes, sky effects)

## Project Structure

```
decomytree/
├── decomytree.html          # Main page (tree creation, view options)
├── decomytree.js            # Tree creation logic
├── decomytree.css           # Main styles (shared across all pages)
├── decomytree_view.html     # Tree viewing page
├── decomytree_view.js       # Tree viewing and ornament logic
├── decomytree_view.css      # Tree view styles
├── decomytree_edit.html     # Tree editing page
├── decomytree_edit.js       # Tree editing logic
├── decomytree_picker.html   # Public tree discovery page
├── decomytree_picker.js     # Tree picker logic
├── decomytree_picker.css    # Tree picker styles
└── FIRESTORE_SCHEMA.md      # Database schema and security rules
```

## Firestore Collections

### `trees`
Stores each user's single tree.
```
{
  ownerUid: string,
  ownerEmail: string,
  design: "classic" | "modern" | "snowy",
  color: "green" | "blue" | "white",
  public: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### `ornaments`
Stores messages placed on trees.
```
{
  treeId: string,
  emoji: string,
  text: string (up to 500 chars),
  private: boolean,
  createdBy: string (uid),
  createdByEmail: string,
  createdAt: timestamp,
  likes: number
}
```

### `comments` (Future)
Stores comments on ornaments (enabled after Dec 25).

### `shares` (Future)
Manages private tree invitations and share links.

## Setup & Installation

### 1. Prerequisites
- Node.js (for running a local server)
- Firebase project with:
  - Authentication enabled (Google provider)
  - Firestore database
  - Authorized domain: `localhost:8000` (for local testing)

### 2. Firebase Configuration

The app uses an existing Firebase project config (shared with the Halloween event pages). No additional setup needed if the project is already initialized.

To verify configuration:
1. Open `decomytree.html` in a browser
2. Check the browser console for any auth or Firestore errors
3. If you see a 404 error for Firebase config, ensure the Firebase project ID and API key are correct

### 3. Local Testing

**Using Python:**
```bash
cd path/to/mini-event
python -m http.server 8000
```

**Using Node.js (if installed):**
```bash
npx serve
```

Then open: `http://localhost:8000/decomytree.html`

### 4. Deploy to Firebase Hosting

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login and initialize:
```bash
firebase login
firebase init hosting
```

3. Deploy:
```bash
firebase deploy
```

## Usage

### Creating a Tree
1. Sign in with your Lakeside School email
2. Click "Create Your Tree"
3. Choose tree design and color
4. Choose public or private
5. Click "Create My Tree"

### Viewing Your Tree
1. From the main page, click "View Your Tree"
2. See your tree with all ornaments
3. Messages are redacted until December 25

### Adding an Ornament
1. From your tree, click "Add Your Ornament"
2. Choose ornament design (emoji)
3. Write your message (up to 500 characters)
4. Choose public or private
5. Click "Post Ornament"

**Or:**
1. From the main page, click "Add Ornament to Other Trees"
2. Browse or search for public trees
3. Click a tree to view it
4. Click "Add Your Ornament"

### Editing Your Tree
1. From the main page, click "Edit Tree"
2. Modify tree design, color, or public status
3. Click "Save Changes"

## Security & Privacy

### Before December 25, 2025
- ✅ Ornament emojis are visible
- ❌ Ornament text is **hidden** for non-owners
- 🔒 Private messages are doubly protected

### After December 25, 2025 at 00:00 PT
- ✅ Public ornament text is revealed
- ✅ Tree owner can see all messages (public and private)
- 🔒 Private messages remain hidden from non-owners
- 💬 Comments become available (future feature)

### Firestore Security Rules
All operations enforce:
- User must be authenticated with a valid Lakeside School email
- Users can only read trees they own or are public
- Users can only edit/delete their own content
- Redaction enforced at the database level

## Troubleshooting

### "Firebase 404 Error"
If you see a 404 error for Firebase webConfig:
- This is a benign warning from the Firebase SDK
- The app will still work correctly
- The error occurs because we're using module imports with an older Firebase SDK version

### "Not authenticated" after Google sign-in
- Ensure your account email ends with `@lakesideschool.org`
- Only Lakeside School emails are allowed
- Try signing out and signing back in

### "Tree not found"
- Ensure the tree ID in the URL is correct
- Verify the tree was published (check your main page)
- Check that the tree is either public or owned by you

### Messages not appearing
- For messages posted by you: wait for the page to reload
- For messages from others: they may be private or redacted until Dec 25
- Check the Firestore rules in the Firebase console

## Future Enhancements

🎯 **Planned Features (Post-MVP)**
1. Comments on ornaments (with owner badges)
2. Like buttons and counts
3. Share links for private trees
4. User invitations to private trees
5. Ornament edit/delete functionality
6. Message search and filtering
7. Unread message notifications
8. Custom ornament designs (file upload)
9. Tree preview before publishing
10. Leaderboard (most ornaments, most comments, etc.)

## Technical Stack

- **Frontend**: Vanilla JavaScript (ES6+)
- **Styling**: CSS3 (with animations, gradients, glassmorphism)
- **Backend**: Firebase (Firestore + Authentication)
- **Security**: Firestore security rules, HTTPS

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Optimizations

- Lazy loading of ornaments (pagination)
- Efficient Firestore queries with proper indexing
- CSS animations use GPU acceleration
- Responsive images and optimized assets

## License

© 2025 Lakeside School. All rights reserved.

---

**Created**: December 2025  
**Last Updated**: December 2, 2025  
**Status**: In Development (MVP Complete)
