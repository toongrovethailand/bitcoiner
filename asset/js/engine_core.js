var Mempool = {
    generate(count = 8) { const types = ['P2PKH', 'SegWit', 'Taproot', 'Lightning', 'Batch Tx', 'Consolidation', 'Spam']; const txs = []; for(let i=0; i<count; i++) { const id = Math.random().toString(16).substring(2, 6); const vb = Math.floor(Math.random() * 400) + 150; const sat = Math.floor(Math.random() * 80) + 5; txs.push({ id: id.padEnd(4, '0'), type: types[Math.floor(Math.random()*types.length)], fee: Math.floor(vb*sat), vb, satPerVb: sat }); } return txs.sort((a,b) => b.satPerVb - a.satPerVb); },
    init() { 
        STATE.mempoolTxs = this.generate(25); 
        STATE.blockTxs = []; 
        UI.renderMempool(); 
        this.startTxStream(); 
    },
    startTxStream() {
        if (STATE.txStreamInterval) clearInterval(STATE.txStreamInterval);
        STATE.txStreamInterval = setInterval(() => {
            if (STATE.mempoolTxs.length < 30 && Math.random() < 0.4) { 
                const newTx = this.generate(1)[0];
                STATE.mempoolTxs.push(newTx);
                STATE.mempoolTxs.sort((a,b) => b.satPerVb - a.satPerVb);
                UI.renderMempool();
                UI.addLiveNodeLog(`💸 Network: ธุรกรรมใหม่ไหลเข้า Mempool แล้ว [Tx: ${newTx.id}]`, 'system');
            }
        }, 4000); 
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
                    if(STATE.nodeNonceStrategies[n] === 'asic') hr = Math.floor(hr * 1.2); // แสดงผล Hashrate ที่โดน Boost แล้ว
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
        if (!STATE.isBotMode) return;
        const elapsedSec = (Date.now() - STATE.lastBlockTimeMs) / 1000;
        let currentDiff = parseInt(document.getElementById('input-difficulty').value) || 3;
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

        let avgSec = elapsedSec;
        if (validTimes.length > 0) {
            avgSec = validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length;
        }

        if (avgSec < 30) { diffChange = 2; } 
        else if (avgSec < 50) { diffChange = 1; } 
        else if (avgSec > 120) { diffChange = -2; } 
        else if (avgSec > 75) { diffChange = -1; }

        if (diffChange !== 0) {
            let newDiff = currentDiff + diffChange;
            if (newDiff < 1) newDiff = 1;
            
            // Fix Bug: แคปความยากสูงสุดไว้ที่ 5 เพื่อป้องกันเบราว์เซอร์ผู้เล่นค้างจากสมการ SHA-256d ที่หนักเกินไป
            if (newDiff > 5) newDiff = 5; 
            
            document.getElementById('input-difficulty').value = newDiff;
            let dirText = diffChange > 0 ? "เพิ่มขึ้น" : "ลดลง"; let levelText = Math.abs(diffChange);
            UI.addLiveNodeLog(`⚙️ [ปรับความยากอัตโนมัติ] ล่าสุด ${Math.floor(elapsedSec)} วิ. (เฉลี่ย ${Math.floor(avgSec)} วิ.) เครือข่าย${dirText} ${levelText} ระดับ -> เป็น Target ${newDiff}!`, 'da');
        }
        STATE.lastBlockTimeMs = Date.now(); 
        
        this.updateHashRateDisplay();
    },
    async syncNetwork() {
        UI.writeLog("กำลังเชื่อมต่อกับเครือข่าย Bitcoin Mainnet เพื่อซิงโครไนซ์ข้อมูลบล็อกล่าสุด...", "process");
        try {
            const res = await Utils.fetchWithTimeout('https://mempool.space/api/v1/blocks', { timeout: CONFIG.API_TIMEOUT_MS });
            const blocks = await res.json(); const tip = blocks[0]; 
            STATE.liveHeight = tip.height; STATE.liveExpectedZeros = Math.floor(8 + Math.log2(tip.difficulty) / 4);
            const d = new Date(tip.timestamp * 1000); 
            const timeStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
            STATE.syncedHash = tip.id; STATE.syncedPrevHash = tip.previousblockhash; STATE.syncedMerkleRoot = tip.merkleroot || Utils.generateHash(); STATE.syncedVersion = tip.versionHex ? `0x${tip.versionHex}` : "0x20000000"; 
            
            const mockBits = `0x170${Math.floor(Math.random() * 65535).toString(16).padStart(4, '0')}`;
            STATE.syncedBits = `${mockBits} (Target ${STATE.liveExpectedZeros} Zeros)`;
            STATE.syncedNonce = tip.nonce || 0; STATE.syncedTime = `${timeStr} (${tip.timestamp})`; STATE.syncedMiner = tip.extras && tip.extras.pool ? tip.extras.pool.name : "Unknown Miner"; STATE.syncedReward = tip.extras && tip.extras.reward ? tip.extras.reward : 312500000; STATE.liveSubsidy = Math.floor(5000000000 / Math.pow(2, Math.floor(STATE.liveHeight / 210000)));
            UI.writeLog(`เชื่อมต่อสำเร็จ ตรวจพบ Block #${STATE.liveHeight.toLocaleString()}`, "success");
        } catch (e) { 
            console.error("Sync error:", e);
            UI.writeLog(`ไม่สามารถเชื่อมต่อเครือข่ายได้: เปลี่ยนเส้นทางเข้าสู่โหมดจำลอง (Offline Mode)`, "error");
            STATE.liveHeight = 840500; STATE.liveSubsidy = 312500000; STATE.syncedHash = Utils.generateHash("00000000"); STATE.syncedPrevHash = Utils.generateHash("00000000"); STATE.syncedMerkleRoot = Utils.generateHash(); STATE.syncedVersion = "0x20000000"; STATE.syncedBits = "0x170664bb (Target 3 Zeros)"; STATE.syncedNonce = 123456789; STATE.syncedTime = Utils.getTimeString() + " (Unknown)"; STATE.syncedMiner = "Offline Simulator"; STATE.syncedReward = 312500000;
        }
        STATE.lastBlockTimeMs = Date.now(); 
        this.initChainState();
    },
    initChainState() {
        STATE.blockchain = []; STATE.prevHash = STATE.syncedHash; 
        STATE.isBotMode = false; 
        STATE.blockchain.push({ height: STATE.liveHeight > 0 ? STATE.liveHeight - 1 : 0, hash: STATE.syncedPrevHash, prevHash: "0000000000000000000000000000000000000000000000000000000000000000", merkleRoot: "Unknown", version: "Unknown", bits: "Unknown", nonce: 0, time: "Older Timestamp", miner: "Previous Network Miner", reward: "Unknown sats", transactions: [] });
        STATE.blockchain.push({ height: STATE.liveHeight, hash: STATE.syncedHash, prevHash: STATE.syncedPrevHash, merkleRoot: STATE.syncedMerkleRoot, version: STATE.syncedVersion, bits: STATE.syncedBits, nonce: STATE.syncedNonce, time: STATE.syncedTime, miner: STATE.syncedMiner, reward: `${STATE.syncedReward.toLocaleString()} sats`, transactions: [] });
        const stripLatest = document.getElementById('strip-latest-height'); if (stripLatest) stripLatest.innerText = `#${STATE.liveHeight.toLocaleString()}`;
        
        const latestBlockDiv = document.getElementById('latest-chain-block');
        if (latestBlockDiv) { 
            const initIdx = STATE.blockchain.length - 1; 
            latestBlockDiv.onclick = () => { UI.showBlockDetails(initIdx); }; 
            let timeSpan = latestBlockDiv.querySelector('.time-ago');
            if (!timeSpan) {
                timeSpan = document.createElement('span');
                timeSpan.className = "text-emerald-400 text-[9px] mt-1 font-bold time-ago";
                latestBlockDiv.appendChild(timeSpan);
            }
            timeSpan.setAttribute('data-ts', STATE.lastBlockTimeMs);
            timeSpan.innerText = Utils.getTimeAgo(STATE.lastBlockTimeMs);
        }
        
        if (Object.keys(STATE.nodeHashOffsets).length === 0) {
            CONFIG.NODES.forEach(n => {
                STATE.nodeHashOffsets[n] = 1.0 + (Math.random() > 0.5 ? 1 : -1) * (0.02 + Math.random() * 0.03);
            });
            STATE.nodeHashOffsets['me'] = 1.0 + (Math.random() > 0.5 ? 1 : -1) * (0.02 + Math.random() * 0.03);
        }

        UI.setHashDisplay('ui-prev-hash', STATE.prevHash); 
        
        this.benchmarkDevice(); 
        this.initNonceUI(); 
        this.updateHashRateDisplay(); 
        
        this.prepareNext(true);
    },
    
    toggleBotMode() {
        AudioEngine.init(); 
        
        STATE.isBotMode = !STATE.isBotMode;
        const isBotOn = STATE.isBotMode;
        
        const bg = document.getElementById('bot-mode-bg');
        const diffInput = document.getElementById('input-difficulty'); 
        const btnBot = document.getElementById('btn-bot-mode');
        
        this.calculateNodeLimits(); 
        this.updateHashRateDisplay();

        if (isBotOn) {
            if(btnBot) {
                btnBot.innerHTML = `🛑 หยุด โหมดท้าทาย`;
                btnBot.className = "flex-1 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-sm sm:text-base font-bold py-3 sm:py-3.5 rounded-xl transition-all border border-rose-400/30 shadow-[0_0_15px_rgba(225,29,72,0.3)] flex justify-center items-center gap-1.5";
            }
            if(bg) bg.classList.remove('opacity-0');
            if(diffInput) { diffInput.disabled = true; diffInput.classList.add('opacity-50', 'cursor-not-allowed'); }
            UI.addLiveNodeLog(`🚨 [SYSTEM] โหมดท้าทายเปิด: บอทเริ่มประมวลผล SHA-256d ของจริงแข่งขันกับคุณแล้ว!`, 'bot');
            UI.showToast("โหมดท้าทายทำงาน: กระจายกำลังขุดจริงให้ทุกโหนดเสร็จสิ้น!", "warning");
            STATE.lastBlockTimeMs = Date.now(); 
            
            if (STATE.botInterval) { clearInterval(STATE.botInterval); STATE.botInterval = null; }
            this.startBotsMining(); 
        } else {
            if(btnBot) {
                btnBot.innerHTML = `⚔️ โหมดท้าทาย`;
                btnBot.className = "flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm sm:text-base font-bold py-3 sm:py-3.5 rounded-xl transition-all border border-violet-400/30 shadow-[0_0_15px_rgba(139,92,246,0.3)] flex justify-center items-center gap-1.5";
            }
            if(bg) bg.classList.add('opacity-0');
            if(diffInput) { diffInput.disabled = false; diffInput.classList.remove('opacity-50', 'cursor-not-allowed'); }
            UI.addLiveNodeLog(`✅ [SYSTEM] โหมดท้าทายถูกปิด คุณได้รับกำลังขุด 100% กลับคืนมา`, 'system');
            
            if (STATE.botInterval) { clearInterval(STATE.botInterval); STATE.botInterval = null; }
            this.stopBotsMining(); 
            if (STATE.isMining) UI.toggleNodeMining('me', true); 
        }
    },

    prepareNext(isStartup = false) {
        UI.setHashDisplay('ui-prev-hash', STATE.prevHash); 
        STATE.blockTxs = []; 
        STATE.minedHash = ""; 
        STATE.minedNonce = 0; 
        
        if (isStartup) { 
            Mempool.init(); 
        } else { 
            UI.renderMempool(); 
        }
        
        const btnMine = document.getElementById('btn-mine'); 
        if(btnMine && !STATE.bannedNodes.has('me')) { 
            btnMine.disabled = false; 
            btnMine.innerText = `⛏️ เริ่มขุด (PoW)`; 
            btnMine.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none'); 
        }
        
        const term = document.getElementById('hash-terminal'); if(term) term.classList.add('hidden');
        document.getElementById('live-node-chat-box').innerHTML = '<div class="text-slate-500 italic text-center mt-2">-- System Ready: รอรับข้อมูลจากเครือข่าย --</div>';
        const statusDot = document.getElementById('net-status-dot'); if (statusDot) { statusDot.classList.replace('bg-emerald-500', 'bg-slate-500'); statusDot.classList.replace('bg-rose-500', 'bg-slate-500'); }
        
        document.querySelectorAll('.net-link').forEach(l => { l.classList.remove('anim-line-flow', 'anim-line-fail', 'anim-line-transmit', 'anim-packet-inv', 'anim-packet-get'); });
        CONFIG.NODES.forEach(n => { const el = document.getElementById('nd-'+n); if(el && !STATE.bannedNodes.has(n)) { el.classList.remove('anim-node-success', 'anim-node-fail', 'anim-node-verifying'); } });
        const meEl = document.getElementById('nd-me'); if (meEl && !STATE.bannedNodes.has('me')) { meEl.classList.remove('anim-node-success', 'anim-node-fail', 'anim-node-verifying'); }
    }
};