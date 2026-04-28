window.Engine = window.Engine || {};
Object.assign(window.Engine, {
    abortMining() {
        if(STATE.miningReq) cancelAnimationFrame(STATE.miningReq);
        if(STATE.timerInterval) clearInterval(STATE.timerInterval);
        STATE.isMining = false; STATE.minedHash = ""; STATE.minedNonce = 0; 
        UI.toggleNodeMining('me', false); 
        UI.toggleModal('hash-modal', false);
        const btnMine = document.getElementById('btn-mine');
        
        if (STATE.prevHash !== document.getElementById('ui-prev-hash').getAttribute('data-full')) {
            if (btnMine) { btnMine.disabled = false; btnMine.innerText = "⛏️ เริ่มขุดใหม่ (Stale Block)"; btnMine.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none'); }
        } else {
            if (btnMine) { btnMine.disabled = false; btnMine.innerText = "⛏️ เริ่มขุด (PoW)"; btnMine.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none'); }
        }
        
        UI.addLiveNodeLog(`🛑 คุณหยุดการขุดบล็อกปัจจุบัน`, 'system');
    },
    mine() {
        if (STATE.bannedNodes.has('me')) { UI.showToast("☠️ โหนดของคุณถูกแบนถาวร! โปรดกด 'เริ่มรอบใหม่'", "error"); return; }
        
        if (STATE.chainCorrupted) { 
            UI.showToast("⚠️ สายโซ่พังทลายจากการแก้ไขข้อมูล! ขุดต่อไปก็ไม่มีใครยอมรับ โปรดกดปุ่มเริ่มใหม่", "error"); 
            UI.addLiveNodeLog("🛑 ระบบปฏิเสธการขุด: สายโซ่ Invalid จากการแทรกแซงข้อมูล (Avalanche Effect)", "error");
            return; 
        }
        
        if (STATE.isMining) return; 
        
        STATE.isMining = true;
        UI.toggleNodeMining('me', true); 
        AudioEngine.init(); let diff = parseInt(document.getElementById('input-difficulty').value) || 3;
        const target = '0'.repeat(Math.min(diff, 64)); const btn = document.getElementById('btn-mine');
        const termModal = document.getElementById('hash-terminal-modal'); const outModal = document.getElementById('hash-output-modal');
        const timerEl = document.getElementById('mining-timer');
        
        STATE.minedVersion = "0x20000000"; 
        const mockBits = `0x170${Math.floor(Math.random() * 65535).toString(16).padStart(4, '0')}`;
        STATE.minedBits = `${mockBits} (Target ${diff} Zeros)`; 
        
        if(btn) { 
            btn.disabled = true; 
            btn.innerText = "กำลังประมวลผล PoW..."; 
            btn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        }
        window.App.toggleModal('hash-modal', true);
        
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
        
        const blockHeaderStr = STATE.minedVersion + STATE.prevHash + STATE.merkleRoot + STATE.minedBits;

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
                                โหนดตรวจพบ Block Advertisement ใหม่เข้าสู่เส้นทาง Gossip ของเครือข่าย เราได้ทำการระงับเครื่องขุดชั่วคราวเพื่อป้องกันการเกิด Chain Split (Fork) เนื่องจาก Simulator เวอร์ชันนี้ยังไม่ได้เปิดใช้งานฟังก์ชัน Reorg เพื่อจัดการความขัดแย้งหากขุดเจอพร้อมกัน เพื่อรักษาความเสถียรของสมุดบัญชี โปรดรอโหนดของคุณทำการ Verify กฎกติกา (Consensus Rules) ให้เสร็จสิ้นก่อนเริ่มการขุดรอบถัดไป
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
                    found = true; STATE.isMining = false; UI.toggleNodeMining('me', false); clearInterval(STATE.timerInterval); STATE.minedHash = realHash; STATE.minedNonce = nonce;
                    
                    STATE.exactMiningTimeSec = Math.max(0, Math.floor((Date.now() - startT - totalPausedTime) / 1000));
                    
                    const stratInfo = {
                        'linear': { name: "Sequential", eq: "Nonce++" },
                        'random': { name: "Stochastic", eq: "Random(0, 2^32-1)" },
                        'asic':   { name: "ASIC Boost", eq: "Nonce += 7" },
                        'reverse':{ name: "Decrement", eq: "Nonce--" },
                        'evens':  { name: "Evens Only", eq: "Nonce += 2" }
                    };
                    let info = stratInfo[strat] || stratInfo['linear'];
                    STATE.minedNonceMethod = info.name;
                    STATE.minedNonceEq = info.eq;

                    const content = document.getElementById('hash-modal-content');
                    if (content && content.classList.contains('hash-minimized')) { UI.minimizeMining(); }

                    if(outModal) { 
                        outModal.innerHTML += `<div class="text-emerald-400 mt-4 text-sm bg-emerald-950/60 p-4 rounded-lg border border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] mb-2 relative overflow-hidden">
                            <div class="absolute inset-0 bg-emerald-500/20 animate-pulse"></div>
                            <div class="relative z-10">
                                <span class="font-bold text-emerald-300 mb-1 block text-lg">🎉 ขุดสำเร็จ! คุณคือผู้พบบล็อกนี้!</span>
                                <span class="text-white block mb-2">ระบบกำลังเตรียมกระจายข้อมูลให้เครือข่ายอัตโนมัติ...</span>
                                <span class="text-emerald-200 block break-all font-mono text-[10px] bg-black/50 p-2 rounded">Hash: ${STATE.minedHash}</span>
                            </div>
                        </div>`; 
                    }
                    if(termModal) termModal.scrollTop = termModal.scrollHeight; AudioEngine.sfxFound(); 
                    
                    setTimeout(() => { 
                        if(btn) { btn.innerText = "กำลังอัปเดตเครือข่าย..."; } 
                        window.App.toggleModal('hash-modal', false);
                        this.broadcast();
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
    },
    async broadcast() {
        if (STATE.bannedNodes.has('me')) { UI.showToast("☠️ โหนดของคุณถูกแบนถาวร! โปรดกด 'เริ่มรอบใหม่'", "error"); return; }
        if (!STATE.minedHash) { UI.showToast("คุณต้องขุดเจอบล็อก (Valid Hash) ก่อนกระจายข้อมูล", "warning"); return; }
        
        STATE.isBroadcasting = true; 
        if(STATE.isBotMode) this.stopBotsMining(); 
        
        const isOversize = document.getElementById('cb-oversize')?.checked || false; const isBadTime = document.getElementById('cb-badtime')?.checked || false; const isDoubleSpend = document.getElementById('cb-doublespend')?.checked || false; const isBadSig = document.getElementById('cb-badsig')?.checked || false;
        const totalClaimed = (parseInt(document.getElementById('input-subsidy')?.value) || 0) + (parseInt(document.getElementById('input-fee')?.value) || 0); const totalAllowed = STATE.liveSubsidy + STATE.actualFee; const overClaimed = totalClaimed > totalAllowed; const underClaimed = totalClaimed < totalAllowed;
        const isInvalid = isOversize || isBadTime || isDoubleSpend || isBadSig || overClaimed;
        
        const statusDot = document.getElementById('net-status-dot'); if(statusDot) statusDot.classList.replace('bg-slate-500', isInvalid ? 'bg-rose-500' : 'bg-emerald-500');
        
        const box = document.getElementById('live-node-chat-box');
        if(box) {
            const readyMsg = box.querySelector('.italic');
            if (readyMsg) readyMsg.remove();
        }
        UI.addLiveNodeLog(`🚀 คุณ (Miner) เจอ Block: ส่งข้อความสะกิดเพื่อนบ้านรัวๆ...`, 'system');
        
        const myWaves = Utils.generateGossipWaves('me');
        for (const wave of myWaves) {
            wave.lines.forEach(l => { const el = document.getElementById(l); if(el) { el.classList.remove('anim-line-flow', 'anim-line-fail', 'anim-line-transmit', 'anim-packet-get'); el.classList.add('anim-packet-inv'); } });
            wave.nodes.forEach(n => { let msg = getRandomChat('inv'); UI.showNodeChat(n, "📩 INV", "text-amber-400 border-amber-500/50"); UI.addLiveNodeLog(`Node ${n.replace('nd-','').toUpperCase()}: "${msg}"`, 'inv'); }); 
            await Utils.sleep(500); 
            
            wave.lines.forEach(l => { const el = document.getElementById(l); if(el) { el.classList.remove('anim-packet-inv'); el.classList.add('anim-packet-get'); } });
            wave.nodes.forEach(n => { let msg = getRandomChat('getdata'); UI.showNodeChat(n, "📤 GET", "text-fuchsia-400 border-fuchsia-500/50"); const el = document.getElementById(n); if(el) el.classList.add('anim-node-verifying'); UI.addLiveNodeLog(`Node ${n.replace('nd-','').toUpperCase()} -> คุณ: "${msg}"`, 'getdata'); }); 
            await Utils.sleep(500); 
            
            wave.lines.forEach(l => { const el = document.getElementById(l); if(el) { el.classList.remove('anim-packet-get'); el.classList.add('anim-line-transmit'); } });
            wave.nodes.forEach(n => { let msg = getRandomChat('block'); UI.showNodeChat(n, "📦 BLK", "text-cyan-400 border-cyan-500/50"); UI.addLiveNodeLog(`คุณ -> Node ${n.replace('nd-','').toUpperCase()}: "${msg}"`, 'block'); }); 
            await Utils.sleep(500);
            
            wave.nodes.forEach(n => { 
                const el = document.getElementById(n); if(el) { el.classList.remove('anim-node-verifying'); el.classList.add(isInvalid ? 'anim-node-fail' : 'anim-node-success'); } 
                let msg = isInvalid ? getRandomChat('reject') : getRandomChat('accept');
                UI.showNodeChat(n, isInvalid ? "🛡️ REJECT" : "✅ ACCEPTED", isInvalid ? "text-amber-400 border-amber-500/50" : "text-emerald-400 border-emerald-500/50"); 
                const logAction = isInvalid ? "ปฏิเสธบล็อกและแบนโหนดคุณ" : "ตรวจสอบผ่านและยอมรับบล็อกของคุณ";
                UI.addLiveNodeLog(`Node ${n.replace('nd-','').toUpperCase()} ${logAction}: "${msg}"`, isInvalid ? "reject" : "accept");
            });
            wave.lines.forEach(l => { const el = document.getElementById(l); if(el) { el.classList.remove('anim-line-transmit'); el.classList.add(isInvalid ? 'anim-line-fail' : 'anim-line-flow'); } });
            
            if (isInvalid) { UI.banNode('me'); UI.addLiveNodeLog(`🚨 [NETWORK] โหนดคุณ (ME) ถูกเครือข่ายแบนถาวร!`, 'system'); await Utils.sleep(500); Utils.healNetwork(); break; }
        }

        UI.toggleModal('log-modal', true); UI.writeLog(`=== เริ่มกระบวนการตรวจสอบความถูกต้องของบล็อก (Block Validation) ===`, "warning"); 
        UI.writeLog(`ได้รับข้อมูล Candidate Block #${(STATE.liveHeight + 1).toLocaleString()} (Local Node) เข้าสู่กระบวนการตรวจสอบ`, "process"); 
        await Utils.sleep(600);
        
        let failed = false;
        if (STATE.minedHash) { UI.writeLog(`ตรวจสอบ Proof-of-Work: ผ่าน (Hash Header มีค่าน้อยกว่า Target)`, "success"); } else { failed = true; }
        if (!failed) { await Utils.sleep(200); if (isOversize) { UI.writeLog(`ตรวจสอบขนาดบล็อก: ไม่ผ่าน (บล็อกมีขนาดเกินขีดจำกัด 4M WU)`, "error"); failed = true; } else { UI.writeLog(`ตรวจสอบขนาดบล็อก: ผ่าน (ขนาดอยู่ในเกณฑ์ที่กำหนด)`, "success"); } }
        if (!failed) { await Utils.sleep(200); if (isBadTime) { UI.writeLog(`ตรวจสอบเวลา (Timestamp): ไม่ผ่าน (เวลาไม่สอดคล้องกับเครือข่าย)`, "error"); failed = true; } else { UI.writeLog(`ตรวจสอบเวลา (Timestamp): ผ่าน (เวลาสอดคล้องกับเครือข่าย)`, "success"); } }
        if (!failed) { await Utils.sleep(200); if (isDoubleSpend) { UI.writeLog(`ตรวจสอบ UTXO: ไม่ผ่าน (พบการใช้จ่ายซ้ำซ้อน - Double Spend)`, "error"); failed = true; } else { UI.writeLog(`ตรวจสอบ UTXO: ผ่าน (ไม่พบการใช้จ่ายซ้ำซ้อน)`, "success"); } }
        if (!failed) { await Utils.sleep(200); if (isBadSig) { UI.writeLog(`ตรวจสอบลายเซ็นดิจิทัล: ไม่ผ่าน (ลายเซ็นไม่ถูกต้อง)`, "error"); failed = true; } else { UI.writeLog(`ตรวจสอบลายเซ็นดิจิทัล: ผ่าน (ลายเซ็นถูกต้อง)`, "success"); } }
        if (!failed) { await Utils.sleep(200); if (overClaimed) { UI.writeLog(`ตรวจสอบรางวัล Coinbase: ไม่ผ่าน (สร้างเหรียญเกินจำนวนที่กำหนด)`, "error"); failed = true; } else { UI.writeLog(`ตรวจสอบรางวัล Coinbase: ผ่าน (จำนวนเหรียญถูกต้อง)`, "success"); } }

        await Utils.sleep(400);
        if (failed || isInvalid) {
            UI.writeLog("ปฏิเสธบล็อก: พบการละเมิดกฎ Consensus ยกเลิกการบันทึกและแบนโหนดที่ส่งมา", "error"); AudioEngine.sfxFinalReject();
        } else {
            UI.writeLog("ตรวจสอบเสร็จสิ้น: ข้อมูลถูกต้องตามกฎ Consensus ทำการบันทึกลงสู่ Blockchain", "final-success"); 
            AudioEngine.sfxFinalSuccess();
            
            if (typeof UI.shootFireworks === 'function') {
                UI.shootFireworks();
            }
            UI.showToast(`🎉 เยี่ยมมาก! บล็อกของคุณถูกบันทึกลงเชนแล้ว (ได้รับ ${totalClaimed.toLocaleString()} sats)`, 'success');
            
            const now = Math.floor(Date.now() / 1000); const d = new Date(now * 1000); const finalTimeStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')} (${now})`;
            
            const mockBits = `0x170${Math.floor(Math.random() * 65535).toString(16).padStart(4, '0')}`;
            let diff = parseInt(document.getElementById('input-difficulty').value) || 3;

            const newBlock = { 
                height: STATE.liveHeight + 1, hash: STATE.minedHash, prevHash: STATE.prevHash, merkleRoot: STATE.merkleRoot, 
                version: STATE.minedVersion, bits: `${mockBits} (Target ${diff} Zeros)`, 
                nonce: STATE.minedNonce, nonceMethod: STATE.minedNonceMethod, nonceEq: STATE.minedNonceEq, 
                time: finalTimeStr, miner: "คุณ (Simulator)", reward: `${totalClaimed.toLocaleString()} sats`, transactions: [...STATE.blockTxs], 
                timeTaken: STATE.exactMiningTimeSec !== undefined ? STATE.exactMiningTimeSec : Math.max(0, Math.floor((Date.now() - STATE.lastBlockTimeMs) / 1000)) 
            };
            STATE.blockchain.push(newBlock); STATE.liveHeight++; STATE.prevHash = STATE.minedHash;
            
            STATE.lastBlockTimeMs = Date.now();
            
            // --- ระบบ Auto Subsidy Halving: คำนวณรางวัลใหม่หลังจากอัปเดตบล็อกล่าสุด ---
            STATE.liveSubsidy = Utils.getSubsidyForHeight(STATE.liveHeight);
            const inputSub = document.getElementById('input-subsidy');
            if (inputSub) inputSub.value = STATE.liveSubsidy;

            if (window.Leaderboard && window.Leaderboard.calculateAndRender) window.Leaderboard.calculateAndRender();
            
            const strip = document.getElementById('blockchain-strip-right');
            if(strip) { const el = document.createElement('div'); el.className = 'block-cube my-new-block flex-shrink-0 z-10'; const curIdx = STATE.blockchain.length - 1; el.onclick = () => UI.showBlockDetails(curIdx); el.innerHTML = `<span class="text-cyan-400 font-bold text-lg sm:text-xl">#${STATE.liveHeight.toLocaleString()}</span><span class="text-slate-200 text-[10px] sm:text-xs mt-1 text-center leading-tight">Mined by<br>You</span><span class="text-emerald-400 text-[9px] mt-1 font-bold time-ago" data-ts="${now * 1000}">เพิ่งขุดเจอ</span>`; strip.insertBefore(el, strip.firstChild); while (strip.children.length > 4) { strip.removeChild(strip.children[strip.children.length - 3]); } }
            
            this.evaluateDifficulty(); 
        }
        STATE.isBroadcasting = false; 
        setTimeout(() => {
            document.querySelectorAll('.net-link').forEach(l => { l.classList.remove('anim-line-flow', 'anim-line-fail', 'anim-line-transmit', 'anim-packet-inv', 'anim-packet-get'); });
            CONFIG.NODES.forEach(n => { const el = document.getElementById('nd-'+n); if(el && !STATE.bannedNodes.has(n)) el.classList.remove('anim-node-success', 'anim-node-fail', 'anim-node-verifying'); });
            const meEl = document.getElementById('nd-me'); if (meEl && !STATE.bannedNodes.has('me')) { meEl.classList.remove('anim-node-success', 'anim-node-fail', 'anim-node-verifying'); }
            
            UI.toggleModal('log-modal', false); 
            if(STATE.isBotMode) this.startBotsMining();
        }, 500); 

        setTimeout(() => this.prepareNext(false), 1000);
    }
});