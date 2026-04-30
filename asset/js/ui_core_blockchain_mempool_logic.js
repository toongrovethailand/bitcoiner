window.UI = window.UI || {};
Object.assign(window.UI, {
    corruptBlock(index) {
        if (STATE.blockchain[index].isCorrupted) return; 
        
        STATE.chainCorrupted = true;
        
        const fakeMerkle = Utils.generateHash("BAD");
        const fakeHash = Utils.generateHash("DEAD");
        
        for (let i = index; i < STATE.blockchain.length; i++) {
            STATE.blockchain[i].isCorrupted = true;
            if (i === index) { 
                STATE.blockchain[i].merkleRoot = fakeMerkle;
                STATE.blockchain[i].hash = fakeHash;
            }
        }

        if(window.currentVerifyData) window.currentVerifyData.isCorrupted = true;
        
        this.setHashElement('latest-modal-merkle', fakeMerkle);
        this.setHashElement('latest-modal-hash', fakeHash);
        
        const merkleSpan = document.getElementById('latest-modal-merkle');
        const hashSpan = document.getElementById('latest-modal-hash');
        if(merkleSpan) {
            merkleSpan.classList.remove('text-fuchsia-400', 'text-cyan-400');
            merkleSpan.classList.add('text-rose-500', 'anim-shake');
            setTimeout(() => merkleSpan.classList.remove('anim-shake'), 500);
        }
        if(hashSpan) {
            hashSpan.classList.remove('text-cyan-400', 'text-fuchsia-400');
            hashSpan.classList.add('text-rose-500', 'anim-shake');
            setTimeout(() => hashSpan.classList.remove('anim-shake'), 500);
        }

        let corruptBtn = document.getElementById('btn-corrupt-tx');
        if (corruptBtn) {
            corruptBtn.disabled = true;
            corruptBtn.innerText = "🚨 ข้อมูลถูกดัดแปลงแล้ว";
            corruptBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-rose-950/80');
        }
        
        const avalancheNote = document.getElementById('avalanche-explanation-note');
        if (avalancheNote) {
            let body = avalancheNote.querySelector('.accordion-body');
            let icon = avalancheNote.querySelector('.accordion-icon');
            if (body && icon && body.classList.contains('hidden')) {
                body.classList.remove('hidden');
                icon.innerText = '▲';
            }
            avalancheNote.classList.remove('border-slate-700/80');
            avalancheNote.classList.add('border-rose-500', 'shadow-[0_0_15px_rgba(225,29,72,0.3)]');
        }
        
        const resDiv = document.getElementById('verify-result');
        const resText = document.getElementById('verify-text');
        if (resDiv && resText) {
            resDiv.classList.remove('hidden', 'animate-pulse');
            void resDiv.offsetWidth;
            resDiv.classList.add('animate-pulse');
            resText.innerHTML = `<span class="text-rose-400">❌ <b>สายโซ่พังทลาย:</b> การแก้ไขธุรกรรมทำให้ <b>Merkle Root</b> และ <b>Hash</b> เปลี่ยนแปลง ค่าจะไม่ตรงกับบล็อกถัดไป เครือข่ายปฏิเสธสายโซ่นี้ทันที!</span>`;
        }

        const corruptedHeight = STATE.blockchain[index].height;
        const stripBlocks = document.querySelectorAll('#blockchain-strip-right .block-cube');
        
        stripBlocks.forEach((blockEl) => {
            const heightTextEl = blockEl.querySelector('span:first-child');
            if(heightTextEl) {
                const heightStr = heightTextEl.innerText.replace('#', '').replace(/,/g, '');
                const h = parseInt(heightStr);
                
                if(!isNaN(h) && h >= corruptedHeight) {
                    blockEl.classList.add('relative'); 
                    blockEl.classList.remove('chain-latest', 'my-new-block', 'chain-inter', 'chain-genesis');
                    blockEl.classList.add('orphan-block'); 
                    heightTextEl.classList.remove('text-cyan-400', 'text-amber-400', 'text-slate-400');
                    heightTextEl.classList.add('text-rose-400');
                    
                    if (!blockEl.querySelector('.invalid-badge')) {
                        const badge = document.createElement('div');
                        badge.className = 'invalid-badge absolute top-3 -right-7 w-24 text-center bg-rose-600 text-white text-[9px] font-bold py-0.5 rotate-45 shadow-[0_0_10px_rgba(225,29,72,0.8)] pointer-events-none uppercase tracking-wider z-50';
                        badge.innerText = 'Invalid';
                        blockEl.appendChild(badge);
                    }
                }
            }
        });

        this.showToast("🚨 คำเตือน: ข้อมูลถูกแก้ไข! สายโซ่ขาดออกจากกันเรียบร้อยแล้ว", "error");
        this.writeLog("🚨 ตรวจพบการแก้ไขข้อมูลธุรกรรมย้อนหลัง: ส่งผลให้ Merkle Root และ Block Hash เปลี่ยนแปลง สายโซ่ปัจจุบันกลายเป็น Invalid!", "error");
    },

    renderMempool() {
        const memEl = document.getElementById('mempool-list'); const blkEl = document.getElementById('block-list'); if(!memEl || !blkEl) return;
        memEl.innerHTML = ''; blkEl.innerHTML = ''; let curVb = 0; 
        
        let newFee = 0;
        // 1. วาดธุรกรรมใน Candidate Block
        STATE.blockTxs.forEach(tx => { curVb += tx.vb; newFee += tx.fee; blkEl.innerHTML += this.createTxCardHTML(tx, 'block'); });
        
        // 2. วาดธุรกรรมใน Mempool (บรรทัดที่เผลอลบไปตอนอัปเดตรอบก่อนครับ)
        STATE.mempoolTxs.forEach(tx => { memEl.innerHTML += this.createTxCardHTML(tx, 'mempool'); });
        
        const feeInput = document.getElementById('input-fee');
        if (feeInput) {
            if (document.activeElement === feeInput || STATE.manualFee) {
                STATE.actualFee = parseInt(feeInput.value) || 0;
            } else {
                STATE.actualFee = newFee;
                feeInput.value = STATE.actualFee;
            }
        } else {
            STATE.actualFee = newFee;
        }

        const subInput = document.getElementById('input-subsidy');
        if (subInput) {
            STATE.liveSubsidy = parseInt(subInput.value) || 0;
        }

        document.getElementById('block-size-text').innerText = curVb.toLocaleString(); 
        document.getElementById('block-fee-text').innerText = STATE.actualFee.toLocaleString(); 
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
        
        const newTreeData = Utils.buildMerkleTreeData(txIds, false);
        
        if (!isCorrupted) {
            STATE.corruptTxIndex = null;
        } else if (newTreeData && newTreeData.levels && newTreeData.levels.length > 0) {
            if (STATE.corruptTxIndex == null || STATE.corruptTxIndex >= txIds.length) {
                STATE.corruptTxIndex = txIds.length > 1 ? Math.floor(Math.random() * (txIds.length - 1)) + 1 : 0;
            }
            let currentIdx = STATE.corruptTxIndex;
            for (let i = 0; i < newTreeData.levels.length; i++) {
                let level = newTreeData.levels[i];
                if (level[currentIdx]) {
                    level[currentIdx].isCorrupted = true;
                    level[currentIdx].hash = Utils.generateHash("FAKE_" + i + "_" + currentIdx);
                }
                currentIdx = Math.floor(currentIdx / 2);
            }
            newTreeData.root = newTreeData.levels[newTreeData.levels.length - 1][0].hash;
        }

        const newRoot = newTreeData.root;
        
        if (STATE.merkleRoot !== newRoot && STATE.merkleRoot !== "") {
            STATE.merkleRoot = newRoot;
            STATE.merkleTreeData = newTreeData;
            this.setHashDisplay('ui-merkle-root', STATE.merkleRoot);
            
            if(window.UI && window.UI.drawMerkleTree) window.UI.drawMerkleTree(); 
            
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
            if(window.UI && window.UI.drawMerkleTree) window.UI.drawMerkleTree(); 
        }
    },
    createTxCardHTML(tx, loc) { 
        const isM = loc === 'mempool'; 
        return `<div onclick="STATE.manualFee=false; window.App.moveTx('${tx.id}', '${isM?'block':'mempool'}')" class="tx-card ${isM?'bg-slate-900/50 border-slate-800':'bg-cyan-900/30 border-cyan-800'} border rounded flex justify-between items-center hover:border-cyan-500 transition-colors cursor-pointer mb-2 p-2"><div><div class="text-sm font-bold text-${isM?'slate':'cyan'}-400">${tx.type} [${tx.id}]</div><div class="text-xs text-slate-400 mt-0.5">${tx.vb} vB | ${tx.satPerVb} sat/vB</div></div><div class="text-sm text-amber-400 font-bold">+${tx.fee.toLocaleString()} sats</div></div>`; 
    }
});