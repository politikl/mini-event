// DecomyTree JS: auth enforcement, simple tree create/view scaffolding
(function(){
    // helpers
    function $(sel){return document.querySelector(sel)}
    function show(el){el.classList.remove('hidden')}
    function hide(el){el.classList.add('hidden')}

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
    let currentTreeId = null;
    let selectedDesign = 'classic';
    let selectedColor = 'green';

    async function enforceDomainAndSetDisplay(user){
        if (!user || !user.email) return false;
        const email = user.email.toLowerCase();
        const domain = '@lakesideschool.org';
        if (!email.endsWith(domain)){
            // not allowed
            try{ await window.firebaseSignOut(window.firebaseAuth); }catch(e){}
            notify('You must sign in with an @lakesideschool.org account.', 'error', 5000);
            return false;
        }

        // derive display name: local-part like firstl## -> First L.
        const local = email.split('@')[0];
        let display = '';
        const m = local.match(/^([a-z]+)([a-z])\d*$/i);
        if (m){
            const first = m[1];
            const lastInit = m[2];
            display = first.charAt(0).toUpperCase() + first.slice(1) + ' ' + lastInit.toUpperCase() + '.';
        } else {
            // fallback: name portion if available
            if (user.displayName){
                display = user.displayName.split(' ').slice(0,2).map(n=>n.charAt(0).toUpperCase()+n.slice(1)).join(' ');
            } else {
                display = local.charAt(0).toUpperCase() + local.slice(1);
            }
        }

        // update profile display locally (not writing to auth profile here)
        $('#username-display').textContent = display;
        return true;
    }

    async function checkUserTree(uid){
        const db = window.firebaseDb;
        const col = window.firebaseCollection(db, 'trees');
        const q = window.firebaseQuery(col, window.firebaseWhere('ownerUid','==', uid), window.firebaseLimit(1));
        const snap = await window.firebaseGetDocs(q);
        if (!snap.empty){
            const doc = snap.docs[0];
            currentTreeId = doc.id;
            return doc.data();
        }
        currentTreeId = null;
        return null;
    }

    function requireSignInUI(){
        show($('#force-signin-modal'));
        hide($('#sign-in-btn'));
        hide($('#user-info'));
    }

    function updateUIForSignedOut(){
        hide($('#user-info'));
        show($('#sign-in-btn'));
    }

    async function init(){
        const signInBtn = $('#sign-in-btn');
        const signOutBtn = $('#sign-out-btn');
        const forceSignBtn = $('#force-signin-btn');
        const createBtn = $('#create-tree-btn');
        const viewBtn = $('#view-tree-btn');
        const addOrnBtn = $('#add-ornament-btn');
        const editBtn = $('#edit-tree-btn');
        const createModal = $('#create-tree-modal');
        const publishBtn = $('#publish-tree-btn');
        const cancelCreate = $('#cancel-create-tree');

        function openCreateModal(){ show(createModal); }
        function closeCreateModal(){ hide(createModal); }

        signInBtn && signInBtn.addEventListener('click', async ()=>{
            try{
                await window.firebaseSignInWithPopup(window.firebaseAuth, window.googleProvider);
            }catch(e){console.error(e);notify('Sign-in failed: '+(e.message||e), 'error');}
        });

        forceSignBtn && forceSignBtn.addEventListener('click', async ()=>{
            try{ await window.firebaseSignInWithPopup(window.firebaseAuth, window.googleProvider); }catch(e){console.error(e);notify('Sign-in failed', 'error');}
        });

        signOutBtn && signOutBtn.addEventListener('click', async ()=>{
            try{ await window.firebaseSignOut(window.firebaseAuth);}catch(e){console.error(e);}        
        });

        createBtn && createBtn.addEventListener('click', openCreateModal);
        cancelCreate && cancelCreate.addEventListener('click', closeCreateModal);

        viewBtn && viewBtn.addEventListener('click', ()=>{
            if (currentTreeId){
                // TODO: open tree viewer page
                window.location.href = `decomytree_view.html?id=${currentTreeId}`;
            }
        });

        addOrnBtn && addOrnBtn.addEventListener('click', ()=>{
            window.location.href = 'decomytree_picker.html';
        });

        editBtn && editBtn.addEventListener('click', () => {
            if (currentTreeId){
                window.location.href = `decomytree_edit.html?id=${currentTreeId}`;
            }
        });

        let isPublishing = false;
        publishBtn && publishBtn.addEventListener('click', async ()=>{
            if (isPublishing) return; // Prevent double submission
            isPublishing = true;
            const design = document.querySelector('input[name="design"]:checked').value;
            const color = document.querySelector('input[name="color"]:checked').value;
            const theme = (document.querySelector('input[name="theme"]:checked') || {}).value || 'scene-default';
            const isPublic = !!$('#tree-public').checked;
            if (!currentUser) return notify('No user', 'error');
            try{
                const db = window.firebaseDb;
                const col = window.firebaseCollection(db, 'trees');
                const newRef = window.firebaseDoc(col); // auto-id
                await window.firebaseSetDoc(newRef, {
                    ownerUid: currentUser.uid,
                    ownerEmail: currentUser.email,
                    design, color, public: !!isPublic,
                    theme: theme,
                    createdAt: window.firebaseServerTimestamp()
                });
                currentTreeId = newRef.id;
                closeCreateModal();
                show($('#has-tree'));
                hide($('#no-tree'));
                notify('🎄 Tree created! Welcome to your DecomyTree!', 'success');
            }catch(e){console.error(e);notify('Publish failed: '+(e.message||e), 'error');}
            finally { isPublishing = false; }
        });

        // auth state
        if (window.firebaseOnAuthStateChanged){
            window.firebaseOnAuthStateChanged(window.firebaseAuth, async (user)=>{
                if (!user){
                    currentUser = null;
                    updateUIForSignedOut();
                    requireSignInUI();
                    return;
                }

                // enforce domain
                const ok = await enforceDomainAndSetDisplay(user);
                if (!ok) return requireSignInUI();

                currentUser = user;
                hide($('#force-signin-modal'));
                show($('#user-info'));
                hide($('#sign-in-btn'));

                // check if user already has a tree
                const tree = await checkUserTree(user.uid);
                if (tree){
                    show($('#has-tree'));
                    hide($('#no-tree'));
                } else {
                    show($('#no-tree'));
                    hide($('#has-tree'));
                }
            });
        }
    }

    // Initialize when ready
    if (window.firebaseReady){
        init();
    } else {
        // allow the firebase module to call window.initDecomyTree if necessary
        window.initDecomyTree = init;
        // also retry in case firebaseReady becomes true later
        const iv = setInterval(()=>{
            if (window.firebaseReady){ clearInterval(iv); init(); }
        },200);
    }

})();
