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

    // Render tree based on design style
    function renderTreeDesign(design, color, star){
        const treeDesignGroup = document.getElementById('tree-design');
        const trunk = document.getElementById('tree-trunk');
        const topDecorationGroup = document.getElementById('tree-top-decoration');
        
        if (!treeDesignGroup) return;
        
        treeDesignGroup.innerHTML = ''; // Clear previous tree
        
        const colorMap = {
            green: ['#0d5e3f','#0b4c34','#08372a'],
            blue: ['#1f6fa8','#195b85','#12415d'],
            frost: ['#e6f3f7','#d9eef4','#cce9f0'],
            emerald: ['#0f6b4d','#0c593f','#0a4632'],
            midnight: ['#1a2a40','#122033','#0b1626'],
            forest: ['#1a4d2e','#0d3a1a','#052610'],
            gold: ['#d4a017','#b8860b','#8b6914'],
            silver: ['#c0c0c0','#a8a9ad','#808080'],
            purple: ['#4b0082','#663399','#8a2be2'],
            ruby: ['#8b0000','#c41e3a','#e31937'],
            copper: ['#b87333','#996633','#7a6333'],
            jade: ['#00a86b','#228b22','#0d5d2d']
        };
        const cols = colorMap[color] || colorMap['green'];
        
        if (design === 'classic') {
            // Classic simple triangles
            const layer1 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            layer1.setAttribute('points', '200,80 80,200 320,200');
            layer1.setAttribute('fill', cols[0]);
            layer1.setAttribute('opacity', '1');
            
            const layer2 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            layer2.setAttribute('points', '200,160 60,280 340,280');
            layer2.setAttribute('fill', cols[1]);
            layer2.setAttribute('opacity', '1');
            
            const layer3 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            layer3.setAttribute('points', '200,240 40,360 360,360');
            layer3.setAttribute('fill', cols[2]);
            layer3.setAttribute('opacity', '1');
            
            treeDesignGroup.appendChild(layer1);
            treeDesignGroup.appendChild(layer2);
            treeDesignGroup.appendChild(layer3);
        } 
        else if (design === 'modern') {
            // Modern design: overlapping circles/rounded shapes
            for (let i = 0; i < 4; i++) {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', '200');
                circle.setAttribute('cy', 120 + i * 70);
                circle.setAttribute('r', 60 + i * 15);
                circle.setAttribute('fill', cols[i % cols.length]);
                circle.setAttribute('opacity', '0.9');
                treeDesignGroup.appendChild(circle);
            }
        } 
        else if (design === 'snowy') {
            // Snowy design: more complex shape with details
            const layer1 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            layer1.setAttribute('points', '200,60 60,170 140,170 100,220 180,220 120,280 200,240 280,280 220,220 300,170 260,170');
            layer1.setAttribute('fill', cols[0]);
            layer1.setAttribute('opacity', '0.95');
            
            const layer2 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            layer2.setAttribute('points', '200,150 40,280 140,280 80,340 180,340 90,400 200,350 310,400 220,340 320,280 260,280');
            layer2.setAttribute('fill', cols[1]);
            layer2.setAttribute('opacity', '0.92');
            
            treeDesignGroup.appendChild(layer1);
            treeDesignGroup.appendChild(layer2);
        }
        else if (design === 'tall') {
            // Tall and slim design
            const layer1 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            layer1.setAttribute('points', '200,70 120,150 280,150');
            layer1.setAttribute('fill', cols[0]);
            layer1.setAttribute('opacity', '1');
            
            const layer2 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            layer2.setAttribute('points', '200,140 90,240 310,240');
            layer2.setAttribute('fill', cols[1]);
            layer2.setAttribute('opacity', '1');
            
            const layer3 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            layer3.setAttribute('points', '200,210 60,340 340,340');
            layer3.setAttribute('fill', cols[2]);
            layer3.setAttribute('opacity', '1');
            
            treeDesignGroup.appendChild(layer1);
            treeDesignGroup.appendChild(layer2);
            treeDesignGroup.appendChild(layer3);
        }
        else if (design === 'bushy') {
            // Bushy design with wider base
            const layer1 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            layer1.setAttribute('points', '200,80 50,180 350,180');
            layer1.setAttribute('fill', cols[0]);
            layer1.setAttribute('opacity', '1');
            
            const layer2 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            layer2.setAttribute('points', '200,150 20,290 380,290');
            layer2.setAttribute('fill', cols[1]);
            layer2.setAttribute('opacity', '1');
            
            const layer3 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            layer3.setAttribute('points', '200,240 10,380 390,380');
            layer3.setAttribute('fill', cols[2]);
            layer3.setAttribute('opacity', '1');
            
            treeDesignGroup.appendChild(layer1);
            treeDesignGroup.appendChild(layer2);
            treeDesignGroup.appendChild(layer3);
        }
        else if (design === 'round') {
            // Round/ball-shaped tree
            for (let i = 0; i < 3; i++) {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', '200');
                circle.setAttribute('cy', 130 + i * 80);
                circle.setAttribute('r', 70 - i * 10);
                circle.setAttribute('fill', cols[i]);
                circle.setAttribute('opacity', '0.95');
                treeDesignGroup.appendChild(circle);
            }
        }
        else if (design === 'zigzag') {
            // Zigzag/staircase pattern
            const points = [
                ['200,60 100,140 300,140'],
                ['200,135 70,220 330,220'],
                ['200,220 40,310 360,310']
            ];
            
            points.forEach((point, i) => {
                const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                polygon.setAttribute('points', point);
                polygon.setAttribute('fill', cols[i % cols.length]);
                polygon.setAttribute('opacity', '1');
                treeDesignGroup.appendChild(polygon);
            });
        }
        
        // Update trunk color based on design
        if (trunk) {
            trunk.setAttribute('fill', design === 'modern' ? '#6b3f2b' : '#8B4513');
        }
        
        // Update star/top decoration
        if (topDecorationGroup) {
            topDecorationGroup.innerHTML = '';
            
            // Create SVG text element for the star
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', '200');
            text.setAttribute('y', '50');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'central');
            text.setAttribute('font-size', '40');
            text.style.pointerEvents = 'none';
            
            // Map star preferences to emojis
            const starMap = {
                'star': '⭐',
                'gold-star': '🌟',
                'angel': '👼',
                'snowflake': '❄️',
                'sparkle': '✨',
                'bow': '🎀',
                'crown': '👑',
                'ornament': '🔴',
                'flame': '🔥'
            };
            
            text.textContent = starMap[star] || '⭐';
            topDecorationGroup.appendChild(text);
        }
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
            
            // Title will be set after ornaments load with count
            if (titleEl) titleEl.textContent = ownerName + "'s Tree";
            if (nameEl) nameEl.textContent = ownerName + "'s Tree";

            const treeEmoji = getTreeEmoji(treeData.design || 'classic');
            if (visualEl) visualEl.textContent = treeEmoji;

            // Apply customization to SVG tree layers
            try{
                const color = (treeData.color || 'green');
                const design = (treeData.design || 'classic');
                const star = (treeData.star || 'star');
                
                // Render tree design
                renderTreeDesign(design, color, star);
            }catch(e){/* non-fatal if SVG not present */}
            // Apply scene theme to body for background variations
            try{
                const theme = treeData.theme || 'scene-default';
                document.body.classList.remove('scene-default','scene-colorful','scene-snowy','scene-aurora','scene-sunset','scene-midnight','scene-forest','scene-cosmic');
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
            
            // Setup tree interactions
            setupTreeInteractions();
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
            
            // Update title with ornament count
            if (treeData) {
                const ownerName = formatAuthorName(treeData.ownerEmail);
                const ornamentCount = ornaments.length > 0 ? ` (${ornaments.length} ornament${ornaments.length === 1 ? '' : 's'})` : '';
                const titleEl = $('#tree-title');
                const nameEl = $('#tree-name');
                if (titleEl) titleEl.textContent = ownerName + "'s Tree" + ornamentCount;
                if (nameEl) nameEl.textContent = ownerName + "'s Tree" + ornamentCount;
            }
            
            renderOrnaments();
        }catch(e){
            console.error(e);
        }
    }

    // Display ornament in modal with handwriting style
    function displayOrnamentModal(ornament){
        const modal = $('#ornament-display-modal');
        const emojiEl = $('#ornament-emoji-display');
        const textEl = $('#ornament-text-display');
        const authorEl = $('#ornament-author-display');
        const privacyControls = $('#ornament-privacy-controls');
        const togglePrivacyBtn = $('#toggle-privacy-btn');
        
        if (emojiEl) emojiEl.textContent = ornament.emoji || '🎄';
        if (textEl) textEl.textContent = ornament.text || '';
        if (authorEl) {
            const author = formatAuthorName(ornament.createdByEmail || 'Anonymous');
            authorEl.textContent = '— ' + author;
        }
        
        // Mark as read by tree owner if they're viewing it
        if (currentUser && treeData && treeData.ownerUid === currentUser.uid && ornament.ownerHasRead !== true) {
            markOrnamentAsReadByOwner(ornament);
        }
        
        // Show privacy controls only if user owns the tree
        if (privacyControls && currentUser && treeData && treeData.ownerUid === currentUser.uid) {
            show(privacyControls);
            
            // Update button text based on current privacy state
            if (togglePrivacyBtn) {
                const isPrivate = ornament.private === true;
                togglePrivacyBtn.textContent = isPrivate ? '🔓 Make Public' : '🔒 Make Private';
                
                // Remove previous click handler if any
                const newBtn = togglePrivacyBtn.cloneNode(true);
                togglePrivacyBtn.parentNode.replaceChild(newBtn, togglePrivacyBtn);
                
                // Add new click handler
                newBtn.addEventListener('click', async () => {
                    await toggleOrnamentPrivacy(ornament);
                });
            }
        } else if (privacyControls) {
            hide(privacyControls);
        }
        
        show(modal);
    }

    // Mark ornament as read by tree owner
    async function markOrnamentAsReadByOwner(ornament){
        try {
            const db = window.firebaseDb;
            const ornRef = window.firebaseDoc(db, 'ornaments', ornament.id);
            await window.firebaseUpdateDoc(ornRef, { ownerHasRead: true });
            ornament.ownerHasRead = true;
        } catch (e) {
            console.error('Error marking ornament as read:', e);
        }
    }

    // Toggle ornament privacy status
    async function toggleOrnamentPrivacy(ornament){
        if (!currentUser || !treeData || treeData.ownerUid !== currentUser.uid) {
            notify('Only tree owner can change message privacy', 'error');
            return;
        }
        
        if (ornament.private === true) {
            // Cannot publicize private messages
            notify('Private messages cannot be made public', 'warning');
            return;
        }
        
        try {
            const db = window.firebaseDb;
            const ornRef = window.firebaseDoc(db, 'ornaments', ornament.id);
            await window.firebaseUpdateDoc(ornRef, { private: true });
            
            // Update local ornament data
            ornament.private = true;
            
            // Update button
            const togglePrivacyBtn = $('#toggle-privacy-btn');
            if (togglePrivacyBtn) {
                togglePrivacyBtn.textContent = '🔓 Make Public';
            }
            
            notify('✅ Message marked as private', 'success');
        } catch (e) {
            console.error(e);
            notify('Failed to update message privacy', 'error');
        }
    }

    // Play Santa riding across screen animation
    function playSantaAnimation(){
        // Create Santa element
        const santa = document.createElement('div');
        santa.className = 'christmas-santa';
        santa.textContent = '🎅';
        document.body.appendChild(santa);
        
        // Remove after animation completes
        setTimeout(() => {
            santa.remove();
        }, 8000);
    }

    function setupTreeInteractions(){
        const treeSvg = document.getElementById('tree-svg');
        if (!treeSvg) return;
        
        treeSvg.addEventListener('click', function() {
            // Shake the tree
            treeSvg.classList.add('tree-shake');
            
            // Create falling decorations (leaves or snow based on theme)
            const theme = document.body.className;
            const isSnowy = theme.includes('snowy');
            
            // Trigger ornament sway animations
            const ornaments = document.querySelectorAll('.ornament-circle');
            ornaments.forEach(orn => {
                orn.classList.add('tree-impact-sway');
            });
            
            // Drop particles
            for (let i = 0; i < 8; i++) {
                const particle = document.createElement('div');
                particle.className = isSnowy ? 'falling-snow' : 'falling-leaf';
                
                // Random position around tree
                const x = 200 + (Math.random() - 0.5) * 200;
                const y = 100 + Math.random() * 200;
                
                particle.style.left = x + 'px';
                particle.style.top = y + 'px';
                particle.style.fontSize = (Math.random() * 20 + 16) + 'px';
                particle.style.position = 'fixed';
                particle.style.pointerEvents = 'none';
                particle.style.zIndex = '5';
                
                particle.textContent = isSnowy ? '❄️' : '🍂';
                
                document.body.appendChild(particle);
                
                // Animate falling
                setTimeout(() => {
                    particle.classList.add('falling');
                }, 10);
                
                // Remove after animation
                setTimeout(() => {
                    particle.remove();
                }, 2000);
            }
            
            // Remove shake class after animation
            setTimeout(() => {
                treeSvg.classList.remove('tree-shake');
                ornaments.forEach(orn => {
                    orn.classList.remove('tree-impact-sway');
                });
            }, 500);
        });
    }

    function renderOrnaments(){
        const container = $('#ornaments-container');
        const ornamentPositions = $('#ornament-positions');
        const released = isReleased();
        const totalPages = Math.max(1, Math.ceil(ornaments.length / ornamesPerPage));
        
        const start = (currentPage - 1) * ornamesPerPage;
        const end = start + ornamesPerPage;
        const pageOrnaments = ornaments.slice(start, end);

        $('#current-page').textContent = ornaments.length === 0 ? '0' : currentPage;
        $('#total-pages').textContent = ornaments.length === 0 ? '0' : totalPages;

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
            const isOwnerPublic = orn.ownerHasRead === true && orn.private !== true;
            const canRead = released && (isTreeOwner || isOwner || isOwnerPublic);
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
                    displayOrnamentModal(orn);
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
        const ornamentDisplayModal = $('#ornament-display-modal');
        const closeOrnamentBtn = $('#close-ornament-display');

        // Setup ornament modal close
        if (closeOrnamentBtn) {
            closeOrnamentBtn.addEventListener('click', () => hide(ornamentDisplayModal));
        }
        if (ornamentDisplayModal) {
            ornamentDisplayModal.addEventListener('click', (e) => {
                if (e.target === ornamentDisplayModal) hide(ornamentDisplayModal);
            });
        }

        // Play Santa animation on Christmas
        if (isReleased()) {
            playSantaAnimation();
        }

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
