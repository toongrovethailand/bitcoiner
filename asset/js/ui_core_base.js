var UI = {
    // -------------------------------------------------------------
    // ฟังก์ชันสร้างและควบคุม Custom Tooltip (กล่อง Hash Power)
    // -------------------------------------------------------------
    initTooltip() {
        if (document.getElementById('cyber-tooltip')) return;
        const tooltip = document.createElement('div');
        tooltip.id = 'cyber-tooltip';
        // ใช้ Tailwind จัดแต่งทรงกล่องแก้ว (Glassmorphism) ตามเมาส์แบบสวยงาม
        tooltip.className = 'fixed pointer-events-none z-[400] opacity-0 transition-opacity duration-200 bg-[#020617]/95 border border-cyan-500/50 rounded-xl p-3 shadow-[0_0_30px_rgba(34,211,238,0.25)] backdrop-blur-md transform -translate-x-1/2 -translate-y-full';
        tooltip.innerHTML = `
            <div id="ct-title" class="text-cyan-400 font-bold text-[11px] uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><span class="animate-pulse w-2 h-2 rounded-full bg-cyan-400"></span> <span></span></div>
            <div id="ct-desc" class="text-slate-300 font-mono text-xs"></div>
        `;
        document.body.appendChild(tooltip);
    },
    showTooltip(e, title, desc) {
        const tt = document.getElementById('cyber-tooltip');
        if (!tt) return;
        const titleSpan = tt.querySelector('#ct-title span:last-child');
        if (titleSpan) titleSpan.innerText = title;
        document.getElementById('ct-desc').innerHTML = desc; 
        
        // ชดเชยแกน Y ขึ้นไปอีก 15px ไม่ให้บังเมาส์
        tt.style.left = e.clientX + 'px';
        tt.style.top = (e.clientY - 15) + 'px';
        tt.classList.remove('opacity-0');
    },
    moveTooltip(e) {
        const tt = document.getElementById('cyber-tooltip');
        if (!tt) return;
        tt.style.left = e.clientX + 'px';
        tt.style.top = (e.clientY - 15) + 'px';
    },
    hideTooltip() {
        const tt = document.getElementById('cyber-tooltip');
        if (tt) tt.classList.add('opacity-0');
    },
    // -------------------------------------------------------------

    minimizeMining() {
        const content = document.getElementById('hash-modal-content');
        const body = document.getElementById('hash-modal-body');
        const btn = document.getElementById('btn-minimize-hash');
        if (!content || !body || !btn) return;
        
        if (content.classList.contains('hash-minimized')) {
            content.classList.remove('hash-minimized');
            body.classList.remove('hidden');
            btn.innerHTML = '➖ พับ';
        } else {
            content.classList.add('hash-minimized');
            body.classList.add('hidden');
            btn.innerHTML = '🔲 ขยาย';
        }
    },
    toggleNodeMining(nodeId, isMining) {
        const elId = nodeId === 'me' ? 'nd-me' : `nd-${nodeId}`;
        const node = document.getElementById(elId);
        if (!node) return;
        let ind = node.querySelector('.mining-indicator');
        if (isMining) {
            if (!ind) {
                ind = document.createElement('div');
                ind.className = 'mining-indicator';
                ind.innerText = '⛏️';
                node.appendChild(ind);
            }
        } else {
            if (ind) ind.remove();
        }
    },
    clearAllMining() {
        document.querySelectorAll('.mining-indicator').forEach(el => el.remove());
    },
    banNode(nodeId) {
        STATE.bannedNodes.add(nodeId);
        const isMe = nodeId === 'me';
        const elId = isMe ? 'nd-me' : `nd-${nodeId}`;
        const el = document.getElementById(elId);
        
        if (el) {
            el.classList.remove('anim-node-success', 'anim-node-verifying');
            el.classList.add('anim-node-fail');
            el.style.opacity = '0.35'; el.style.filter = 'grayscale(100%)';
            let ind = el.querySelector('.mining-indicator');
            if (ind) ind.remove();
        }
        this.showNodeChat(elId, "☠️ BANNED", "text-rose-500 border-rose-600 bg-rose-950 font-bold");
        
        if (CONFIG.CONNECTIONS[nodeId]) {
            CONFIG.CONNECTIONS[nodeId].forEach(neighbor => {
                let lineId1 = `l-${nodeId}-${neighbor}`; let lineId2 = `l-${neighbor}-${nodeId}`;
                let line = document.getElementById(lineId1) || document.getElementById(lineId2);
                if (line) { line.style.display = 'none'; }
            });
        }
    },
    showToast(message, type = 'error') {
        let container = document.getElementById('web3-toast-container');
        if (!container) { container = document.createElement('div'); container.id = 'web3-toast-container'; container.className = 'fixed top-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none'; document.body.appendChild(container); }
        
        const toast = document.createElement('div');
        let styleClass = 'bg-rose-950/90 border-rose-500/50 text-rose-200 shadow-[0_0_15px_rgba(225,29,72,0.3)]';
        let icon = '🚫';
        
        if (type === 'warning') {
            styleClass = 'bg-amber-950/90 border-amber-500/50 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.3)]';
            icon = '⚠️';
        } else if (type === 'success') {
            styleClass = 'bg-emerald-950/95 border-emerald-500 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.5)]';
            icon = '🎉';
        }

        toast.className = `px-4 py-3 border rounded-xl backdrop-blur-md transform transition-all duration-300 translate-x-full opacity-0 font-mono text-sm flex items-center gap-3 ${styleClass}`;
        toast.innerHTML = `<span class="text-lg">${icon}</span> ${message}`;
        container.appendChild(toast);
        
        requestAnimationFrame(() => toast.classList.remove('translate-x-full', 'opacity-0'));
        setTimeout(() => { toast.classList.add('translate-x-full', 'opacity-0'); setTimeout(() => toast.remove(), 300); }, 3500);
        
        if (type === 'error') AudioEngine.sfxFail(); 
        else if (type === 'success') AudioEngine.sfxTick(); 
        else AudioEngine.sfxTick();
    },
    shootFireworks() {
        const colors = ['#10b981', '#34d399', '#059669', '#fcd34d', '#38bdf8', '#f472b6'];
        const container = document.createElement('div');
        container.style.position = 'fixed'; container.style.inset = '0';
        container.style.pointerEvents = 'none'; container.style.zIndex = '9999';
        document.body.appendChild(container);

        for (let i = 0; i < 100; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'absolute';
            particle.style.width = Math.random() > 0.5 ? '10px' : '6px';
            particle.style.height = particle.style.width;
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.left = '50%'; particle.style.top = '50%';
            particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            
            const angle = Math.random() * Math.PI * 2;
            const velocity = 10 + Math.random() * 25;
            const tx = Math.cos(angle) * velocity * 15;
            const ty = Math.sin(angle) * velocity * 15 + 200;

            container.appendChild(particle);
            particle.animate([
                { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1 },
                { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0) rotate(${Math.random() * 360}deg)`, opacity: 0 }
            ], {
                duration: 1000 + Math.random() * 1500,
                easing: 'cubic-bezier(0, .9, .57, 1)'
            });
        }
        setTimeout(() => container.remove(), 3000);
    },
    showNodeChat(nodeId, text, colorStyle) { 
        const node = document.getElementById(nodeId); if(!node) return; 
        const chat = document.createElement('div'); 
        chat.className = `absolute left-1/2 top-[-25px] text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#020617]/90 border backdrop-blur-sm whitespace-nowrap z-[100] pointer-events-none anim-node-chat ${colorStyle}`; 
        chat.innerText = text; node.appendChild(chat); 
        setTimeout(() => { if (chat.parentNode) chat.remove(); }, 1200); 
    },
    addLiveNodeLog(msg, type = 'system') {
        const box = document.getElementById('live-node-chat-box'); if (!box) return;
        
        const readyMsg = box.querySelector('.italic');
        if (readyMsg && readyMsg.innerHTML.includes("-- System Ready")) readyMsg.remove();
        
        const div = document.createElement('div'); let color = "text-slate-400";
        if (type === 'inv') color = "text-amber-400"; else if (type === 'getdata') color = "text-fuchsia-400";
        else if (type === 'block') color = "text-cyan-400"; else if (type === 'accept') color = "text-emerald-400 font-bold bg-emerald-950/30 px-1 rounded";
        else if (type === 'reject') color = "text-rose-400 font-bold bg-rose-950/30 px-1 rounded";
        else if (type === 'system') color = "text-slate-300 font-bold";
        else if (type === 'bot') color = "text-rose-400 font-bold bg-rose-950/50 px-2 rounded border border-rose-800/50";
        else if (type === 'da') color = "text-amber-300 font-bold bg-amber-950/50 px-2 rounded border border-amber-800/50 my-1 py-1"; 
        else if (type === 'attack') color = "text-rose-500 font-bold bg-rose-950/80 px-2 rounded border border-rose-600 my-1 py-1 animate-pulse";

        div.className = `border-b border-slate-800/40 pb-1 ${color}`;
        div.innerHTML = `<span class="text-slate-600 opacity-60 mr-1">[${Utils.getTimeString()}]</span> ${msg}`;
        box.appendChild(div);
        
        while (box.children.length > 50) { box.removeChild(box.firstChild); }
        box.scrollTop = box.scrollHeight;
    },
    toggleModal(modalId, show) { 
        const overlay = document.getElementById(modalId); 
        if (!overlay) return; 
        
        const content = document.getElementById(modalId + '-content') || overlay.querySelector('.modal-content');

        if (show) { 
            overlay.classList.remove('opacity-0'); 
            if (modalId === 'hash-modal') {
                overlay.classList.add('pointer-events-none'); 
                if(content) content.classList.remove('pointer-events-none');
                if(content) content.classList.add('pointer-events-auto');
            } else {
                overlay.classList.remove('pointer-events-none'); 
            }
        } else { 
            overlay.classList.add('opacity-0', 'pointer-events-none'); 
            if (modalId === 'hash-modal') {
                if(content) content.classList.remove('pointer-events-auto');
                if(content) content.classList.add('pointer-events-none');
                
                if(content) content.classList.remove('hash-minimized');
                const body = document.getElementById('hash-modal-body');
                if(body) body.classList.remove('hidden');
                const btn = document.getElementById('btn-minimize-hash');
                if(btn) btn.innerHTML = '➖ พับ';
            }
        } 
    }
};