var Mempool = {
    generate(count = 8) { const types = ['P2PKH', 'SegWit', 'Taproot', 'Lightning', 'Batch Tx', 'Consolidation', 'Spam']; const txs = []; for(let i=0; i<count; i++) { const id = Math.random().toString(16).substring(2, 6); const vb = Math.floor(Math.random() * 400) + 150; const sat = Math.floor(Math.random() * 80) + 5; txs.push({ id: id.padEnd(4, '0'), type: types[Math.floor(Math.random()*types.length)], fee: Math.floor(vb*sat), vb, satPerVb: sat }); } return txs.sort((a,b) => b.satPerVb - a.satPerVb); },
    init() { 
        STATE.mempoolTxs = this.generate(40); 
        STATE.blockTxs = []; 
        UI.renderMempool(); 
        this.startTxStream(); 
    },
    startTxStream() {
        if (STATE.txStreamInterval) clearInterval(STATE.txStreamInterval);
        STATE.txStreamInterval = setInterval(() => {
            if (STATE.mempoolTxs.length < 45 && Math.random() < 0.4) { 
                const newTx = this.generate(1)[0];
                STATE.mempoolTxs.push(newTx);
                STATE.mempoolTxs.sort((a,b) => b.satPerVb - a.satPerVb);
                UI.renderMempool();
                UI.addLiveNodeLog(`💸 Network: ธุรกรรมใหม่ไหลเข้า Mempool แล้ว [Tx: ${newTx.id}]`, 'system');
            }
        }, 2000); 
    },
    replenish() { }
};

var Engine = {
    initNonceUI() {
        STATE.nodeNonceStrategies = STATE.nodeNonceStrategies || {};
        
        const selector = document.getElementById('nonce-strategy-selector');
        if (selector) STATE.nodeNonceStrategies['me'] = selector.value;
        else STATE.nodeNonceStrategies['me'] = 'linear';

        const strats = ['linear', 'random', 'asic', 'reverse', 'evens'];
        CONFIG.NODES.forEach(n => {
            if(!STATE.nodeNonceStrategies[n]) {
                STATE.nodeNonceStrategies[n] = strats[Math.floor(Math.random() * strats.length)];
            }
        });
    },
    
    benchmarkDevice() {
        if (STATE.benchmarkTotalHashes) return; 
        
        UI.addLiveNodeLog("⏳ [SYSTEM] กำลังประเมินสเปค CPU ของคุณเพื่อคำนวณและจัดสรรกำลังขุด...", "system");
        let start = performance.now();
        let count = 0;
        
        while(performance.now() - start < 150) {
            Utils.sha256d("BENCHMARK_TEST_HEADER_DATA_" + count);
            count++;
        }
        
        let hpf = Math.floor((count / 150) * 16.66);
        if(hpf < 10) hpf = 10; 
        if(hpf > 2000) hpf = 2000; 
        
        STATE.benchmarkTotalHashes = hpf;
        let totalHs = Math.floor(hpf * 60);
        UI.addLiveNodeLog(`✅ [SYSTEM] ประเมินเสร็จสิ้น! สเปคเครื่องคุณมีกำลังขุดรวม: ~${totalHs.toLocaleString()} H/s`, "success");
        
        this.calculateNodeLimits();
    },
    calculateNodeLimits() {
        const isBotOn = STATE.isBotMode;
        const activeNodes = CONFIG.NODES.filter(n => !n.startsWith('sat') && !STATE.bannedNodes.has(n));
        STATE.nodeFrameLimits = STATE.nodeFrameLimits || {};
        
        if (!isBotOn) {
            STATE.nodeFrameLimits['me'] = STATE.benchmarkTotalHashes;
        } else {
            let totalNodes = activeNodes.length + 1;
            let baseHpf = STATE.benchmarkTotalHashes / totalNodes;
            
            let sum = 0;
            activeNodes.forEach(n => {
                let offset = 1.0 + (Math.random() * 0.05 - 0.025); 
                let val = Math.max(1, Math.round(baseHpf * offset));
                STATE.nodeFrameLimits[n] = val;
                sum += val;
            });
            
            let myVal = STATE.benchmarkTotalHashes - sum;
            if(myVal < 1) myVal = 1;
            STATE.nodeFrameLimits['me'] = myVal;
        }
    },
    updateHashRateDisplay() {
        const formatHashrate = (hpf) => {
            let hs = hpf * 60; 
            if (hs >= 1000000) return (hs / 1000000).toFixed(2) + ' MH/s';
            if (hs >= 1000) return (hs / 1000).toFixed(2) + ' kH/s';
            return Math.floor(hs) + ' H/s';
        };

        const isBotOn = STATE.isBotMode;
        const activeNodes = CONFIG.NODES.filter(n => !n.startsWith('sat') && !STATE.bannedNodes.has(n));
        
        if (window.UI && window.UI.initTooltip) window.UI.initTooltip();

        const applyTooltip = (el, title, desc, isCursorHelp) => {
            if (!el) return;
            el.removeAttribute('title'); 
            el.dataset.ttTitle = title;
            el.dataset.ttDesc = desc;
            el.style.cursor = isCursorHelp ? 'help' : 'default';

            if (!el.dataset.hasTt) {
                el.addEventListener('mouseenter', (e) => {
                    if (el.style.cursor === 'help' && window.UI && window.UI.showTooltip) {
                        window.UI.showTooltip(e, el.dataset.ttTitle, el.dataset.ttDesc);
                    }
                });
                el.addEventListener('mousemove', (e) => {
                    if (el.style.cursor === 'help' && window.UI && window.UI.moveTooltip) {
                        window.UI.moveTooltip(e);
                    }
                });
                el.addEventListener('mouseleave', () => {
                    if (window.UI && window.UI.hideTooltip) window.UI.hideTooltip();
                });
                el.dataset.hasTt = 'true';
            }
        };

        CONFIG.NODES.forEach(n => {
            const el = document.getElementById(`nd-${n}`);
            if (el && !n.startsWith('sat')) {
                if (isBotOn && activeNodes.includes(n)) {
                    let hr = STATE.nodeFrameLimits[n] || 1;
                    if(STATE.nodeNonceStrategies[n] === 'asic') hr = Math.floor(hr * 1.2); 
                    applyTooltip(el, `Node ${n.toUpperCase()}`, `กำลังขุด (Hash Power): <span class="text-cyan-300 font-bold bg-cyan-900/40 px-1 py-0.5 rounded ml-1">${formatHashrate(hr)}</span>`, true);
                } else {
                    applyTooltip(el, `Node ${n.toUpperCase()}`, `สถานะ: <span class="text-slate-400">Idle (รอรับข้อมูล)</span>`, true);
                }
            }
        });
        
        const meEl = document.getElementById('nd-me');
        if (meEl) {
            let myHr = STATE.nodeFrameLimits['me'] || STATE.benchmarkTotalHashes || 150;
            if(STATE.nodeNonceStrategies['me'] === 'asic') myHr = Math.floor(myHr * 1.2);
            applyTooltip(meEl, `โหนดของคุณ (Miner)`, `กำลังขุด (Hash Power): <span class="text-emerald-300 font-bold bg-emerald-900/40 px-1 py-0.5 rounded ml-1">${formatHashrate(myHr)}</span>`, true);
        }
    },

    evaluateDifficulty() {
        if (!STATE.isBotMode && !STATE.isAutoMiner) {
            STATE.lastBlockTimeMs = Date.now();
            return;
        }

        STATE.blocksSinceLastRetarget = (STATE.blocksSinceLastRetarget || 0) + 1;

        if (STATE.blocksSinceLastRetarget < 5) {
            STATE.lastBlockTimeMs = Date.now();
            this.updateHashRateDisplay();
            return;
        }

        STATE.blocksSinceLastRetarget = 0;

        let currentDiff = parseInt(document.getElementById('input-difficulty').value) || 4;
        let diffChange = 0;
        
        let validTimes = [];
        for (let i = STATE.blockchain.length - 1; i >= 0; i--) {
            const b = STATE.blockchain[i];
            if (b.isCorrupted) continue;
            if (b.timeTaken !== undefined) {
                validTimes.push(b.timeTaken);
            }
            if (validTimes.length >= 5) break;
        }

        let avgSec = 60; 
        if (validTimes.length > 0) {
            avgSec = validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length;
        }

        if (avgSec < 30) { diffChange = 2; } 
        else if (avgSec < 50) { diffChange = 1; } 
        else if (avgSec > 120) { diffChange = -2; } 
        else if (avgSec > 75) { diffChange = -1; }

        if (diffChange !== 0) {
            let newDiff = currentDiff + diffChange;
            if (newDiff < 4) newDiff = 4; 
            
            if (newDiff > 5) newDiff = 5; 
            
            document.getElementById('input-difficulty').value = newDiff;
            
            const hex = (0x1d - Math.min(newDiff, 15)).toString(16);
            const bitsEl = document.getElementById('ui-header-bits');
            if(bitsEl) bitsEl.innerText = '0x' + hex + '00ffff (' + newDiff + ' Zeros)';

            let dirText = diffChange > 0 ? "เพิ่มขึ้น" : "ลดลง"; let levelText = Math.abs(diffChange);
            UI.addLiveNodeLog(`⚙️ [ปรับความยากอัตโนมัติ] ครบกำหนดรอบ 5 บล็อก (Epoch)! เฉลี่ย ${Math.floor(avgSec)} วิ./บล็อก เครือข่าย${dirText} ${levelText} ระดับ -> เป็น Target ${newDiff}`, 'da');
        } else {
            UI.addLiveNodeLog(`⚙️ [ปรับความยากอัตโนมัติ] ครบกำหนดรอบ 5 บล็อก (Epoch)! เฉลี่ย ${Math.floor(avgSec)} วิ./บล็อก อยู่ในเกณฑ์เหมาะสม คง Target ${currentDiff} ไว้ตามเดิม`, 'da');
        }

        STATE.lastBlockTimeMs = Date.now(); 
        this.updateHashRateDisplay();
    }
};
window.Engine = Engine;