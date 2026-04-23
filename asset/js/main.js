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
        const idxM = STATE.mempoolTxs.findIndex(t => t.id === id); 
        const idxB = STATE.blockTxs.findIndex(t => t.id === id); 
        if (target === 'block' && idxM > -1) { 
            if (STATE.blockTxs.length >= 20) { UI.showToast("Candidate Block เต็มโควต้าแล้ว (สูงสุด 20 Tx)!", "error"); return; }
            if (STATE.blockTxs.reduce((s, t) => s + t.vb, 0) + STATE.mempoolTxs[idxM].vb > CONFIG.MAX_BLOCK_VB) { UI.showToast("Candidate Block มีขนาด vB ล้นแล้ว!", "error"); return; } 
            STATE.blockTxs.push(STATE.mempoolTxs[idxM]); STATE.mempoolTxs.splice(idxM, 1); 
        } else if (target === 'mempool' && idxB > -1) { 
            if (STATE.mempoolTxs.length >= 20) { UI.showToast("Mempool เต็มแล้ว (สูงสุด 20 Tx)!", "warning"); return; }
            STATE.mempoolTxs.push(STATE.blockTxs[idxB]); STATE.blockTxs.splice(idxB, 1); 
        } 
        UI.renderMempool(); 
    },
    loadMempoolTemplate: (tier) => { 
        STATE.mempoolTxs.sort((a,b) => b.satPerVb - a.satPerVb); 
        const count = tier === 'high' ? 6 : 3; 
        for(let i=0; i<count; i++) { 
            if(STATE.mempoolTxs.length && STATE.blockTxs.length < 20) { 
                window.App.moveTx(STATE.mempoolTxs[0].id, 'block'); 
            } 
        } 
    },
    mineBlock: () => Engine.mine(), 
    resetSim: () => location.reload(),
    openMerkleTree: () => { UI.drawMerkleTree(); window.App.toggleModal('merkle-tree-modal', true); },
    triggerDoubleSpendRipple: () => { UI.renderMempool(); UI.drawMerkleTree(); AudioEngine.sfxFail(); },
    toggleBotMode: () => Engine.toggleBotMode()
};