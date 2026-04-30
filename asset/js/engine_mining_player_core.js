window.Engine = window.Engine || {};
Object.assign(window.Engine, {
    async toggleAutoMine(skipPrompt = false) {
        if (!STATE.isAutoMiner && !STATE.isBotMode && !skipPrompt) {
            const wantBoth = await (window.Engine.askCrossMode ? window.Engine.askCrossMode("คุณกำลังเริ่มการจำลองแบบอัตโนมัติ") : Promise.resolve(false));
            if (wantBoth) {
                this.executeToggleAutoMine();
                if (window.Engine && window.Engine.toggleBotMode) window.Engine.toggleBotMode(true);
                return;
            }
        }
        this.executeToggleAutoMine();
    },

    executeToggleAutoMine() {
        STATE.isAutoMiner = !STATE.isAutoMiner;
        this.updateAutoMineButtonUI();
        
        if (STATE.isAutoMiner) {
            if (window.UI && window.UI.showToast) UI.showToast("🤖 โหมดขุดอัตโนมัติทำงาน!", "success");
            this.runAutoMiner();
        } else {
            if (window.UI && window.UI.showToast) UI.showToast("🛑 ปิดโหมดขุดอัตโนมัติ", "warning");
            if (STATE.autoMinerTimeout) clearTimeout(STATE.autoMinerTimeout);
        }
    },

    updateAutoMineButtonUI() {
        const btn = document.getElementById('btn-auto-mine');
        if(!btn) return;
        if (STATE.isAutoMiner) {
            btn.innerHTML = `<span class="relative z-10 animate-spin">⚙️</span> <span class="relative z-10 tracking-wide">กำลังขุดอัตโนมัติ...</span> <span class="relative z-10 text-[9px] bg-rose-500/20 border border-rose-500/50 px-1.5 py-0.5 rounded-full ml-1 text-rose-100 uppercase tracking-widest">Stop</span>`;
            btn.className = "flex-1 bg-gradient-to-r from-rose-950 to-red-950 hover:from-rose-900 hover:to-red-900 text-rose-200 text-sm sm:text-base font-bold py-3 sm:py-3.5 rounded-xl transition-all duration-300 border border-rose-700/60 hover:border-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.2)] hover:shadow-[0_0_20px_rgba(225,29,72,0.4)] flex justify-center items-center gap-2 relative overflow-hidden group";
        } else {
            btn.innerHTML = `<div class="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div><span class="relative z-10 group-hover:animate-bounce">⚡</span> <span class="relative z-10 tracking-wide">โหมดขุดอัตโนมัติ</span> <span class="relative z-10 text-[9px] bg-cyan-500/20 border border-cyan-500/50 px-1.5 py-0.5 rounded-full ml-1 text-cyan-100 uppercase tracking-widest shadow-[0_0_5px_rgba(6,182,212,0.5)]">Auto</span>`;
            btn.className = "flex-1 bg-gradient-to-r from-slate-800 to-cyan-950 hover:from-slate-700 hover:to-cyan-900 text-cyan-300 text-sm sm:text-base font-bold py-3 sm:py-3.5 rounded-xl transition-all duration-300 border border-cyan-800/60 hover:border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] flex justify-center items-center gap-2 relative overflow-hidden group";
        }
    },
    runAutoMiner() {
        if (!STATE.isAutoMiner) return;
        
        if (!STATE.isMining && !STATE.isBroadcasting && !STATE.chainCorrupted && !STATE.bannedNodes.has('me')) {
            STATE.manualFee = false;
            if (window.App && typeof window.App.autoFillFromMempool === 'function') {
                window.App.autoFillFromMempool();
            }
            
            // นำการสุ่มกลยุทธ์ Nonce ออก ให้ระบบใช้ค่าที่ถูกเลือกใน UI ตามปกติ
            
            setTimeout(() => {
                if (STATE.isAutoMiner && !STATE.isMining && !STATE.isBroadcasting && !STATE.bannedNodes.has('me')) {
                    if (typeof this.mine === 'function') {
                        this.mine();
                    }
                }
            }, 1000); 
        }
        
        if (STATE.autoMinerTimeout) clearTimeout(STATE.autoMinerTimeout);
        STATE.autoMinerTimeout = setTimeout(() => this.runAutoMiner(), 3000);
    },
    abortMining() {
        if(STATE.miningReq) cancelAnimationFrame(STATE.miningReq);
        if(STATE.timerInterval) clearInterval(STATE.timerInterval);
        STATE.isMining = false; STATE.minedHash = ""; STATE.minedNonce = 0; 
        if (window.UI) UI.toggleNodeMining('me', false); 
        if (window.UI) UI.toggleModal('hash-modal', false);
        const btnMine = document.getElementById('btn-mine');
        
        const prevHashEl = document.getElementById('ui-prev-hash');
        if (prevHashEl && STATE.prevHash !== prevHashEl.getAttribute('data-full')) {
            if (btnMine) { btnMine.disabled = false; btnMine.innerText = "⛏️ เริ่มขุดใหม่ (Stale Block)"; btnMine.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none'); }
        } else {
            if (btnMine) { btnMine.disabled = false; btnMine.innerText = "⛏️ เริ่มขุด (PoW)"; btnMine.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none'); }
        }
        
        if (window.UI) UI.addLiveNodeLog(`🛑 คุณหยุดการขุดบล็อกปัจจุบัน`, 'system');
    },
    mine() {
        if (STATE.bannedNodes.has('me')) { if (window.UI) UI.showToast("☠️ โหนดของคุณกำลังถูกแบนชั่วคราว! โปรดรอให้บอทขุดผ่านไป 2-4 บล็อก", "error"); return; }
        
        if (STATE.chainCorrupted) { 
            if (window.UI) UI.showToast("⚠️ สายโซ่พังทลายจากการแก้ไขข้อมูล! ขุดต่อไปก็ไม่มีใครยอมรับ โปรดกดปุ่มเริ่มใหม่", "error"); 
            if (window.UI) UI.addLiveNodeLog("🛑 ระบบปฏิเสธการขุด: สายโซ่ Invalid จากการแทรกแซงข้อมูล (Avalanche Effect)", "error");
            return; 
        }
        
        if (STATE.isMining) return; 
        
        STATE.isMining = true;
        if (window.UI) UI.toggleNodeMining('me', true); 
        if (window.AudioEngine) AudioEngine.init(); 
        
        let diffInput = document.getElementById('input-difficulty');
        let diff = diffInput ? (parseInt(diffInput.value) || 4) : 4;
        const target = '0'.repeat(Math.min(diff, 64)); const btn = document.getElementById('btn-mine');
        const termModal = document.getElementById('hash-terminal-modal'); const outModal = document.getElementById('hash-output-modal');
        const timerEl = document.getElementById('mining-timer');
        
        STATE.minedVersion = "0x20000000"; 
        STATE.minedTimeRaw = Math.floor(Date.now() / 1000).toString();
        let exp = 32 - Math.floor(diff / 2);
        let coeff = (diff % 2 !== 0) ? '0fffff' : 'ffffff';
        STATE.minedBitsRaw = '0x' + exp.toString(16) + coeff; 
        
        if(btn) { 
            btn.disabled = true; 
            btn.innerText = "กำลังประมวลผล PoW..."; 
            btn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        }
        if (window.App && window.App.toggleModal) window.App.toggleModal('hash-modal', true);
        
        let strat = STATE.nodeNonceStrategies['me'] || 'linear';
        const stratInfo = {
            'linear': { name: "Sequential", eq: "Nonce++" },
            'random': { name: "Stochastic", eq: "Random" },
            'asic':   { name: "ASIC Boost", eq: "Nonce+=7" },
            'reverse':{ name: "Decrement", eq: "Nonce--" },
            'evens':  { name: "Evens Only", eq: "Nonce+=2" }
        };
        let info = stratInfo[strat] || stratInfo['linear'];

        if(outModal) { 
            outModal.innerHTML = `<div class="text-cyan-400 font-bold">> Constructing Block Header (80 bytes)...</div>
            <div class="text-slate-400 opacity-90 ml-2 mt-1">├ <span class="text-white">Version:</span> ${STATE.minedVersion}</div>
            <div class="text-slate-400 opacity-90 ml-2">├ <span class="text-white">PrevHash:</span> ${Utils.shortenHash(STATE.prevHash)}</div>
            <div class="text-fuchsia-400 font-bold ml-2">├ <span class="text-white">MerkleRoot:</span> ${Utils.shortenHash(STATE.merkleRoot)}</div>
            <div class="text-slate-400 opacity-90 ml-2">├ <span class="text-white">Timestamp:</span> ${STATE.minedTimeRaw}</div>
            <div class="text-amber-400 font-bold ml-2">├ <span class="text-white">Bits (Target):</span> ${STATE.minedBitsRaw}</div>
            <div class="text-slate-400 opacity-90 ml-2 mb-2 group relative w-max cursor-help z-50">└ <span class="text-white border-b border-dashed border-slate-500">Nonce Strategy:</span> [ ${info.name} : ${info.eq} ]</div>
            <div class="text-amber-400 font-bold mb-2">> Start SHA-256d Hashing (Real computation)...</div>`; 
            
            if (termModal) {
                termModal.classList.remove('scroll-smooth'); 
                termModal.scrollTop = termModal.scrollHeight; 
            }
        }
        if(timerEl) timerEl.innerText = "00:00.00";
        
        let nonce = 0; let found = false; 
        let startT = Date.now(); 
        let totalPausedTime = 0; 
        let pauseStartT = 0;     
        
        const blockHeaderStr = STATE.minedVersion + STATE.prevHash + STATE.merkleRoot + STATE.minedTimeRaw + STATE.minedBitsRaw;

        if (STATE.timerInterval) clearInterval(STATE.timerInterval);
        
        STATE.timerInterval = setInterval(() => {
            if(found || STATE.isBroadcasting || !STATE.isMining) return; 
            const e = Date.now() - startT - totalPausedTime; 
            const m = Math.floor(e/60000).toString().padStart(2,'0'); 
            const s = Math.floor((e%60000)/1000).toString().padStart(2,'0'); 
            const ms = Math.floor((e%1000)/10).toString().padStart(2,'0'); 
            if(timerEl) timerEl.innerText = `${m}:${s}.${ms}`;
        }, 10);

        let isPausedUI = false;

        const loop = () => {
            if (found || !STATE.isMining) return; 
            
            if (STATE.isBroadcasting) {
                if (!isPausedUI) {
                    pauseStartT = Date.now();
                    
                    if(outModal) {
                        outModal.innerHTML += `
                        <div class="mt-3 mb-2 p-3 bg-amber-950/60 border border-amber-500/50 rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.15)]" id="pause-msg">
                            <div class="text-amber-400 font-bold mb-1.5 flex items-center gap-1.5 text-xs sm:text-sm">
                                <span class="animate-pulse">⏳</span> [INTERRUPT: INBOUND_BLOCK_VALIDATION]
                            </div>
                            <div class="text-amber-200/80 text-[10px] sm:text-[11px] leading-relaxed font-sans text-justify">
                                โหนดตรวจพบ Block Advertisement ใหม่เข้าสู่เส้นทาง Gossip ของเครือข่าย เราได้ทำการระงับเครื่องขุดชั่วคราวเพื่อป้องกันการเกิด Chain Split (Fork) 
                            </div>
                        </div>`;
                    }
                    if(termModal) termModal.scrollTop = termModal.scrollHeight; isPausedUI = true;
                }
                STATE.miningReq = requestAnimationFrame(loop); return;
            } else if (isPausedUI) {
                totalPausedTime += Date.now() - pauseStartT; 
                const pMsg = document.getElementById('pause-msg'); if (pMsg) pMsg.remove();
                
                if(outModal) outModal.innerHTML += `<div class="text-emerald-500 mt-2 font-bold">> บล็อกขยะถูก Reject! เครื่องขุดทำงานต่อ...</div>`;
                if(termModal) termModal.scrollTop = termModal.scrollHeight; isPausedUI = false;
            }

            let limit = STATE.nodeFrameLimits['me'] || 150;
            if (strat === 'asic') limit = Math.floor(limit * 1.2); 
            
            for(let i=0; i<limit; i++) {
                if (strat === 'linear') {
                    nonce++;
                } else if (strat === 'random') {
                    nonce = Math.floor(Math.random() * 4294967296);
                } else if (strat === 'asic') {
                    nonce = (nonce + 7) % 4294967296;
                } else if (strat === 'reverse') {
                    nonce = nonce > 0 ? nonce - 1 : 4294967295;
                } else if (strat === 'evens') {
                    nonce = (nonce + 2) % 4294967296;
                    if (nonce % 2 !== 0) nonce++; 
                }
                
                let header = blockHeaderStr + nonce.toString();
                let realHash = Utils.sha256d(header);
                
                if (realHash.startsWith(target)) {
                    found = true; STATE.isMining = false; 
                    if(window.UI) UI.toggleNodeMining('me', false); 
                    clearInterval(STATE.timerInterval); STATE.minedHash = realHash; STATE.minedNonce = nonce;
                    
                    STATE.exactMiningTimeSec = Math.max(0, Math.floor((Date.now() - startT - totalPausedTime) / 1000));
                    STATE.minedNonceMethod = info.name; STATE.minedNonceEq = info.eq;

                    const content = document.getElementById('hash-modal-content');
                    if (content && content.classList.contains('hash-minimized') && window.UI) { UI.minimizeMining(); }

                    if(outModal) { 
                        outModal.innerHTML += `<div class="text-emerald-400 mt-4 text-sm bg-emerald-950/60 p-4 rounded-lg border border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] mb-2 relative overflow-hidden">
                            <div class="absolute inset-0 bg-emerald-500/20 animate-pulse"></div>
                            <div class="relative z-10">
                                <span class="font-bold text-emerald-300 mb-1 block text-lg">🎉 ขุดสำเร็จ! คุณคือผู้พบบล็อกนี้!</span>
                                <span class="text-white block mb-2">ระบบกำลังเตรียมตรวจสอบความถูกต้อง...</span>
                                <span class="text-emerald-200 block break-all font-mono text-[10px] bg-black/50 p-2 rounded">Hash: ${STATE.minedHash}</span>
                            </div>
                        </div>`; 
                    }
                    if(termModal) termModal.scrollTop = termModal.scrollHeight; 
                    if(window.AudioEngine) AudioEngine.sfxFound(); 
                    
                    setTimeout(() => { 
                        if(btn) { btn.innerText = "กำลังอัปเดตเครือข่าย..."; } 
                        if(window.App && window.App.toggleModal) window.App.toggleModal('hash-modal', false);
                        
                        const checkGossip = setInterval(() => {
                            if (!STATE.globalGossipActive) {
                                clearInterval(checkGossip);
                                if (typeof this.broadcast === 'function') {
                                    this.broadcast();
                                } else {
                                    console.error("Broadcast function is missing! Is engine_mining_player_broadcast.js loaded?");
                                }
                            }
                        }, 500);
                        
                    }, 1200); 
                    return;
                }
                
                if (i === limit - 1 && outModal) { 
                    const logDiv = document.createElement('div'); logDiv.className = "mb-1 border-b border-slate-800/40 pb-1"; 
                    logDiv.innerHTML = `<span class="text-slate-500">> Hashing (SHA256d)... Nonce: ${nonce}</span><br><span class="text-slate-300 opacity-50">${realHash}</span>`; 
                    outModal.appendChild(logDiv); 
                    while (outModal.children.length > 100) { outModal.removeChild(outModal.firstChild); } 
                    if (termModal) termModal.scrollTop = termModal.scrollHeight; 
                }
            }
            STATE.miningReq = requestAnimationFrame(loop);
        };
        setTimeout(loop, 400); 
    }
});