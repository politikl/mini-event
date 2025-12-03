// DecomyTree View JS: render tree, ornaments (redacted until Dec 25 PT), add/edit ornaments
(function(){
    function $(sel){return document.querySelector(sel)}
    function $$(sel){return document.querySelectorAll(sel)}
    function show(el){if(el)el.classList.remove('hidden')}
    function hide(el){if(el)el.classList.add('hidden')}

    // Custom notification system
    function notify(message, type = 'info', duration = 3000){
        const container = $('#notification-container');
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
    let ornaments = [];
    let selectedEmoji = '🎄';
    let selectedType = 'classic';
    let currentPage = 1;
    const ornamesPerPage = 10;

    // Check if it's after Dec 25 PT (or debug mode enabled)
    function isReleased(){
        // Check for debug mode in URL: ?debug=christmas
        const params = new URLSearchParams(window.location.search);
        if (params.get('debug') === 'christmas') return true;
        
        const now = new Date();
        const releaseDate = new Date(2025, 11, 25);
        releaseDate.setHours(releaseDate.getHours() + 7);
        return now >= releaseDate;
    }

    // Countdown timer
    function updateCountdown(){
        const countdownEl = $('#countdown-text');
        if (!countdownEl) return;
        
        const now = new Date();
        const releaseDate = new Date(2025, 11, 25);
        releaseDate.setHours(releaseDate.getHours() + 7);
        
        if (now >= releaseDate){
            countdownEl.textContent = '🎉 Christmas is here!';
            return;
        }
        
        const diff = releaseDate - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        
        countdownEl.textContent = `${days}d ${hours}h ${mins}m ${secs}s until Christmas!`;
    }

    function formatAuthorName(email){
        const local = email.split('@')[0];
        const m = local.match(/^([a-z]+)([a-z])\d*$/i);
        if (m){
            return m[1].charAt(0).toUpperCase() + m[1].slice(1) + ' ' + m[2].toUpperCase() + '.';
        }
        return local;
    }

    function getTreeEmoji(design){
        const emojis = { classic: '🎄', modern: '✨', snowy: '❄️' };
        return emojis[design] || '🎄';
    }

    async function loadTree(){
        const params = new URLSearchParams(window.location.search);
        treeId = params.get('id');
        if (!treeId){
            notify('No tree ID provided', 'error');
            setTimeout(() => window.location.href = 'decomytree.html', 2000);
            return;
        }

        try{
            // show loading state
            const treeContainer = document.querySelector('.tree-container');
            if (treeContainer) treeContainer.classList.add('loading');
            const db = window.firebaseDb;
            const treeRef = window.firebaseDoc(db, 'trees', treeId);
            const snap = await window.firebaseGetDoc(treeRef);
            if (!snap.exists()){
                notify('Tree not found', 'error');
                setTimeout(() => window.location.href = 'decomytree.html', 2000);
                return;
            }

            treeData = snap.data();
            const ownerName = formatAuthorName(treeData.ownerEmail);
            const isOwnTree = currentUser && treeData.ownerUid === (currentUser && currentUser.uid);
            const titleEl = $('#tree-title');
            const nameEl = $('#tree-name');
            const visualEl = $('#tree-visual');
            if (titleEl) titleEl.textContent = ownerName + "'s Tree";
            if (nameEl) nameEl.textContent = ownerName + "'s Tree";

            const treeEmoji = getTreeEmoji(treeData.design || 'classic');
            if (visualEl) visualEl.textContent = treeEmoji;

            // Apply customization to SVG tree layers
            try{
                const layer1 = document.getElementById('tree-layer-1');
                const layer2 = document.getElementById('tree-layer-2');
                const layer3 = document.getElementById('tree-layer-3');
                const trunk = document.getElementById('tree-trunk');
                const star = document.getElementById('tree-star');
                const color = (treeData.color || 'green');
                const design = (treeData.design || 'classic');
                const colorMap = {
                    green: ['#0d5e3f','#0b4c34','#08372a'],
                    blue: ['#1f6fa8','#195b85','#12415d'],
                    frost: ['#e6f3f7','#d9eef4','#cce9f0'],
                    emerald: ['#0f6b4d','#0c593f','#0a4632'],
                    midnight: ['#1a2a40','#122033','#0b1626']
                };
                const cols = colorMap[color] || colorMap['green'];
                if (layer1) layer1.setAttribute('fill', cols[0]);
                if (layer2) layer2.setAttribute('fill', cols[1]);
                if (layer3) layer3.setAttribute('fill', cols[2]);
                if (trunk) trunk.setAttribute('fill', design === 'modern' ? '#6b3f2b' : '#8B4513');
                if (star) star.setAttribute('fill', design === 'snowy' ? '#ffffff' : '#d4af37');
                // snowy design: add subtle white overlay on layers
                if (design === 'snowy'){
                    [layer1,layer2,layer3].forEach(l => { if (l) l.setAttribute('opacity', '0.95'); });
                }
            }catch(e){/* non-fatal if SVG not present */}
            // Apply scene theme to body for background variations
            try{
                const theme = treeData.theme || 'scene-default';
                document.body.classList.remove('scene-default','scene-colorful','scene-snowy');
                if (theme) document.body.classList.add(theme);
            }catch(e){}
            
            // Hide add button if it's user's own tree
            const addBtn = $('#add-ornament-btn');
            if (isOwnTree && addBtn) {
                addBtn.style.display = 'none';
            } else if (addBtn) {
                addBtn.style.display = '';
            }

            // Show share button only to owner
            const shareBtn = $('#share-tree-btn');
            if (shareBtn) {
                shareBtn.style.display = isOwnTree ? '' : 'none';
            }

            await loadOrnaments();
            // remove loading state
            if (treeContainer) treeContainer.classList.remove('loading');
            const loadingEl = $('#tree-loading'); if (loadingEl) loadingEl.style.display = 'none';
        }catch(e){
            console.error(e);
            notify('Failed to load tree: ' + (e.message||e), 'error');
        }
    }

    async function loadOrnaments(){
        try{
            const db = window.firebaseDb;
            const col = window.firebaseCollection(db, 'ornaments');
            const q = window.firebaseQuery(col, window.firebaseWhere('treeId','==',treeId), window.firebaseOrderBy('createdAt','desc'));
            const snap = await window.firebaseGetDocs(q);
            ornaments = [];
            snap.forEach(doc => {
                ornaments.push({id: doc.id, ...doc.data()});
            });
            currentPage = 1;
            renderOrnaments();
        }catch(e){
            console.error(e);
        }
    }

    function renderOrnaments(){
        const container = $('#ornaments-container');
        const ornamentPositions = $('#ornament-positions');
        const released = isReleased();
        const totalPages = Math.ceil(ornaments.length / ornamesPerPage);
        
        const start = (currentPage - 1) * ornamesPerPage;
        const end = start + ornamesPerPage;
        const pageOrnaments = ornaments.slice(start, end);

        $('#current-page').textContent = ornaments.length === 0 ? '0' : currentPage;
        $('#total-pages').textContent = Math.max(1, totalPages);

        // Clear previous ornaments from SVG
        if (ornamentPositions) {
            ornamentPositions.innerHTML = '';
        }

        if (ornaments.length === 0){
            const isOwnTree = currentUser && treeData && treeData.ownerUid === currentUser.uid;
            if (container) {
                if (isOwnTree){
                    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:rgba(245,240,232,0.6);padding:40px">Waiting for ornaments from friends... 🎄</div>';
                } else {
                    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:rgba(245,240,232,0.6);padding:40px">No messages yet. Be the first to add an ornament! 🎄</div>';
                }
            }
            if ($('#prev-page')) $('#prev-page').disabled = true;
            if ($('#next-page')) $('#next-page').disabled = true;
            return;
        }

        // Render ornaments on the SVG tree using fixed spots
        const spots = getFixedOrnamentSpots();
        // gather used spot indices from all ornaments to avoid collisions
        const usedIndices = new Set();
        ornaments.forEach(o => { if (o.spotIndex != null) usedIndices.add(o.spotIndex); });

        pageOrnaments.forEach((orn, idx) => {
            const isOwner = currentUser && orn.createdBy === (currentUser && currentUser.uid);
            const isPrivate = orn.private === true;
            const isTreeOwner = currentUser && treeData && treeData.ownerUid === (currentUser && currentUser.uid);
            const canRead = released || isTreeOwner || isOwner;
            // determine spot index: prefer stored spotIndex, else pick first free, else fallback
            let spotIndex = (typeof orn.spotIndex === 'number') ? orn.spotIndex : null;
            if (spotIndex == null){
                // find first free index
                for (let i = 0; i < spots.length; i++){
                    if (!usedIndices.has(i)) { spotIndex = i; break; }
                }
                if (spotIndex == null) spotIndex = idx % spots.length;
                // mark as used (not persisted yet)
                usedIndices.add(spotIndex);
            }
            const pos = spots[spotIndex] || spots[0];

            // Create ornament circle in SVG
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', pos.x);
            circle.setAttribute('cy', pos.y);
            circle.setAttribute('r', '18');
            circle.setAttribute('fill', pos.color);
            const typeClass = orn.ornamentType ? (' ' + orn.ornamentType) : '';
            circle.setAttribute('class', 'ornament-circle' + typeClass + (!released && !canRead ? ' unread' : ''));
            circle.style.cursor = 'pointer';

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', pos.x);
            text.setAttribute('y', pos.y);
            text.setAttribute('class', 'ornament-text');
            if (orn.ornamentType) text.setAttribute('data-type', orn.ornamentType);
            text.textContent = orn.emoji || '🎄';
            text.style.pointerEvents = 'none';

            circle.addEventListener('click', () => {
                if (released && canRead){
                    notify('💬 "' + orn.text + '"', 'info', 4000);
                } else if (!released){
                    notify('Message will be revealed on Christmas Day! 🎅', 'info', 3000);
                }
            });

            if (ornamentPositions) {
                ornamentPositions.appendChild(circle);
                ornamentPositions.appendChild(text);
            } else if (container) {
                // fallback: create a visual representation in the container
                const wrapper = document.createElement('div');
                wrapper.className = 'ornament-fallback';
                wrapper.style.display = 'inline-block';
                wrapper.style.margin = '6px';
                wrapper.textContent = orn.emoji || '🎄';
                container.appendChild(wrapper);
            }
        });

        // Update pagination buttons
        if ($('#prev-page')) $('#prev-page').disabled = currentPage === 1;
        if ($('#next-page')) $('#next-page').disabled = currentPage === totalPages;
    }

    // Share modal logic
    async function loadViewInvited(){
        const list = $('#view-invited-list');
        list.innerHTML = '';
        if (!treeData) return;
        const emails = Array.isArray(treeData.sharedWith) ? treeData.sharedWith : [];
        const unames = Array.isArray(treeData.sharedWithUsernames) ? treeData.sharedWithUsernames : [];

        if (emails.length === 0 && unames.length === 0){
            list.innerHTML = '<p style="color:rgba(245,240,232,0.6)">No invites yet</p>';
            return;
        }

        for (const e of emails){
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px;border-bottom:1px solid rgba(212,175,55,0.08);color:var(--cream)';
            const s = document.createElement('span'); s.textContent = e + ' (email)';
            const rem = document.createElement('button'); rem.textContent = '✕'; rem.style.cssText = 'background:transparent;color:#ff6b6b;border:none;cursor:pointer';
            rem.addEventListener('click', async () => {
                try{
                    const db = window.firebaseDb;
                    const treeRef = window.firebaseDoc(db, 'trees', treeId);
                    await window.firebaseUpdateDoc(treeRef, { sharedWith: window.firebaseArrayRemove(e), updatedAt: window.firebaseServerTimestamp() });
                    const snap = await window.firebaseGetDoc(treeRef);
                    treeData = snap.data();
                    loadViewInvited();
                    notify('✅ Removed invite', 'success');
                }catch(err){console.error(err);notify('Failed to remove invite','error');}
            });
            row.appendChild(s); row.appendChild(rem); list.appendChild(row);
        }

        for (const u of unames){
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px;border-bottom:1px solid rgba(212,175,55,0.08);color:var(--cream)';
            const s = document.createElement('span'); s.textContent = u + ' (username)';
            const rem = document.createElement('button'); rem.textContent = '✕'; rem.style.cssText = 'background:transparent;color:#ff6b6b;border:none;cursor:pointer';
            rem.addEventListener('click', async () => {
                try{
                    const db = window.firebaseDb;
                    const treeRef = window.firebaseDoc(db, 'trees', treeId);
                    await window.firebaseUpdateDoc(treeRef, { sharedWithUsernames: window.firebaseArrayRemove(u), updatedAt: window.firebaseServerTimestamp() });
                    const snap = await window.firebaseGetDoc(treeRef);
                    treeData = snap.data();
                    loadViewInvited();
                    notify('✅ Removed invite', 'success');
                }catch(err){console.error(err);notify('Failed to remove invite','error');}
            });
            row.appendChild(s); row.appendChild(rem); list.appendChild(row);
        }
    }

    // Fixed 10 ornament spots on the SVG tree (viewBox 0 0 400 500)
    function getFixedOrnamentSpots(){
        // Spots chosen visually across the three tree layers
        return [
            {x:200,y:110,color:'#ffd700'},
            {x:150,y:160,color:'#ff6347'},
            {x:250,y:160,color:'#dc143c'},
            {x:110,y:210,color:'#32cd32'},
            {x:170,y:220,color:'#ffa500'},
            {x:230,y:220,color:'#87ceeb'},
            {x:290,y:210,color:'#ff0000'},
            {x:80,y:270,color:'#cd5c5c'},
            {x:200,y:300,color:'#32cd32'},
            {x:320,y:270,color:'#ffd700'}
        ];
    }

    async function publishOrnament(){
        if (!currentUser) return notify('Not logged in', 'error');
        if (!treeData) return notify('No tree loaded', 'error');

        const text = $('#ornament-text').value.trim();
        if (!text){
            return notify('Please enter a message', 'warning');
        }

        try{
            const db = window.firebaseDb;
            const col = window.firebaseCollection(db, 'ornaments');

            // Determine a spotIndex to keep ornaments on fixed positions
            const q = window.firebaseQuery(col, window.firebaseWhere('treeId','==',treeId));
            const snap = await window.firebaseGetDocs(q);
            const used = new Set();
            snap.forEach(d => { const data = d.data(); if (typeof data.spotIndex === 'number') used.add(data.spotIndex); });
            const spots = getFixedOrnamentSpots();
            let chosenSpot = null;
            for (let i = 0; i < spots.length; i++){
                if (!used.has(i)){ chosenSpot = i; break; }
            }
            if (chosenSpot == null) chosenSpot = Math.floor(Math.random() * spots.length);

            await window.firebaseAddDoc(col, {
                treeId: treeId,
                emoji: selectedEmoji,
                text: text,
                private: !$('#ornament-public').checked,
                ornamentType: selectedType || 'classic',
                createdBy: currentUser.uid,
                createdByEmail: currentUser.email,
                createdAt: window.firebaseServerTimestamp(),
                likes: 0,
                spotIndex: chosenSpot
            });

            $('#ornament-text').value = '';
            $('#ornament-public').checked = true;
            hide($('#add-ornament-modal'));
            await loadOrnaments();
            notify('🎁 Ornament added to the tree!', 'success');
        }catch(e){
            console.error(e);
            notify('Failed to add ornament: ' + (e.message||e), 'error');
        }
    }

    function init(){
        const backBtn = $('#back-btn');
        const addBtn = $('#add-ornament-btn');
        const signOutBtn = $('#sign-out-btn');
        const publishBtn = $('#publish-ornament-btn');
        const cancelBtn = $('#cancel-ornament');
        const modal = $('#add-ornament-modal');
        const emojiPicker = $$('.ornament-picker button');
        const prevBtn = $('#prev-page');
        const nextBtn = $('#next-page');
        const shareBtn = $('#share-tree-btn');
        const shareModal = $('#share-modal');
        const viewShareInput = $('#view-share-input');
        const viewAddShare = $('#view-add-share');
        const viewCloseShare = $('#view-close-share');

        // Start countdown timer
        updateCountdown();
        setInterval(updateCountdown, 1000);

        if (backBtn) backBtn.addEventListener('click', () => {
            window.location.href = 'decomytree.html';
        });

        if (addBtn) addBtn.addEventListener('click', () => {
            show(modal);
            selectedEmoji = '🎄';
            updateEmojiPicker();
        });

        if (shareBtn) shareBtn.addEventListener('click', () => {
            show(shareModal);
            loadViewInvited();
        });

        if (viewCloseShare) viewCloseShare.addEventListener('click', () => hide(shareModal));

        if (viewAddShare) viewAddShare.addEventListener('click', async () => {
            const raw = (viewShareInput && viewShareInput.value || '').trim();
            if (!raw) return notify('Enter username or email', 'warning');
            const isEmail = raw.includes('@');
            try{
                const db = window.firebaseDb;
                const treeRef = window.firebaseDoc(db, 'trees', treeId);
                if (isEmail){
                    const email = raw.toLowerCase();
                    await window.firebaseUpdateDoc(treeRef, { sharedWith: window.firebaseArrayUnion(email), updatedAt: window.firebaseServerTimestamp() });
                } else {
                    await window.firebaseUpdateDoc(treeRef, { sharedWithUsernames: window.firebaseArrayUnion(raw), updatedAt: window.firebaseServerTimestamp() });
                }
                const snap = await window.firebaseGetDoc(treeRef);
                treeData = snap.data();
                viewShareInput.value = '';
                loadViewInvited();
                notify('✅ Invite added', 'success');
            }catch(err){console.error(err);notify('Failed to add invite','error');}
        });

        if (signOutBtn) signOutBtn.addEventListener('click', async () => {
            try{ await window.firebaseSignOut(window.firebaseAuth);}catch(e){console.error(e);}
        });

        emojiPicker.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                selectedEmoji = btn.dataset.emoji;
                selectedType = btn.dataset.type || 'classic';
                $('#selected-emoji').value = selectedEmoji;
                updateEmojiPicker();
            });
        });

        function updateEmojiPicker(){
            emojiPicker.forEach(btn => {
                if (btn.dataset.emoji === selectedEmoji){
                    btn.classList.add('selected');
                } else {
                    btn.classList.remove('selected');
                }
            });
        }

        if (publishBtn) publishBtn.addEventListener('click', publishOrnament);
        if (cancelBtn) cancelBtn.addEventListener('click', () => hide(modal));

        if (prevBtn) prevBtn.addEventListener('click', () => {
            if (currentPage > 1) { currentPage--; renderOrnaments(); }
        });

        if (nextBtn) nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(ornaments.length / ornamesPerPage);
            if (currentPage < totalPages) { currentPage++; renderOrnaments(); }
        });

        // Auth state
        if (window.firebaseOnAuthStateChanged){
            window.firebaseOnAuthStateChanged(window.firebaseAuth, async (user) => {
                if (!user){
                    currentUser = null;
                    hide($('#user-info'));
                    await loadTree();
                    return;
                }

                currentUser = user;
                show($('#user-info'));
                $('#username-display').textContent = formatAuthorName(user.email);
                await loadTree();
            });
        }
    }

    if (window.firebaseReady){
        init();
    } else {
        window.initTreeView = init;
        const iv = setInterval(()=>{
            if (window.firebaseReady){ clearInterval(iv); init(); }
        },200);
    }
})();
