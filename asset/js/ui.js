var currentTourStep = 0;
var tourSteps = [
    { 
        title: "1. ภาพรวมระบบเครือข่าย (Mempool & Block Space)", 
        desc: "โซนด้านบนสุดนี้แสดงภาพรวมของระบบทั้งหมด โดยแบ่งเป็นสองฝั่งหลักคือ ธุรกรรมที่รอการยืนยัน (ซ้าย) และ บล็อกที่ถูกบันทึกลงเชนไปแล้ว (ขวา)", 
        target: "part1-mempool" 
    },
    { 
        title: "2. บ่อพักธุรกรรม (Mempool)", 
        desc: "ผู้คนจากทั่วโลกสร้างธุรกรรมแล้วส่งมาที่นี่! ธุรกรรมต่างๆ จะมารอคิวเพื่อให้นักขุดหยิบไปประมวลผล (กล่องสีส้มนี้คือตัวแทนการจำลองชุดข้อมูลธุรกรรมที่ให้ค่า Fee สูงสุด!)", 
        target: "tour-mempool-high" 
    },
    { 
        title: "3. พื้นที่จัดเก็บ (Block Space)", 
        desc: "ธุรกรรมเมื่อผ่านการรับรองจะถูกเก็บในฝั่งนี้ เชื่อมด้วย 'โซ่แห่งความจริงทางคณิตศาสตร์' โดยร้อย Hash ของบล็อกปัจจุบันเข้ากับบล็อกก่อนหน้า (นี่คือ Genesis Block หรือบล็อกแรกสุดของโลก!)", 
        target: "tour-genesis-block" 
    },
    { 
        title: "4. การเลือกธุรกรรม (Miner Node)", 
        desc: "มาดูแผงควบคุมฝั่งเครื่องขุดกันบ้าง! ขั้นตอนแรกคือคุณต้องจัดเรียงธุรกรรมเข้าบล็อก คุณสามารถคลิกเลือกธุรกรรม (TxID) จาก Mempool ฝั่งซ้าย เพื่อย้ายมาจัดลงกล่องเตรียมขุดได้ด้วยตัวเอง", 
        target: "mempool-container" 
    },
    { 
        title: "5. ระบบจำลองความยาก (Difficulty)", 
        desc: "ส่วนนี้ใช้จำลองความยากในการขุด (Target) ยิ่งตัวเลขน้อยยิ่งขุดเจอง่าย แต่ในโลกจริง ความยากจะถูกปรับอัตโนมัติเพื่อให้เครือข่ายใช้เวลาค้นหาบล็อกเฉลี่ยที่ 10 นาที", 
        target: "input-difficulty" 
    },
    { 
        title: "6. แรงจูงใจนักขุด (Reward & Fee)", 
        desc: "ส่วนนี้คือรายได้ของคุณ! Reward จะค่อยๆ ลดลงเรื่อยๆ จนไปสิ้นสุดในปี 2140 หลังจากนั้นนักขุดจะมีรายได้จากค่าธรรมเนียม (Fee) ล้วนๆ หากคุณสร้าง PoW และประกาศให้ทุกโหนดยอมรับได้ ก็รับ Reward + Fee ไปเลย!", 
        target: "input-subsidy" 
    },
    { 
        title: "7. ทดสอบแหกกติกา (Consensus Rules)", 
        desc: "กล่องสีแดงนี้มีไว้จำลองการท้าทายกฎ! ลองติ๊ก 'ทดสอบแหกกฎ' เช่น การจ่ายซ้ำซ้อนดูสิ แล้วคอยสังเกตว่าเครือข่ายจะตรวจสอบและลงโทษโหนดที่ทำผิดอย่างไร", 
        target: "cb-doublespend" 
    },
    { 
        title: "8. หัวใจของบล็อก (Block Header Data)", 
        desc: "สิ่งสำคัญที่สุดในการสร้างบล็อกอยู่ที่นี่! ประกอบด้วยค่า Merkle Root และ Prev Hash คุณสามารถทดสอบหยิบธุรกรรมเข้า-ออก แล้วสังเกตดูว่าค่ารากไม้ (Merkle Root) เปลี่ยนแปลงตามข้อมูลทันทีอย่างไร", 
        target: "tour-block-header-target" 
    },
    { 
        title: "9. ผู้ตรวจสอบ (Global P2P Network)", 
        desc: "ย้ายมาฝั่ง Validator กันบ้าง แผนที่นี้จำลองเครือข่ายเพื่อแสดงให้เห็นว่า โหนดจากทั่วโลกทำงานร่วมกันอย่างไรเมื่อมีคนกระจายข้อมูลบล็อกใหม่มาให้ตรวจสอบ", 
        target: "network-map-container" 
    },
    { 
        title: "10. แชทเครือข่าย (Live Gossip)", 
        desc: "ที่เรียกว่า Gossip (ซุบซิบ) เพราะโหนดไม่ได้ส่งข้อมูลหาศูนย์กลาง แต่ใช้วิธีกระจายข่าวบอกต่อๆ กันไปให้เพื่อนบ้านรอบตัวแบบปากต่อปาก หน้าต่างนี้จะจับตาดูการส่งข้อความเหล่านั้นแบบเรียลไทม์", 
        target: "live-node-chat-container" 
    },
    { 
        title: "11. ลองขุดบล็อกแรก! (Start PoW)", 
        desc: "ตอนนี้คุณสามารถทดลองขุดบล็อกแรกโดยไม่ต้องกดดันได้เลยที่ปุ่มนี้! คำแนะนำ: ถ้าอยากได้ค่าธรรมเนียมเยอะๆ ควรเลือกธุรกรรมโดยดูจากน้ำหนักและค่าธรรมเนียม เพื่อให้ได้ประโยชน์สูงสุด", 
        target: "btn-mine" 
    },
    { 
        title: "12. โหมดการแข่งขัน (Bot Mode)", 
        desc: "เมื่อคุณพร้อม... โหมดเสมือนการแข่งขันในโลกความเป็นจริงรออยู่! เพียงแค่ลองเปิดสวิตช์นี้ ความสนุกก็เริ่มต้นขึ้น บอทจากทั่วโลกจะแย่งคุณขุดทันที!", 
        target: "cb-bot-mode" 
    }
];

var GuideTour = { 
    start: () => { 
        // --- ค้นหาเป้าหมายและแปะ ID ให้แบบไดนามิก ป้องกันการหาไม่เจอ ---
        
        // ข้อ 2: หากล่องสีส้ม (Mempool High)
        const memHigh = document.querySelector('.mempool-high');
        if (memHigh) memHigh.id = 'tour-mempool-high';

        // ข้อ 3: หากล่อง Genesis Block
        const genesisBlock = document.querySelector('.chain-genesis');
        if (genesisBlock) genesisBlock.id = 'tour-genesis-block';

        // ข้อ 8: หาข้อความ Block Header Data ให้เจอแบบเป๊ะๆ
        document.querySelectorAll('p, div, span').forEach(el => {
            if(el.textContent && el.textContent.trim().toLowerCase() === 'block header data') {
                el.id = 'tour-block-header-target';
                el.classList.add('transition-all', 'duration-300', 'rounded-md'); // เพิ่มขอบมนให้กรอบไฮไลท์ดูสวยขึ้น
            }
        });

        // -----------------------------------------------------------

        currentTourStep = 0; 
        document.getElementById('tour-overlay').classList.remove('hidden'); 
        setTimeout(() => document.getElementById('tour-overlay').classList.remove('opacity-0'), 10);
        document.getElementById('tour-dialog').classList.remove('hidden'); 
        setTimeout(() => document.getElementById('tour-dialog').classList.remove('opacity-0', 'translate-y-8'), 10);
        GuideTour.render(); 
    },
    next: () => { if (currentTourStep < tourSteps.length - 1) { currentTourStep++; GuideTour.render(); } else { GuideTour.end(); } },
    prev: () => { if (currentTourStep > 0) { currentTourStep--; GuideTour.render(); } },
    end: () => { 
        document.getElementById('tour-overlay').classList.add('opacity-0'); 
        document.getElementById('tour-dialog').classList.add('opacity-0', 'translate-y-8');
        
        let arrowEl = document.getElementById('tour-dynamic-arrow');
        if(arrowEl) arrowEl.classList.add('opacity-0');
        
        document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
        setTimeout(() => {
            document.getElementById('tour-overlay').classList.add('hidden');
            document.getElementById('tour-dialog').classList.add('hidden');
        }, 500);
    },
    render: () => {
        document.getElementById('tour-step-num').innerText = currentTourStep + 1;
        document.getElementById('tour-title').innerText = tourSteps[currentTourStep].title;
        document.getElementById('tour-desc').innerText = tourSteps[currentTourStep].desc;
        document.getElementById('btn-tour-prev').disabled = currentTourStep === 0;
        document.getElementById('btn-tour-next').innerText = currentTourStep === tourSteps.length - 1 ? "เริ่มลุยเลย! ✔️" : "ถัดไป ➔";
        
        // ลบไฮไลท์เดิมออกก่อน
        document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
        
        // สร้างหรือดึงลูกศรชี้ (Dynamic Arrow) แบบลูกศรคู่โฮโลแกรมล้ำๆ
        let arrowEl = document.getElementById('tour-dynamic-arrow');
        if (!arrowEl) {
            arrowEl = document.createElement('div');
            arrowEl.id = 'tour-dynamic-arrow';
            arrowEl.innerHTML = `<svg class="w-8 h-8 text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,1)]" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" /></svg>`;
            arrowEl.className = 'fixed z-[165] animate-bounce pointer-events-none transition-all duration-500 opacity-0 flex flex-col items-center';
            document.body.appendChild(arrowEl);
        }
        
        const targetId = tourSteps[currentTourStep].target;
        
        if (targetId) {
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                // เลื่อนหน้าจอไปหา element แบบ Smooth
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // สำหรับสวิตช์ Bot Mode ให้เลื่อนการจับกรอบไฮไลท์ไปที่ Label (ตัวครอบ) แทน 
                let highlightEl = targetEl;
                if (targetId === 'cb-bot-mode') {
                    highlightEl = targetEl.parentElement; 
                }
                highlightEl.classList.add('tour-highlight');
                
                // ใช้ setTimeout เพื่อรอให้หน้าจอเลื่อนเสร็จระดับนึงก่อน ค่อยคำนวณตำแหน่งและแสดงลูกศร
                setTimeout(() => {
                    let rectTarget = targetEl;
                    
                    // ปรับตำแหน่งลูกศรสำหรับ Bot Mode ให้ชี้ตรงปุ่ม Toggle โดยเฉพาะ (ขยับขวามาที่ตัวสวิตช์ภาพ)
                    if (targetId === 'cb-bot-mode' && targetEl.nextElementSibling) {
                        rectTarget = targetEl.nextElementSibling;
                    }

                    const rect = rectTarget.getBoundingClientRect();
                    // ให้ลูกศรอยู่ตรงกลางด้านบนของเป้าหมายที่คำนวณใหม่
                    arrowEl.style.top = `${rect.top - 45}px`; 
                    arrowEl.style.left = `${rect.left + (rect.width / 2) - 16}px`; // -16px เพื่อให้ตรงกึ่งกลาง SVG ขนาด 32px
                    arrowEl.classList.remove('opacity-0');
                }, 300);
            } else {
                arrowEl.classList.add('opacity-0');
            }
        } else {
            arrowEl.classList.add('opacity-0'); 
        }
    }
};

var UI = {
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
    },
    toggleHash(element) { 
        if(!element) return;
        const fullHash = element.getAttribute('data-full'); 
        const shortHash = element.getAttribute('data-short'); 
        if (!fullHash || !shortHash) return; 
        
        if (element.classList.contains('break-all')) { 
            element.innerText = shortHash; 
            element.classList.remove('break-all'); 
        } else { 
            element.innerText = fullHash; 
            element.classList.add('break-all'); 
        } 
    },
    setHashElement(elementId, hashString) { const el = document.getElementById(elementId); if(!el) return; const short = Utils.shortenHash(hashString); el.setAttribute('data-full', hashString); el.setAttribute('data-short', short); el.innerText = short; el.classList.remove('break-all'); },
    setHashDisplay(elementId, hashString) { this.setHashElement(elementId, hashString); },
    
    showBlockDetails(index) {
        const block = STATE.blockchain[index]; const prevBlock = index > 0 ? STATE.blockchain[index - 1] : null;
        document.getElementById('latest-modal-title').innerText = `🔗 Block #${block.height.toLocaleString()}`;
        this.setHashElement('latest-modal-hash', block.hash); this.setHashElement('latest-modal-prev-hash', block.prevHash); this.setHashElement('latest-modal-merkle', block.merkleRoot);
        document.getElementById('latest-modal-version').innerText = block.version; document.getElementById('latest-modal-time').innerText = block.time; 
        document.getElementById('latest-modal-bits').innerText = block.bits; document.getElementById('latest-modal-nonce').innerText = block.nonce ? block.nonce.toLocaleString() : "Unknown";
        document.getElementById('latest-modal-miner').innerText = block.miner; document.getElementById('latest-modal-reward').innerText = block.reward;
        
        window.currentVerifyData = { currentHeight: block.height, claimedPrev: block.prevHash, actualPrev: prevBlock ? prevBlock.hash : "0000000000000000000000000000000000000000000000000000000000000000" };
        
        document.getElementById('verify-result').classList.add('hidden'); 
        this.toggleModal('latest-modal', true);
    },
    verifyLink() {
        const data = window.currentVerifyData; const resDiv = document.getElementById('verify-result'); const resText = document.getElementById('verify-text');
        if (!resDiv || !resText) return; 

        resDiv.classList.remove('animate-pulse');
        void resDiv.offsetWidth; 
        resDiv.classList.add('animate-pulse');
        resDiv.classList.remove('hidden');

        if (data.currentHeight === 0 || data.claimedPrev.includes("00000000000000000000000000000000")) { resText.innerHTML = `<span class="text-amber-400">ℹ️ นี่คือ <b>Genesis Block</b> จึงไม่มีบล็อกก่อนหน้า ค่า Prev Hash จึงเป็นศูนย์เพื่อเริ่มสายโซ่</span>`; } 
        else if (data.claimedPrev === data.actualPrev) { resText.innerHTML = `<span class="text-emerald-400">✅ <b>ตรวจสอบสำเร็จ:</b> Prev Hash ตรงกับ Hash จริงของบล็อก #${data.currentHeight - 1} เป๊ะ! ข้อมูลเชื่อมโยงกันอย่างสมบูรณ์</span>`; } 
        else { resText.innerHTML = `<span class="text-rose-400">❌ <b>ล้มเหลว:</b> ข้อมูลไม่ตรงกัน! สายโซ่ขาดออกจากกัน บล็อกนี้อาจถูกปลอมแปลง</span>`; }
    },
    writeLog(msg, type = 'info') {
        const logBox = document.getElementById('event-log'); if(!logBox) return; 
        const div = document.createElement('div'); 
        let prefix = `<span class="text-slate-500 mr-2 font-mono">[${Utils.getTimeString()}]</span> `; 
        let col = "text-slate-300"; 
        
        const styles = { 
            success: { p: "<span class='text-emerald-400 font-bold'>[PASS]</span> ", c: "text-emerald-300" }, 
            error: { p: "<span class='text-rose-500 font-bold'>[FAIL]</span> ", c: "text-rose-300 bg-rose-950/20 border-l-2 border-rose-500 pl-3 py-1 my-1" }, 
            process: { p: "<span class='text-cyan-400 font-bold'>[SYSTEM]</span> ", c: "text-cyan-200" }, 
            warning: { p: "<br><span class='text-amber-400 font-bold'>[VALIDATION]</span> ", c: "text-amber-200 mt-2 font-semibold" }, 
            'final-success': { p: "<br><span class='text-emerald-400 font-bold'>[ACCEPTED]</span> ", c: "text-emerald-300 font-bold bg-emerald-950/30 p-2 border border-emerald-900/50 rounded mt-2" } 
        };
        if (styles[type]) { prefix += styles[type].p; col = styles[type].c; } 
        div.className = `${col} text-[11px] sm:text-xs tracking-wide`; 
        div.innerHTML = prefix + msg; 
        logBox.appendChild(div); 
        logBox.scrollTop = logBox.scrollHeight;
    },
    drawMerkleTree() {
        const canvas = document.getElementById('merkle-tree-canvas'); if (!canvas || !STATE.merkleTreeData) return; canvas.innerHTML = '';
        const reversedLevels = [...STATE.merkleTreeData.levels].reverse();
        reversedLevels.forEach((level, levelIdx) => {
            const rowDiv = document.createElement('div'); rowDiv.className = "flex justify-center gap-2 sm:gap-6 w-full mb-6 relative z-10";
            level.forEach((node, nodeIdx) => {
                const isRoot = levelIdx === 0; const isLeaf = levelIdx === reversedLevels.length - 1;
                let bgClass = "bg-slate-900 border-slate-700 text-slate-400"; let animClass = ""; let title = isRoot ? "Merkle Root" : (isLeaf ? `[${node.type}] ${node.originalTx}` : "Combined Hash");
                if (node.isCorrupted) { bgClass = "bg-rose-950/80 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(225,29,72,0.5)]"; animClass = "anim-shake-once"; } 
                else if (node.isDup) { bgClass = "bg-amber-950/30 border-amber-500/50 border-dashed text-amber-500 opacity-80"; title = "👻 โคลนตัวเอง"; } 
                else if (isRoot) { bgClass = "bg-fuchsia-950/60 border-fuchsia-500 text-fuchsia-300 shadow-[0_0_20px_rgba(217,70,239,0.4)]"; }
                const box = document.createElement('div'); box.className = `merkle-node px-2 py-1.5 sm:px-4 sm:py-2 border rounded font-mono text-[9px] sm:text-xs text-center flex flex-col justify-center transition-all duration-500 ${bgClass} ${animClass}`;
                box.innerHTML = `<span class="font-bold opacity-70 block mb-0.5">${title}</span>${Utils.shortenHash(node.hash)}`;
                rowDiv.appendChild(box);
            }); canvas.appendChild(rowDiv);
        });
    },
    
    renderMempool() {
        const memEl = document.getElementById('mempool-list'); const blkEl = document.getElementById('block-list'); if(!memEl || !blkEl) return;
        memEl.innerHTML = ''; blkEl.innerHTML = ''; let curVb = 0; 
        
        let newFee = 0;
        STATE.blockTxs.forEach(tx => { curVb += tx.vb; newFee += tx.fee; blkEl.innerHTML += this.createTxCardHTML(tx, 'block'); });
        STATE.actualFee = newFee;
        
        STATE.mempoolTxs.forEach(tx => memEl.innerHTML += this.createTxCardHTML(tx, 'mempool'));
        
        document.getElementById('block-size-text').innerText = curVb.toLocaleString(); 
        document.getElementById('block-fee-text').innerText = STATE.actualFee.toLocaleString(); 
        document.getElementById('input-fee').value = STATE.actualFee; 
        document.getElementById('capacity-bar').style.width = Math.min((curVb/CONFIG.MAX_BLOCK_VB)*100, 100) + '%';
        
        const memCount = document.getElementById('mempool-count');
        if (memCount) memCount.innerText = STATE.mempoolTxs.length;
        
        const cbDoubleSpend = document.getElementById('cb-doublespend');
        if (cbDoubleSpend) {
            if (STATE.blockTxs.length === 0) { cbDoubleSpend.checked = false; cbDoubleSpend.disabled = true; cbDoubleSpend.parentElement.classList.add('opacity-50', 'cursor-not-allowed'); } 
            else { cbDoubleSpend.disabled = false; cbDoubleSpend.parentElement.classList.remove('opacity-50', 'cursor-not-allowed'); }
        }

        const txIds = ["COINBASE", ...STATE.blockTxs.map(t => t.id)];
        const isCorrupted = cbDoubleSpend?.checked || false;
        
        const newTreeData = Utils.buildMerkleTreeData(txIds, isCorrupted);
        const newRoot = newTreeData.root;
        
        if (STATE.merkleRoot !== newRoot && STATE.merkleRoot !== "") {
            STATE.merkleRoot = newRoot;
            STATE.merkleTreeData = newTreeData;
            this.setHashDisplay('ui-merkle-root', STATE.merkleRoot);
            
            if (STATE.isMining) {
                if (window.App && window.App.abortMining) window.App.abortMining();
                this.showToast("Merkle Root เปลี่ยน! ระบบได้ยกเลิกการขุด เนื่องจากข้อมูลบล็อกถูกแก้ไข", "warning");
            } else if (STATE.minedHash) { 
                this.showToast("Merkle Root เปลี่ยน! ข้อมูลบล็อกถูกแก้ไข ต้องขุดหา Nonce ใหม่อีกครั้ง", "warning"); 
                STATE.minedHash = ""; 
            }
        } else {
            STATE.merkleRoot = newRoot;
            STATE.merkleTreeData = newTreeData;
            this.setHashDisplay('ui-merkle-root', STATE.merkleRoot);
        }
    },
    createTxCardHTML(tx, loc) { const isM = loc === 'mempool'; return `<div onclick="window.App.moveTx('${tx.id}', '${isM?'block':'mempool'}')" class="tx-card ${isM?'bg-slate-900/50 border-slate-800':'bg-cyan-900/30 border-cyan-800'} border rounded flex justify-between items-center hover:border-cyan-500 transition-colors cursor-pointer mb-2 p-2"><div><div class="text-sm font-bold text-${isM?'slate':'cyan'}-400">${tx.type} [${tx.id}]</div><div class="text-xs text-slate-400 mt-0.5">${tx.vb} vB | ${tx.satPerVb} sat/vB</div></div><div class="text-sm text-amber-400 font-bold">+${tx.fee.toLocaleString()} sats</div></div>`; }
};