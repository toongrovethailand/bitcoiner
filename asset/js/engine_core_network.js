window.Engine = window.Engine || {};
Object.assign(window.Engine, {
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
            STATE.liveHeight = 840500; STATE.liveSubsidy = 312500000; STATE.syncedHash = Utils.generateHash("00000000"); STATE.syncedPrevHash = Utils.generateHash("00000000"); STATE.syncedMerkleRoot = Utils.generateHash(); STATE.syncedVersion = "0x20000000"; STATE.syncedBits = "0x1effffff (Target 4 Zeros)"; STATE.syncedNonce = 123456789; STATE.syncedTime = Utils.getTimeString() + " (Unknown)"; STATE.syncedMiner = "Offline Simulator"; STATE.syncedReward = 312500000;
        }
        STATE.lastBlockTimeMs = Date.now(); 
        this.initChainState();
    },
    initChainState() {
        STATE.blockchain = []; STATE.prevHash = STATE.syncedHash; 
        STATE.isBotMode = false; 
        STATE.blocksSinceLastRetarget = 0; 
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
    
    askCrossMode(questionHTML) {
        return new Promise(resolve => {
            const html = `
                <div id="cross-mode-modal" class="fixed inset-0 bg-black/90 backdrop-blur-md z-[600] flex items-center justify-center p-4 transition-opacity duration-300">
                    <div class="bg-[#050B14] border border-cyan-600/50 rounded-xl flex flex-col w-full max-w-sm shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden transform scale-100 transition-transform duration-300">
                        <div class="bg-cyan-950/80 px-4 py-4 border-b border-cyan-800/50 flex justify-center items-center text-center">
                            <span class="text-cyan-400 font-bold flex items-center gap-2 text-base sm:text-lg">⚙️ เปิดใช้งานระบบขุดอัตโนมัติทั้งคุณและบอท ?</span>
                        </div>
                        <div class="p-6 font-sans text-sm text-slate-300 text-center space-y-4">
                            <p class="text-slate-400 text-xs sm:text-sm leading-relaxed" id="cross-mode-question"></p>
                            <div class="flex gap-3 justify-center pt-2">
                                <button id="btn-cross-yes" class="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 px-6 rounded-lg shadow transition-all w-full border border-emerald-500/50 hover:border-emerald-400">ใช่</button>
                                <button id="btn-cross-no" class="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold py-2.5 px-6 rounded-lg border border-slate-700 hover:border-slate-500 transition-all w-full">ไม่</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);
            document.getElementById('cross-mode-question').innerHTML = questionHTML;
            document.getElementById('btn-cross-yes').onclick = () => {
                document.getElementById('cross-mode-modal').remove();
                resolve(true);
            };
            document.getElementById('btn-cross-no').onclick = () => {
                document.getElementById('cross-mode-modal').remove();
                resolve(false);
            };
        });
    },

    async toggleBotMode(skipPrompt = false) {
        if (!STATE.isBotMode && !STATE.isAutoMiner && !skipPrompt) {
            const wantBoth = await this.askCrossMode("คุณกำลังเริ่มการจำลองแบบอัตโนมัติ");
            if (wantBoth) {
                this.executeToggleBotMode();
                if (window.Engine && window.Engine.toggleAutoMine) window.Engine.toggleAutoMine(true);
                return;
            }
        }
        this.executeToggleBotMode();
    },

    executeToggleBotMode() {
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
                btnBot.innerHTML = `<span class="relative z-10 animate-pulse">🛑</span> <span class="relative z-10 tracking-wide">หยุดโหมดท้าทาย</span> <span class="relative z-10 text-[9px] bg-rose-500/20 border border-rose-500/50 px-1.5 py-0.5 rounded-full ml-1 text-rose-100 uppercase tracking-widest">Stop</span>`;
                btnBot.className = "flex-1 bg-gradient-to-r from-rose-950 to-red-950 hover:from-rose-900 hover:to-red-900 text-rose-200 text-sm sm:text-base font-bold py-3 sm:py-3.5 rounded-xl transition-all duration-300 border border-rose-700/60 hover:border-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.2)] hover:shadow-[0_0_20px_rgba(225,29,72,0.4)] flex justify-center items-center gap-2 relative overflow-hidden group";
            }
            if(bg) bg.classList.remove('opacity-0');
            if(diffInput) { diffInput.disabled = true; diffInput.classList.add('opacity-50', 'cursor-not-allowed'); }
            UI.addLiveNodeLog(`🚨 [SYSTEM] โหมดท้าทายเปิด: บอทเริ่มประมวลผล SHA-256d ของจริงแข่งขันกับคุณแล้ว!`, 'bot');
            UI.showToast("โหมดท้าทายทำงาน: กระจายกำลังขุดจริงให้ทุกโหนดเสร็จสิ้น!", "warning");
            
            STATE.lastBlockTimeMs = Date.now(); 
            STATE.blocksSinceLastRetarget = 0; 
            
            if (STATE.botInterval) { clearInterval(STATE.botInterval); STATE.botInterval = null; }
            this.startBotsMining(); 
        } else {
            if(btnBot) {
                btnBot.innerHTML = `<div class="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-fuchsia-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div><span class="relative z-10 group-hover:animate-bounce">⚔️</span> <span class="relative z-10 tracking-wide">โหมดท้าทาย</span> <span class="relative z-10 text-[9px] bg-fuchsia-500/20 border border-fuchsia-500/50 px-1.5 py-0.5 rounded-full ml-1 text-fuchsia-100 uppercase tracking-widest shadow-[0_0_5px_rgba(217,70,239,0.5)]">Bot</span>`;
                btnBot.className = "flex-1 bg-gradient-to-r from-slate-800 to-fuchsia-950 hover:from-slate-700 hover:to-fuchsia-900 text-fuchsia-300 text-sm sm:text-base font-bold py-3 sm:py-3.5 rounded-xl transition-all duration-300 border border-fuchsia-800/60 hover:border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.15)] hover:shadow-[0_0_20px_rgba(217,70,239,0.3)] flex justify-center items-center gap-2 relative overflow-hidden group";
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
});