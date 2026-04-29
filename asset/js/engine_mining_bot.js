window.Engine = window.Engine || {};
Object.assign(window.Engine, {
    startBotsMining() {
        // --- BUG FIX: ระงับการขุดของบอทหากผู้เล่นแพ้ (โดนแบน) หรือเชนพัง ---
        if (STATE.bannedNodes.has('me') || STATE.chainCorrupted) return;

        STATE.botStartTimers = STATE.botStartTimers || [];
        STATE.botStartTimers.forEach(t => clearTimeout(t));
        STATE.botStartTimers = [];
        STATE.botNonces = STATE.botNonces || {};
        STATE.botBaseHeader = STATE.botBaseHeader || {};
        
        const activeNodes = CONFIG.NODES.filter(n => !n.startsWith('sat') && n !== 'me' && !STATE.bannedNodes.has(n));
        
        activeNodes.forEach(nodeId => {
            STATE.botNonces[nodeId] = 0;
            STATE.botBaseHeader[nodeId] = "BOT_HEADER_" + nodeId + "_" + Date.now() + "_";
            
            const delay = Math.random() * 8000 + 500; 
            const timer = setTimeout(() => {
                if (!STATE.isBroadcasting && STATE.isBotMode) {
                    UI.toggleNodeMining(nodeId, true);
                }
            }, delay);
            STATE.botStartTimers.push(timer);
        });

        if (STATE.botMiningReq) cancelAnimationFrame(STATE.botMiningReq);
        
        const botLoop = () => {
            // --- BUG FIX: ปิดลูปบอทถาวรหากปิดโหมดบอท ผู้เล่นโดนแบน หรือเชนพัง ---
            if (!STATE.isBotMode || STATE.bannedNodes.has('me') || STATE.chainCorrupted) {
                return;
            }

            if (STATE.isBroadcasting) {
                STATE.botMiningReq = requestAnimationFrame(botLoop);
                return;
            }

            let diff = parseInt(document.getElementById('input-difficulty').value) || 3;
            const target = '0'.repeat(Math.min(diff, 64));
            let winnerBot = null;
            let winningHash = "";
            let winningNonce = 0;

            const activeBots = CONFIG.NODES.filter(n => !n.startsWith('sat') && n !== 'me' && !STATE.bannedNodes.has(n));
            
            for (let i = 0; i < activeBots.length; i++) {
                let botId = activeBots[i];
                const nodeEl = document.getElementById(`nd-${botId}`);
                if (!nodeEl || !nodeEl.querySelector('.mining-indicator')) continue;

                let limit = STATE.nodeFrameLimits[botId] || 1;
                let strat = STATE.nodeNonceStrategies[botId] || 'linear';
                
                if (strat === 'asic') limit = Math.floor(limit * 1.2);

                let headerBase = STATE.botBaseHeader[botId];
                let nonce = STATE.botNonces[botId] || 0;

                for (let j = 0; j < limit; j++) {
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

                    let realHash = Utils.sha256d(headerBase + nonce.toString());
                    if (realHash.startsWith(target)) {
                        winnerBot = botId;
                        winningHash = realHash;
                        winningNonce = nonce;
                        STATE.botNonces[botId] = nonce;
                        break;
                    }
                }
                STATE.botNonces[botId] = nonce;
                if (winnerBot) break; 
            }

            if (winnerBot) {
                this.botFindsBlock(diff, winnerBot, winningHash, winningNonce);
                return; 
            }

            STATE.botMiningReq = requestAnimationFrame(botLoop);
        };
        STATE.botMiningReq = requestAnimationFrame(botLoop);
    },

    stopBotsMining() {
        if(STATE.botStartTimers) STATE.botStartTimers.forEach(t => clearTimeout(t));
        STATE.botStartTimers = [];
        if (STATE.botMiningReq) cancelAnimationFrame(STATE.botMiningReq);
        UI.clearAllMining();
    },
    
    async botFindsBlock(diff, winnerBotId, winningHash, winningNonce) {
        this.stopBotsMining(); 
        UI.toggleNodeMining('me', false); 
        STATE.isBroadcasting = true; 
        AudioEngine.sfxBotMine();
        
        const botHash = winningHash; 
        const botId = winnerBotId;
        const botName = `Node ${botId.toUpperCase()}`;

        let strat = STATE.nodeNonceStrategies[botId] || 'linear';
        const stratInfo = {
            'linear': { name: "Sequential", eq: "Nonce++" },
            'random': { name: "Stochastic", eq: "Random" },
            'asic':   { name: "ASIC Boost", eq: "Nonce+=7" },
            'reverse':{ name: "Decrement", eq: "Nonce--" },
            'evens':  { name: "Evens Only", eq: "Nonce+=2" }
        };
        let info = stratInfo[strat] || stratInfo['linear'];

        const isMalicious = Math.random() < 0.10; 
        const maliciousTypes = ['oversize', 'badtime', 'doublespend', 'badsig', 'overclaim'];
        const mType = isMalicious ? maliciousTypes[Math.floor(Math.random() * maliciousTypes.length)] : null;

        if (isMalicious) { UI.addLiveNodeLog(`🚨 [ATTACK] บอทแปลกปลอมจาก ${botName} พยายามส่งบล็อกผิดกฎเข้าสู่เครือข่าย!`, 'attack'); } 
        else { UI.addLiveNodeLog(`🚨 บอทฟาร์มจาก ${botName} ขุดเจอบล็อก! เริ่มกระพือข่าวจากโหนดต้นทาง`, 'bot'); }

        const btnMine = document.getElementById('btn-mine');
        if (btnMine && document.getElementById('hash-modal') && !document.getElementById('hash-modal').classList.contains('opacity-0')) {
            btnMine.disabled = true; btnMine.innerText = "⏳ เครือข่ายกำลังอัปเดต...";
            btnMine.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        }

        let userAffected = false;
        const allTxs = [...STATE.mempoolTxs, ...STATE.blockTxs].sort((a,b) => b.satPerVb - a.satPerVb);
        
        const numBotTxs = Math.floor(Math.random() * 8) + 8; 
        const botTxs = allTxs.slice(0, numBotTxs);

        let botFee = botTxs.reduce((sum, t) => sum + t.fee, 0);
        const botReward = STATE.liveSubsidy + botFee;

        const botWaves = Utils.generateGossipWaves(botId);

        for (const wave of botWaves) {
            wave.lines.forEach(l => { const el = document.getElementById(l); if(el) { el.classList.remove('anim-line-flow', 'anim-line-fail', 'anim-line-transmit', 'anim-packet-get'); el.classList.add('anim-packet-inv'); } });
            wave.nodes.forEach(n => { 
                let msg = getRandomChat('inv'); UI.showNodeChat(n, "📩 INV", "text-amber-400 border-amber-500/50");
                const name = n === 'nd-me' ? 'คุณ (Miner)' : `Node ${n.replace('nd-','').toUpperCase()}`; UI.addLiveNodeLog(`${name}: "${msg}"`, 'inv');
            }); 
            await Utils.sleep(400); 
            
            wave.lines.forEach(l => { const el = document.getElementById(l); if(el) { el.classList.remove('anim-packet-inv'); el.classList.add('anim-packet-get'); } });
            wave.nodes.forEach(n => { 
                let msg = getRandomChat('getdata'); UI.showNodeChat(n, "📤 GET", "text-fuchsia-400 border-fuchsia-500/50"); 
                const el = document.getElementById(n); if(el && n !== 'nd-me') el.classList.add('anim-node-verifying'); 
                if(n !== 'nd-me') UI.addLiveNodeLog(`Node ${n.replace('nd-','').toUpperCase()}: "${msg}"`, 'getdata');
            }); 
            await Utils.sleep(400); 
            
            wave.lines.forEach(l => { const el = document.getElementById(l); if(el) { el.classList.remove('anim-packet-get'); el.classList.add('anim-line-transmit'); } });
            wave.nodes.forEach(n => { 
                let msg = getRandomChat('block'); UI.showNodeChat(n, "📦 BLK", "text-cyan-400 border-cyan-500/50"); 
                if(n !== 'nd-me') UI.addLiveNodeLog(`Network -> Node ${n.replace('nd-','').toUpperCase()}: "${msg}"`, 'block');
            }); 
            await Utils.sleep(400);

            wave.nodes.forEach(n => { 
                let msg = isMalicious ? getRandomChat('reject') : getRandomChat('accept');
                const el = document.getElementById(n); 
                if(el && n !== 'nd-me') { el.classList.remove('anim-node-verifying'); el.classList.add(isMalicious ? 'anim-node-fail' : 'anim-node-success'); } 
                UI.showNodeChat(n, isMalicious ? "🛡️ REJECT" : "✅ OK", isMalicious ? "text-amber-400 border-amber-500/50" : "text-emerald-400 border-emerald-500/50"); 
                if(n !== 'nd-me') {
                    if (isMalicious) { UI.addLiveNodeLog(`Node ${n.replace('nd-','').toUpperCase()} ปฏิเสธบล็อกและแบนโหนด ${botId.toUpperCase()}: "${msg}"`, 'reject'); } 
                    else { UI.addLiveNodeLog(`Node ${n.replace('nd-','').toUpperCase()} ตรวจสอบผ่านและยอมรับบล็อกของบอท: "${msg}"`, 'accept'); }
                }
            });
            
            wave.lines.forEach(l => { const el = document.getElementById(l); if(el) { el.classList.remove('anim-line-transmit'); el.classList.add(isMalicious ? 'anim-line-fail' : 'anim-line-flow'); } });
            
            if (isMalicious) { UI.banNode(botId); UI.addLiveNodeLog(`🚨 [NETWORK] ตัดการเชื่อมต่อโหนด ${botId.toUpperCase()} ถาวร!`, 'system'); await Utils.sleep(500); Utils.healNetwork(); break; }
        }

        await Utils.sleep(500);

        UI.toggleModal('log-modal', true); 
        UI.writeLog(`=== เริ่มกระบวนการตรวจสอบความถูกต้องของบล็อก (Block Validation) ===`, "warning"); UI.writeLog(`ได้รับข้อมูล Candidate Block จาก ${botName} เข้าสู่กระบวนการตรวจสอบ`, "process"); 
        await Utils.sleep(600);
        
        UI.writeLog(`ตรวจสอบ Proof-of-Work: ผ่าน (Hash Header มีค่าน้อยกว่า Target)`, "success"); await Utils.sleep(200);

        if (mType === 'oversize') { UI.writeLog(`ตรวจสอบขนาดบล็อก: ไม่ผ่าน (บล็อกมีขนาดเกินขีดจำกัด 4M WU)`, "error"); }
        else { UI.writeLog(`ตรวจสอบขนาดบล็อก: ผ่าน (ขนาดอยู่ในเกณฑ์ที่กำหนด)`, "success"); } await Utils.sleep(200);

        if (mType !== 'oversize') {
            if (mType === 'badtime') { UI.writeLog(`ตรวจสอบเวลา (Timestamp): ไม่ผ่าน (เวลาไม่สอดคล้องกับเครือข่าย)`, "error"); }
            else { UI.writeLog(`ตรวจสอบเวลา (Timestamp): ผ่าน (เวลาสอดคล้องกับเครือข่าย)`, "success"); } await Utils.sleep(200);
        }

        if (!['oversize', 'badtime'].includes(mType)) {
            if (mType === 'doublespend') { UI.writeLog(`ตรวจสอบ UTXO: ไม่ผ่าน (พบการใช้จ่ายซ้ำซ้อน - Double Spend)`, "error"); }
            else { UI.writeLog(`ตรวจสอบ UTXO: ผ่าน (ไม่พบการใช้จ่ายซ้ำซ้อน)`, "success"); } await Utils.sleep(200);
        }

        if (!['oversize', 'badtime', 'doublespend'].includes(mType)) {
            if (mType === 'badsig') { UI.writeLog(`ตรวจสอบลายเซ็นดิจิทัล: ไม่ผ่าน (ลายเซ็นไม่ถูกต้อง)`, "error"); }
            else { UI.writeLog(`ตรวจสอบลายเซ็นดิจิทัล: ผ่าน (ลายเซ็นถูกต้อง)`, "success"); } await Utils.sleep(200);
        }

        if (!['oversize', 'badtime', 'doublespend', 'badsig'].includes(mType)) {
            if (mType === 'overclaim') { UI.writeLog(`ตรวจสอบรางวัล Coinbase: ไม่ผ่าน (สร้างเหรียญเกินจำนวนที่กำหนด)`, "error"); }
            else { UI.writeLog(`ตรวจสอบรางวัล Coinbase: ผ่าน (จำนวนเหรียญถูกต้อง)`, "success"); } await Utils.sleep(400);
        }

        if (isMalicious) {
            UI.writeLog("ปฏิเสธบล็อก: พบการละเมิดกฎ Consensus ยกเลิกการบันทึกและแบนโหนดที่ส่งมา", "error"); AudioEngine.sfxFinalReject();
            UI.showToast(`🤖 บอทพยายามโกง (${mType}) แต่ถูก Reject! เครื่องขุดของคุณจะทำงานต่อ`, "warning");
            
            setTimeout(() => {
                document.querySelectorAll('.net-link').forEach(l => { l.classList.remove('anim-line-flow', 'anim-line-fail', 'anim-line-transmit', 'anim-packet-inv', 'anim-packet-get'); });
                CONFIG.NODES.forEach(n => { const el = document.getElementById('nd-'+n); if(el && !STATE.bannedNodes.has(n)) el.classList.remove('anim-node-success', 'anim-node-fail', 'anim-node-verifying'); });
                UI.toggleModal('log-modal', false); 
                // --- BUG FIX: หยุดกระบวนการเริ่มบอทใหม่หากคุณถูกแบน ---
                if(STATE.isBotMode && !STATE.bannedNodes.has('me') && !STATE.chainCorrupted) this.startBotsMining();
                
                if(STATE.isMining) {
                    UI.toggleNodeMining('me', true);
                    if (btnMine && document.getElementById('hash-modal') && document.getElementById('hash-modal').classList.contains('opacity-0')) {
                        btnMine.disabled = true; btnMine.innerText = "กำลังประมวลผล PoW...";
                        btnMine.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
                    }
                }
            }, 500);

            STATE.isBroadcasting = false; 

        } else {
            UI.writeLog("ตรวจสอบเสร็จสิ้น: ข้อมูลถูกต้องตามกฎ Consensus ทำการบันทึกลงสู่ Blockchain", "final-success"); AudioEngine.sfxFinalSuccess();

            botTxs.forEach(btx => {
                const mIdx = STATE.mempoolTxs.findIndex(t => t.id === btx.id); if (mIdx > -1) STATE.mempoolTxs.splice(mIdx, 1);
                const bIdx = STATE.blockTxs.findIndex(t => t.id === btx.id); if (bIdx > -1) { STATE.blockTxs.splice(bIdx, 1); userAffected = true; }
            });

            const now = Math.floor(Date.now() / 1000); const d = new Date(now * 1000);
            const timeStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')} (${now})`;

            const mockBits = `0x170${Math.floor(Math.random() * 65535).toString(16).padStart(4, '0')}`;
            let diff = parseInt(document.getElementById('input-difficulty').value) || 3;

            const newBlock = { 
                height: STATE.liveHeight + 1, hash: botHash, prevHash: STATE.prevHash, merkleRoot: Utils.generateHash(), 
                version: "0x20000000", bits: `${mockBits} (Target ${diff} Zeros)`, 
                nonce: winningNonce, nonceMethod: info.name, nonceEq: info.eq, 
                time: timeStr, miner: `🤖 Bot ${botId.toUpperCase()}`, reward: `${botReward.toLocaleString()} sats`, transactions: botTxs, 
                timeTaken: Math.max(0, Math.floor((Date.now() - STATE.lastBlockTimeMs) / 1000)) 
            };
            STATE.blockchain.push(newBlock); STATE.liveHeight++; STATE.prevHash = botHash;
            
            STATE.lastBlockTimeMs = Date.now();

            STATE.liveSubsidy = Utils.getSubsidyForHeight(STATE.liveHeight);
            const inputSub = document.getElementById('input-subsidy');
            if (inputSub) inputSub.value = STATE.liveSubsidy;

            if (window.Leaderboard && window.Leaderboard.calculateAndRender) window.Leaderboard.calculateAndRender();

            const strip = document.getElementById('blockchain-strip-right');
            if(strip) { 
                const el = document.createElement('div'); el.className = 'block-cube my-new-block flex-shrink-0 z-10'; 
                const curIdx = STATE.blockchain.length - 1; el.onclick = () => UI.showBlockDetails(curIdx); 
                el.innerHTML = `<span class="text-cyan-400 font-bold text-lg sm:text-xl">#${STATE.liveHeight.toLocaleString()}</span><span class="text-slate-200 text-[10px] sm:text-xs mt-1 text-center leading-tight">Mined by<br>Bot ${botId.toUpperCase()}</span><span class="text-emerald-400 text-[9px] mt-1 font-bold time-ago" data-ts="${now * 1000}">เพิ่งขุดเจอ</span>`; 
                strip.insertBefore(el, strip.firstChild); while (strip.children.length > 4) { strip.removeChild(strip.children[strip.children.length - 3]); } 
            }

            UI.setHashDisplay('ui-prev-hash', STATE.prevHash);
            UI.addLiveNodeLog(`🔥 เครือข่ายบันทึก Block #${STATE.liveHeight} ลงเชนเรียบร้อยแล้ว`, 'bot');

            STATE.isBroadcasting = false; 

            if (STATE.isMining) {
                UI.showToast("🤖 เครือข่ายอัปเดตบล็อกใหม่! ข้อมูลที่คุณกำลังขุดล้าสมัยแล้ว", "error");
                
                if(STATE.miningReq) cancelAnimationFrame(STATE.miningReq);
                if(STATE.timerInterval) clearInterval(STATE.timerInterval);
                STATE.isMining = false; 
                
                const termModal = document.getElementById('hash-terminal-modal');
                const outModal = document.getElementById('hash-output-modal');
                if (outModal) {
                    outModal.innerHTML += `<div class="text-rose-500 mt-3 font-bold px-2 py-2 bg-rose-950/80 border border-rose-900 rounded shadow-md">🚨 [STALE BLOCK]<br>เครือข่ายรับบล็อกใหม่จากบอทแล้ว! ข้อมูลของคุณล้าสมัย ระบบได้ยกเลิกการขุดของคุณ...</div>`;
                    if (termModal) termModal.scrollTop = termModal.scrollHeight;
                }
                
                setTimeout(() => {
                    this.abortMining();
                    const btnMine = document.getElementById('btn-mine');
                    if (btnMine) { btnMine.disabled = false; btnMine.innerText = "⛏️ เริ่มขุดใหม่ (Stale Block)"; btnMine.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none'); }
                }, 2500);

            } else if (userAffected) {
                UI.showToast("🤖 เครือข่ายอัปเดตบล็อกใหม่! ข้อมูลที่คุณเตรียมขุดล้าสมัยแล้ว โปรดเริ่มขุดใหม่", "error");
                if (btnMine && document.getElementById('hash-modal') && document.getElementById('hash-modal').classList.contains('opacity-0')) { 
                    btnMine.disabled = false; btnMine.innerText = "⛏️ เริ่มขุดใหม่ (Stale Block)"; 
                    btnMine.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
                }
                STATE.minedHash = ""; 
            } else {
                UI.showToast(`🤖 บอท ${botName} ขุด Block #${STATE.liveHeight} สำเร็จ! ต้องอัปเดต PrevHash ใหม่`, "warning");
                if (btnMine && document.getElementById('hash-modal') && document.getElementById('hash-modal').classList.contains('opacity-0')) { 
                    btnMine.disabled = false; btnMine.innerText = "⛏️ เริ่มขุด (PoW)"; 
                    btnMine.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
                }
            }

            setTimeout(() => {
                document.querySelectorAll('.net-link').forEach(l => { l.classList.remove('anim-line-flow', 'anim-line-fail', 'anim-line-transmit', 'anim-packet-inv', 'anim-packet-get'); });
                CONFIG.NODES.forEach(n => { const el = document.getElementById('nd-'+n); if(el && !STATE.bannedNodes.has(n)) el.classList.remove('anim-node-success', 'anim-node-fail', 'anim-node-verifying'); });
                UI.toggleModal('log-modal', false); 
                // --- BUG FIX: หยุดกระบวนการเริ่มบอทใหม่หากคุณถูกแบน ---
                if(STATE.isBotMode && !STATE.bannedNodes.has('me') && !STATE.chainCorrupted) this.startBotsMining();
            }, 500);

            this.evaluateDifficulty(); 
            UI.renderMempool();
        }
    }
});