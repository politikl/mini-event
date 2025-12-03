# DecomyTree Firestore Schema & Security Rules

## Database Schema

### Collection: `trees`
Stores each user's single tree (max 1 per user).

```
/trees/{treeId}
  - ownerUid: string (uid of the tree owner)
  - ownerEmail: string (email of the owner, e.g., user@lakesideschool.org)
  - title: string (name of the tree)
  - design: string (classic|modern|minimal)
  - public: boolean (true if searchable in public list)
  - createdAt: timestamp
  - updatedAt: timestamp
```

### Collection: `ornaments`
Stores messages/ornaments placed on trees.

```
/ornaments/{ornamentId}
  - treeId: string (reference to trees/{treeId})
  - emoji: string (ornament emoji/design)
  - text: string (message text, up to 500 chars)
  - private: boolean (true = only owner of tree can read after Dec 25)
  - public: boolean (true = visible to everyone after Dec 25)
  - createdBy: string (uid of who posted it)
  - createdByEmail: string (email of who posted it)
  - createdAt: timestamp
  - updatedAt: timestamp
  - likes: integer (like count)
```

### Collection: `comments`
Stores comments on ornaments (after Dec 25).

```
/comments/{commentId}
  - ornamentId: string (reference to ornaments/{ornamentId})
  - treeId: string (reference to trees/{treeId})
  - text: string (comment text)
  - createdBy: string (uid of commenter)
  - createdByEmail: string (email of commenter)
  - createdAt: timestamp
```

### Collection: `shares`
Stores private tree share links and invited users.

```
/shares/{shareId}
  - treeId: string (reference to trees/{treeId})
  - ownerUid: string (uid of tree owner)
  - shareToken: string (unique share token for link)
  - invitedUsers: array of strings (uids of invited users)
  - createdAt: timestamp
```

---

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helpers
    function isSignedIn() { return request.auth != null; }
    function userEmail() { return request.auth.token.email != null ? request.auth.token.email.toLowerCase() : ''; }
    function isLakesideEmail() { return userEmail().matches('.*@lakesideschool\\.org$'); }

    // Time gate for release (adjust timezone/offset if necessary)
    function isAfterChristmas() {
      return request.time >= timestamp("2025-12-25T07:00:00.000Z");
    }

    // ----- TREES -----
    match /trees/{treeId} {
      // Read: owner, public trees, or explicitly shared users (by email or uid)
      allow read: if isSignedIn() && isLakesideEmail() && (
        request.auth.uid == resource.data.ownerUid ||
        resource.data.public == true ||
        (resource.data.sharedWith != null && resource.data.sharedWith.contains(userEmail())) ||
        (resource.data.sharedWithUids != null && resource.data.sharedWithUids.contains(request.auth.uid))
      );

      // Create: signed-in Lakeside users may create a tree for themselves (ownerUid must match)
      allow create: if isSignedIn() && isLakesideEmail() &&
        request.resource.data.ownerUid == request.auth.uid &&
        request.resource.data.ownerEmail == userEmail();

      // Update / Delete: only owner
      allow update, delete: if isSignedIn() && request.auth.uid == resource.data.ownerUid;
    }

    // ----- ORNAMENTS -----
    match /ornaments/{ornamentId} {
      // To evaluate access, fetch the tree document referenced by this ornament
      function tree() { return get(/databases/$(database)/documents/trees/$(resource.data.treeId)); }

      // Read logic:
      // - If request is from creator or tree owner, allow read anytime
      // - Otherwise, allow read only after the release date (isAfterChristmas) if ornament is public or if tree is public
      // - Also allow read if the reader is explicitly invited to the tree (by email or uid)
      allow read: if isSignedIn() && isLakesideEmail() && (
        request.auth.uid == resource.data.createdBy ||
        request.auth.uid == tree().data.ownerUid ||
        // invited by email/uid
        (tree().data.sharedWith != null && tree().data.sharedWith.contains(userEmail())) ||
        (tree().data.sharedWithUids != null && tree().data.sharedWithUids.contains(request.auth.uid)) ||
        (
          isAfterChristmas() && (
            resource.data.private == false ||
            (tree().data.public == true)
          )
        )
      );

      // Create: only signed-in Lakeside users and createdBy must match
      allow create: if isSignedIn() && isLakesideEmail() &&
        request.resource.data.createdBy == request.auth.uid &&
        request.resource.data.createdByEmail == userEmail();

      // Update: only the ornament's creator can update
      allow update: if isSignedIn() && request.auth.uid == resource.data.createdBy;

      // Delete: ornament creator or the tree owner may delete
      allow delete: if isSignedIn() && (
        request.auth.uid == resource.data.createdBy ||
        request.auth.uid == tree().data.ownerUid
      );
    }

    // ----- COMMENTS -----
    match /comments/{commentId} {
      function ornament() { return get(/databases/$(database)/documents/ornaments/$(resource.data.ornamentId)); }
      function tree() { return get(/databases/$(database)/documents/trees/$(resource.data.treeId)); }

      // Read: only after release and if ornament/tree is public or user is owner/invitee
      allow read: if isSignedIn() && isAfterChristmas() && isLakesideEmail() && (
        ornament().data.private == false ||
        tree().data.public == true ||
        request.auth.uid == tree().data.ownerUid ||
        (tree().data.sharedWith != null && tree().data.sharedWith.contains(userEmail())) ||
        (tree().data.sharedWithUids != null && tree().data.sharedWithUids.contains(request.auth.uid))
      );

      // Create: only after release and by signed-in Lakeside user
      allow create: if isSignedIn() && isAfterChristmas() && isLakesideEmail() &&
        request.resource.data.createdBy == request.auth.uid &&
        request.resource.data.createdByEmail == userEmail();

      // Update/Delete: only the comment creator
      allow update, delete: if isSignedIn() && request.auth.uid == resource.data.createdBy;
    }

    // ----- SHARES (optional helper collection) -----
    match /shares/{shareId} {
      allow read, create, update, delete: if isSignedIn() && request.auth.uid == request.resource.data.ownerUid;
    }

    // Deny all else by default
    match /{document=**} { allow read, write: if false; }
  }
}
```

---

## Notes & Deployment

- These rules require that invited access be represented with either `sharedWith` (array of emails) or `sharedWithUids` (array of Firebase UIDs). While the UI also supports `sharedWithUsernames` for convenience, this field alone should not be relied on for security (it's client-supplied and not verified). For production security, resolve username→UID server-side or use invite-by-email/uid.
- The `isAfterChristmas()` uses a UTC timestamp for release; adjust the timestamp to the correct release instant for your timezone if necessary.
- Firestore rules cannot easily enforce "exactly one tree per user" on create; enforce that in your app logic or via a Cloud Function that cleans up duplicates.
- Before deploying, test these rules in the Firebase Rules Simulator with representative documents and auth tokens.

## Recommended Indexes

- `trees` collection: index on `public` + `createdAt` for the picker queries.
- `ornaments` collection: index on `treeId` + `createdAt` for listing ornaments by tree.

## Quick checklist to deploy

1. Paste the rules into the Firebase Console -> Firestore -> Rules, or use the `firebase deploy --only firestore:rules` workflow.
2. Run simulator tests for:
   - Anonymous user (should be denied)
   - Lakeside email user reading a public tree before/after release
   - Lakeside email user invited by email/uid reading a private tree
3. Verify client flows: create tree, invite user (email), create ornament as invited user, check visibility before/after release.

