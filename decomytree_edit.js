// DecomyTree Edit JS: load and update tree customization
(function(){
    function $(sel){return document.querySelector(sel)}
    function show(el){if(el)el.classList.remove('hidden')}
    function hide(el){if(el)el.classList.add('hidden')}

    // Custom notification system
    function notify(message, type = 'info', duration = 3000){
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        if (duration > 0){
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }
    }

    let currentUser = null;
    let treeId = null;
    let treeData = null;
    let isInitialized = false;

    function formatAuthorName(email){
        const local = email.split('@')[0];
        const m = local.match(/^([a-z]+)([a-z])\d*$/i);
        if (m){
            return m[1].charAt(0).toUpperCase() + m[1].slice(1) + ' ' + m[2].toUpperCase() + '.';
        }
        return local;
    }

    async function loadTree(){
        const params = new URLSearchParams(window.location.search);
        treeId = params.get('id');
        if (!treeId || !currentUser){
            window.location.href = 'decomytree.html';
            return;
        }

        try{
            const db = window.firebaseDb;
            const treeRef = window.firebaseDoc(db, 'trees', treeId);
            const snap = await window.firebaseGetDoc(treeRef);
            if (!snap.exists()){
                notify('Tree not found', 'error');
                setTimeout(() => window.location.href = 'decomytree.html', 2000);
                return;
            }

            treeData = snap.data();
            if (treeData.ownerUid !== currentUser.uid){
                notify('You can only edit your own tree', 'error');
                setTimeout(() => window.location.href = 'decomytree.html', 2000);
                return;
            }

            // Load current values
            const designRadios = document.querySelectorAll('input[name="design"]');
            designRadios.forEach(r => {
                r.checked = r.value === (treeData.design || 'classic');
            });

            const colorRadios = document.querySelectorAll('input[name="color"]');
            colorRadios.forEach(r => {
                r.checked = r.value === (treeData.color || 'green');
            });

            const themeRadios = document.querySelectorAll('input[name="theme"]');
            themeRadios.forEach(r => { r.checked = r.value === (treeData.theme || 'scene-default'); });

            $('#tree-public').checked = treeData.public === true;
        }catch(e){
            console.error(e);
            notify('Failed to load tree: ' + (e.message||e), 'error');
        }
    }

    function init(){
        const backBtn = $('#back-btn');
        const backViewBtn = $('#back-to-view');
        const signOutBtn = $('#sign-out-btn');
        const saveBtn = $('#save-tree-btn');
        const shareBtn = $('#share-tree-btn');
        const shareModal = $('#share-modal');
        const closeShareBtn = $('#close-share-btn');
        const addUserBtn = $('#add-user-btn');
        const shareEmail = $('#share-email');

        if (backBtn) backBtn.addEventListener('click', () => {
            window.location.href = 'decomytree.html';
        });

        if (backViewBtn) backViewBtn.addEventListener('click', () => {
            window.location.href = 'decomytree.html';
        });

        if (signOutBtn) signOutBtn.addEventListener('click', async () => {
            try{ await window.firebaseSignOut(window.firebaseAuth);}catch(e){console.error(e);}
        });

        if (shareBtn) shareBtn.addEventListener('click', () => {
            show(shareModal);
            loadInvitedUsers();
        });

        if (closeShareBtn) closeShareBtn.addEventListener('click', () => {
            hide(shareModal);
        });

        if (addUserBtn) addUserBtn.addEventListener('click', async () => {
            const raw = shareEmail.value.trim();
            if (!raw) {
                notify('Please enter a username or email', 'warning');
                return;
            }

            // Normalize
            const isEmail = raw.includes('@');
            if (isEmail) {
                const email = raw.toLowerCase();
                if (!email.endsWith('@lakesideschool.org')) {
                    notify('Only @lakesideschool.org emails are allowed', 'warning');
                    return;
                }
                if (email === (currentUser && currentUser.email)) {
                    notify('You cannot share with yourself', 'warning');
                    return;
                }

                try {
                    const db = window.firebaseDb;
                    const treeRef = window.firebaseDoc(db, 'trees', treeId);
                    await window.firebaseUpdateDoc(treeRef, {
                        sharedWith: window.firebaseArrayUnion(email),
                        updatedAt: window.firebaseServerTimestamp()
                    });
                    shareEmail.value = '';
                    notify('✅ Email added to shared list', 'success');
                    // refresh treeData
                    const snap = await window.firebaseGetDoc(treeRef);
                    treeData = snap.data();
                    loadInvitedUsers();
                } catch(e) {
                    console.error(e);
                    notify('Failed to add user: ' + (e.message||e), 'error');
                }
            } else {
                // Treat input as username (e.g., "First L"). Store in sharedWithUsernames array.
                const username = raw;
                if (username === formatAuthorName(currentUser.email)) {
                    notify('You cannot share with yourself', 'warning');
                    return;
                }
                try {
                    const db = window.firebaseDb;
                    const treeRef = window.firebaseDoc(db, 'trees', treeId);
                    await window.firebaseUpdateDoc(treeRef, {
                        sharedWithUsernames: window.firebaseArrayUnion(username),
                        updatedAt: window.firebaseServerTimestamp()
                    });
                    shareEmail.value = '';
                    notify('✅ Username added to shared list', 'success');
                    const snap = await window.firebaseGetDoc(treeRef);
                    treeData = snap.data();
                    loadInvitedUsers();
                } catch(e) {
                    console.error(e);
                    notify('Failed to add username: ' + (e.message||e), 'error');
                }
            }
        });

        if (saveBtn) saveBtn.addEventListener('click', async () => {
            if (!treeId) return notify('No tree loaded', 'error');
            const design = document.querySelector('input[name="design"]:checked').value;
            const color = document.querySelector('input[name="color"]:checked').value;
            const isPublic = $('#tree-public').checked;
            const theme = (document.querySelector('input[name="theme"]:checked') || {}).value || 'scene-default';

            try{
                const db = window.firebaseDb;
                const treeRef = window.firebaseDoc(db, 'trees', treeId);
                await window.firebaseUpdateDoc(treeRef, {
                    design, color, public: isPublic,
                    theme: theme,
                    updatedAt: window.firebaseServerTimestamp()
                });
                notify('🎄 Tree updated!', 'success');
                setTimeout(() => window.location.href = 'decomytree.html', 1500);
            }catch(e){
                console.error(e);
                notify('Failed to update tree: ' + (e.message||e), 'error');
            }
        });

        // Auth state
        if (window.firebaseOnAuthStateChanged){
            window.firebaseOnAuthStateChanged(window.firebaseAuth, async (user) => {
                if (!user){
                    currentUser = null;
                    hide($('#user-info'));
                    window.location.href = 'decomytree.html';
                    return;
                }

                currentUser = user;
                show($('#user-info'));
                $('#username-display').textContent = formatAuthorName(user.email);
                if (!isInitialized) {
                    isInitialized = true;
                    await loadTree();
                }
            });
        }
    }

    async function loadInvitedUsers(){
        const list = $('#invited-list');
        list.innerHTML = '';

        const hasEmails = treeData && Array.isArray(treeData.sharedWith) && treeData.sharedWith.length > 0;
        const hasUsernames = treeData && Array.isArray(treeData.sharedWithUsernames) && treeData.sharedWithUsernames.length > 0;

        if (!hasEmails && !hasUsernames) {
            list.innerHTML = '<p style="color:rgba(245,240,232,0.6)">No users invited yet</p>';
            return;
        }

        // Render invited emails
        if (hasEmails) {
            for (const email of treeData.sharedWith) {
                const userItem = document.createElement('div');
                userItem.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid rgba(212,175,55,0.2);color:var(--cream);font-size:0.9em';
                const nameEl = document.createElement('span');
                nameEl.textContent = email + ' (email)';
                const removeBtn = document.createElement('button');
                removeBtn.textContent = '✕';
                removeBtn.style.cssText = 'background:rgba(196,30,58,0.3);border:1px solid rgba(196,30,58,0.5);color:#ff6b6b;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:0.8em';
                removeBtn.addEventListener('click', async () => {
                    try {
                        const db = window.firebaseDb;
                        const treeRef = window.firebaseDoc(db, 'trees', treeId);
                        await window.firebaseUpdateDoc(treeRef, {
                            sharedWith: window.firebaseArrayRemove(email),
                            updatedAt: window.firebaseServerTimestamp()
                        });
                        const snap = await window.firebaseGetDoc(treeRef);
                        treeData = snap.data();
                        notify('✅ User removed', 'success');
                        loadInvitedUsers();
                    } catch(e) {
                        console.error(e);
                        notify('Failed to remove user', 'error');
                    }
                });
                userItem.appendChild(nameEl);
                userItem.appendChild(removeBtn);
                list.appendChild(userItem);
            }
        }

        // Render invited usernames
        if (hasUsernames) {
            for (const uname of treeData.sharedWithUsernames) {
                const userItem = document.createElement('div');
                userItem.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid rgba(212,175,55,0.2);color:var(--cream);font-size:0.9em';
                const nameEl = document.createElement('span');
                nameEl.textContent = uname + ' (username)';
                const removeBtn = document.createElement('button');
                removeBtn.textContent = '✕';
                removeBtn.style.cssText = 'background:rgba(196,30,58,0.3);border:1px solid rgba(196,30,58,0.5);color:#ff6b6b;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:0.8em';
                removeBtn.addEventListener('click', async () => {
                    try {
                        const db = window.firebaseDb;
                        const treeRef = window.firebaseDoc(db, 'trees', treeId);
                        await window.firebaseUpdateDoc(treeRef, {
                            sharedWithUsernames: window.firebaseArrayRemove(uname),
                            updatedAt: window.firebaseServerTimestamp()
                        });
                        const snap = await window.firebaseGetDoc(treeRef);
                        treeData = snap.data();
                        notify('✅ Username removed', 'success');
                        loadInvitedUsers();
                    } catch(e) {
                        console.error(e);
                        notify('Failed to remove username', 'error');
                    }
                });
                userItem.appendChild(nameEl);
                userItem.appendChild(removeBtn);
                list.appendChild(userItem);
            }
        }
    }

    if (window.firebaseReady){
        init();
    } else {
        window.initEditTree = init;
        const iv = setInterval(()=>{
            if (window.firebaseReady){ clearInterval(iv); init(); }
        },200);
    }
})();
