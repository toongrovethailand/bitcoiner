window.App = {
    init: () => { 
        const style = document.createElement('style');
        style.innerHTML = `@keyframes digAnim { 0% { transform: rotate(0deg) translateY(0); } 50% { transform: rotate(-40deg) translateY(-3px); } 100% { transform: rotate(0deg) translateY(0); } } .mining-indicator { position: absolute; top: -10px; right: -10px; font-size: 11px; background: rgba(15, 23, 42, 0.95); border: 1px solid #f59e0b; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 8px rgba(245, 158, 11, 0.6); z-index: 50; animation: digAnim 0.4s infinite; } .hash-minimized { position: fixed !important; bottom: 90px !important; right: 20px !important; width: 300px !important; transform: none !important; z-index: 300 !important; } @media (max-width: 640px) { .hash-minimized { bottom: 130px !important; right: 10px !important; width: 260px !important; } }`;
        document.head.appendChild(style);
        
        setInterval(() => {
            document.querySelectorAll('.time-ago').forEach(el => {
                const ts = parseInt(el.getAttribute('data-ts'));
                if (ts) el.innerText = Utils.getTimeAgo(ts);
            });
        }, 5000);

        Engine.syncNetwork(); Engine.prepareNext(); 
    },
    closeWelcome: (startTourMode) => { 
        AudioEngine.init(); 
        sessionStorage.setItem('skipWelcome', 'true'); 
        const modal = document.getElementById('welcome-modal'); 
        if(modal) { 
            modal.classList.add('opacity-0'); 
            setTimeout(() => { 
                modal.classList.add('hidden'); 
                if(startTourMode) GuideTour.start(); 
            }, 300); 
        } 
    },
    toggleModal: (...args) => UI.toggleModal(...args), 
    toggleHash: (...args) => UI.toggleHash(...args), 
    verifyLink: () => UI.verifyLink(), 
    showBlockDetails: (...args) => UI.showBlockDetails(...args),
    startTour: () => GuideTour.start(), 
    nextTour: () => GuideTour.next(), 
    prevTour: () => GuideTour.prev(), 
    endTour: () => GuideTour.end(),
    abortMining: () => Engine.abortMining(), 
    minimizeMining: () => UI.minimizeMining(), 
    moveTx: (id, target) => { 
        window.currentTemplateTier = null; // รีเซ็ตการล็อกปุ่ม หากมีการคลิกย้ายด้วยตัวเอง
        const idxM = STATE.mempoolTxs.findIndex(t => t.id === id); 
        const idxB = STATE.blockTxs.findIndex(t => t.id === id); 
        if (target === 'block' && idxM > -1) { 
            if (STATE.blockTxs.length >= 20) { UI.showToast("Candidate Block เต็มโควต้าแล้ว (สูงสุด 20 Tx)!", "error"); return; }
            if (STATE.blockTxs.reduce((s, t) => s + t.vb, 0) + STATE.mempoolTxs[idxM].vb > CONFIG.MAX_BLOCK_VB) { UI.showToast("Candidate Block มีขนาด vB ล้นแล้ว!", "error"); return; } 
            STATE.blockTxs.push(STATE.mempoolTxs[idxM]); STATE.mempoolTxs.splice(idxM, 1); 
        } else if (target === 'mempool' && idxB > -1) { 
            if (STATE.mempoolTxs.length >= 100) { UI.showToast("Mempool เต็มแล้ว!", "warning"); return; }
            STATE.mempoolTxs.push(STATE.blockTxs[idxB]); STATE.blockTxs.splice(idxB, 1); 
        } 
        UI.renderMempool(); 
    },
    autoFillFromMempool: () => {
        // หาก Candidate Block ว่างเปล่า ให้เคลียร์สถานะเดิมทิ้งก่อน
        if (STATE.blockTxs.length === 0) {
            window.currentTemplateTier = null;
        }

        // ห้ามกดซ้ำบล็อกเดิม
        if (window.currentTemplateTier === 'auto') {
            UI.showToast("คุณกำลังใช้โหมดดึงอัตโนมัติอยู่แล้ว!", "warning");
            return;
        }

        // คืนธุรกรรมของจริง (ที่มาจาก Mempool) กลับลงไปก่อนที่จะเคลียร์
        STATE.blockTxs.filter(tx => !tx.isMock).forEach(tx => {
            if (!STATE.mempoolTxs.find(m => m.id === tx.id)) {
                STATE.mempoolTxs.push(tx);
            }
        });
        
        STATE.blockTxs = [];
        window.currentTemplateTier = 'auto';

        // 1. เรียงลำดับ Mempool ตาม satPerVb จากมากไปน้อย (Top Fee)
        STATE.mempoolTxs.sort((a, b) => b.satPerVb - a.satPerVb);

        let currentVb = 0;
        const txsToMove = [];
        
        // 2. เลือกธุรกรรมเข้าบล็อกโดยไม่ให้เกินน้ำหนักสูงสุด
        for (let i = 0; i < STATE.mempoolTxs.length; i++) {
            let tx = STATE.mempoolTxs[i];
            if (currentVb + tx.vb <= CONFIG.MAX_BLOCK_VB && txsToMove.length < 20) {
                txsToMove.push(tx);
                currentVb += tx.vb;
            }
        }

        // 3. นำธุรกรรมที่เลือกออกจาก Mempool แล้วใส่ Candidate Block
        txsToMove.forEach(tx => {
            const idx = STATE.mempoolTxs.findIndex(m => m.id === tx.id);
            if (idx > -1) STATE.mempoolTxs.splice(idx, 1);
            STATE.blockTxs.push(tx);
        });

        UI.renderMempool();
        UI.showToast("ดึงธุรกรรมจริงที่ให้ Fee สูงสุดเข้าบล็อกสำเร็จ!", "success");
    },
    loadMempoolTemplate: (tier) => { 
        if (STATE.blockTxs.length === 0) {
            window.currentTemplateTier = null;
        }

        if (window.currentTemplateTier === tier) {
            UI.showToast("คุณกำลังใช้ชุดข้อมูลนี้อยู่แล้ว!", "warning");
            return;
        }

        // คืนธุรกรรมของจริง (ที่มาจาก Mempool) กลับลงไปก่อน
        STATE.blockTxs.filter(tx => !tx.isMock).forEach(tx => {
            if (!STATE.mempoolTxs.find(m => m.id === tx.id)) {
                STATE.mempoolTxs.push(tx);
            }
        });
        
        window.currentTemplateTier = tier;
        STATE.blockTxs = [];

        let targetSat = 45;
        if (tier === 'med') targetSat = 15;
        if (tier === 'low') targetSat = 9;

        let currentVb = 0;
        const newTxs = [];
        const types = ['P2PKH', 'SegWit', 'Taproot', 'Lightning', 'Batch Tx'];

        while (currentVb < CONFIG.MAX_BLOCK_VB && newTxs.length < 20) {
            const id = Math.random().toString(16).substring(2, 6).padEnd(4, '0');
            const vb = Math.floor(Math.random() * 200) + 150; 
            if (currentVb + vb > CONFIG.MAX_BLOCK_VB) break;

            const satVariance = Math.floor(Math.random() * 3) - 1;
            const finalSat = Math.max(1, targetSat + satVariance);
            const fee = Math.floor(vb * finalSat);

            // เพิ่ม property isMock เพื่อให้รู้ว่าเป็นข้อมูลจำลอง จะได้ไม่โดนคืนลง Mempool จริง
            newTxs.push({ id, type: types[Math.floor(Math.random()*types.length)], fee, vb, satPerVb: finalSat, isMock: true });
            currentVb += vb;
        }

        STATE.blockTxs = newTxs;
        
        UI.renderMempool(); 
        UI.showToast(`ดึงชุดข้อมูล ${tier.toUpperCase()} Fee เข้าสู่บล็อกสำเร็จ!`, "success");
    },
    mineBlock: () => Engine.mine(), 
    resetSim: () => location.reload(),
    openMerkleTree: () => { UI.drawMerkleTree(); window.App.toggleModal('merkle-tree-modal', true); },
    triggerDoubleSpendRipple: () => { UI.renderMempool(); UI.drawMerkleTree(); AudioEngine.sfxFail(); },
    toggleBotMode: () => Engine.toggleBotMode()
};