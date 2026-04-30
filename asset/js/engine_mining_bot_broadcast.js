window.Engine = window.Engine || {};
Object.assign(window.Engine, {
    async botFindsBlock(diff, winnerBotId, winningHash, winningNonce) {
        STATE.globalGossipActive = true; 
        this.stopBotsMining(); 
        
        // จดจำสถานะว่าผู้เล่นกำลังขุดอยู่หรือไม่ ถ้าใช่ให้ซ่อนไอคอนการขุดไว้ก่อนชั่วคราว
        const wasMining = STATE.isMining;
        if (wasMining) {
            UI.toggleNodeMining('me', false); 
        }

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

        if (isMalicious) { UI.addLiveNodeLog(`🚨 [ATTACK] โหนด ${botName} พยายามส่งบล็อกผิดกฎเข้าสู่เครือข่าย!`, 'attack'); } 
        else { UI.addLiveNodeLog(`🚨 <span class="bg-gradient-to-r from-fuchsia-400 via-amber-400 to-cyan-400 text-transparent bg-clip-text font-extrabold text-[11px] sm:text-xs">โหนด ${botName} ขุดเจอบล็อก! เริ่มกระบวนการ Gossip Protocol...</span>`, 'system'); }

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
        let logHasRun = false;
        let blockAccepted = false;
        let isRejectedByMe = false;
        
        // ตัวแปรสำหรับจับจังหวะให้โชว์บล็อกและผู้เล่นเริ่มขุดต่อได้ทันทีหลังแสดงแอนิเมชัน OK
        let readyToUpdateChain = false;
        let meNeedsRestart = false;
        let meNeedsResume = false;

        for (const wave of botWaves) {
            wave.lines.forEach(l => { const el = document.getElementById(l); if(el) { el.classList.remove('anim-line-flow', 'anim-line-fail', 'anim-line-transmit', 'anim-packet-get'); el.classList.add('anim-packet-inv'); } });
            wave.nodes.forEach(n => { 
                let msg = getRandomChat('inv'); 
                let targetNode = n === 'nd-me' ? 'คุณ (ME)' : `Node ${n.replace('nd-','').toUpperCase()}`;
                UI.showNodeChat(n, "📩 INV", "text-amber-400 border-amber-500/50");
                UI.addLiveNodeLog(`${botName} ➔ ${targetNode}: "${msg}"`, 'inv');
            }); 
            await Utils.sleep(400); 
            
            wave.lines.forEach(l => { const el = document.getElementById(l); if(el) { el.classList.remove('anim-packet-inv'); el.classList.add('anim-packet-get'); } });
            wave.nodes.forEach(n => { 
                let msg = getRandomChat('getdata'); 
                let targetNode = n === 'nd-me' ? 'คุณ (ME)' : `Node ${n.replace('nd-','').toUpperCase()}`;
                UI.showNodeChat(n, "📤 GET", "text-fuchsia-400 border-fuchsia-500/50"); 
                const el = document.getElementById(n); if(el && n !== 'nd-me') el.classList.add('anim-node-verifying'); 
                UI.addLiveNodeLog(`${targetNode} ➔ ${botName}: "${msg}"`, 'getdata');
            }); 
            await Utils.sleep(400); 
            
            wave.lines.forEach(l => { const el = document.getElementById(l); if(el) { el.classList.remove('anim-packet-get'); el.classList.add('anim-line-transmit'); } });
            wave.nodes.forEach(n => { 
                let msg = getRandomChat('block'); 
                let targetNode = n === 'nd-me' ? 'คุณ (ME)' : `Node ${n.replace('nd-','').toUpperCase()}`;
                UI.showNodeChat(n, "📦 BLK", "text-cyan-400 border-cyan-500/50"); 
                UI.addLiveNodeLog(`${botName} ➔ ${targetNode}: "${msg}"`, 'block');
            }); 
            await Utils.sleep(400);

            if (wave.nodes.includes('nd-me') && !logHasRun) {
                logHasRun = true;
                UI.toggleModal('log-modal', true); 
                UI.writeLog(`=== เริ่มกระบวนการตรวจสอบความถูกต้องของบล็อก (Block Validation) ===`, "warning"); 
                UI.writeLog(`ProcessNewBlock: กำลังรับบล็อก ${Utils.shortenHash(botHash)} จากโหนด=${botId.toUpperCase()}`, "process"); 
                await Utils.sleep(600);
                
                let failed = false;
                if (botHash) { UI.writeLog(`CheckBlockHeader(): hash=${Utils.shortenHash(botHash)} ตรวจสอบ proof-of-work ผ่าน`, "success"); } else { failed = true; }
                if (!failed) { await Utils.sleep(200); if (mType === 'oversize') { UI.writeLog(`CheckBlock(): ขนาดบล็อกล้มเหลว (> 4000000 WU)`, "error"); failed = true; } else { UI.writeLog(`CheckBlock(): ขนาดบล็อกถูกต้อง`, "success"); } }
                if (!failed) { await Utils.sleep(200); if (mType === 'badtime') { UI.writeLog(`CheckBlockHeader(): เวลาของบล็อกล่วงหน้าไปในอนาคตไกลเกินไป`, "error"); failed = true; } else { UI.writeLog(`CheckBlockHeader(): เวลาของบล็อกถูกต้อง`, "success"); } }
                if (!failed) { await Utils.sleep(200); if (mType === 'doublespend') { UI.writeLog(`ConnectBlock(): ไม่พบ Input หรือ Input ถูกใช้ไปแล้ว (Double Spend)`, "error"); failed = true; } else { UI.writeLog(`ConnectBlock(): Input ถูกต้อง`, "success"); } }
                if (!failed) { await Utils.sleep(200); if (mType === 'badsig') { UI.writeLog(`ConnectBlock(): VerifyDB() ล้มเหลว: ลายเซ็นไม่ถูกต้อง (Bad Signature)`, "error"); failed = true; } else { UI.writeLog(`ConnectBlock(): ตรวจสอบลายเซ็นผ่าน`, "success"); } }
                if (!failed) { await Utils.sleep(200); if (mType === 'overclaim') { UI.writeLog(`CheckBlock(): bad-cb-amount (เคลมรางวัล Coinbase เกินจริง)`, "error"); failed = true; } else { UI.writeLog(`CheckBlock(): รางวัล coinbase ${botReward.toLocaleString()} sats ถูกต้อง`, "success"); } }

                await Utils.sleep(400);
                if (failed || isMalicious) {
                    UI.writeLog(`ProcessNewBlock: ปฏิเสธบล็อก ${Utils.shortenHash(botHash)} (บล็อกไม่ถูกต้อง)`, "error"); AudioEngine.sfxFinalReject();
                    UI.showToast(`🤖 บอทพยายามโกง (${mType}) แต่ถูก Reject! เครื่องขุดของคุณจะทำงานต่อ`, "warning");
                    isRejectedByMe = true;
                    meNeedsResume = true; // เตรียมกลับไปขุดต่อ
                } else {
                    blockAccepted = true;
                    meNeedsRestart = true; // เตรียมเคลียร์คิวและเริ่มขุดใหม่
                    UI.writeLog(`UpdateTip: อัปเดตยอดเชนใหม่ best=${Utils.shortenHash(botHash)} ความสูง=${STATE.liveHeight + 1} ธุรกรรม=${botTxs.length + 1} วันที่=${new Date().toISOString()}`, "final-success"); 
                    AudioEngine.sfxFinalSuccess();
                    readyToUpdateChain = true; // เตรียมสร้างบล็อกให้โชว์พร้อมจังหวะแชท OK
                }
                
                await Utils.sleep(1500);
                UI.toggleModal('log-modal', false);
                await Utils.sleep(500);
            }

            // แสดง Bubble แชทให้ทุกโหนดใน Wave นี้
            wave.nodes.forEach(n => { 
                let msg = isMalicious ? getRandomChat('reject') : getRandomChat('accept');
                let targetNode = n === 'nd-me' ? 'คุณ (ME)' : `Node ${n.replace('nd-','').toUpperCase()}`;
                const el = document.getElementById(n); 
                if(el && n !== 'nd-me') { el.classList.remove('anim-node-verifying'); el.classList.add(isMalicious ? 'anim-node-fail' : 'anim-node-success'); } 
                UI.showNodeChat(n, isMalicious ? "🛡️ REJECT" : "✅ OK", isMalicious ? "text-amber-400 border-amber-500/50" : "text-emerald-400 border-emerald-500/50"); 
                UI.addLiveNodeLog(`${targetNode} ➔ ${botName}: "${msg}"`, isMalicious ? 'reject' : 'accept');
            });
            
            wave.lines.forEach(l => { const el = document.getElementById(l); if(el) { el.classList.remove('anim-line-transmit'); el.classList.add(isMalicious ? 'anim-line-fail' : 'anim-line-flow'); } });

            // ==========================================
            // อัปเดต Blockchain & สร้าง Block Cube เข้าหน้าจอ
            // จังหวะเดียวกับที่โหนดผู้เล่นพูดว่า OK พอดีเป๊ะ
            // ==========================================
            if (readyToUpdateChain) {
                readyToUpdateChain = false;

                botTxs.forEach(btx => {
                    const mIdx = STATE.mempoolTxs.findIndex(t => t.id === btx.id); if (mIdx > -1) STATE.mempoolTxs.splice(mIdx, 1);
                    const bIdx = STATE.blockTxs.findIndex(t => t.id === btx.id); if (bIdx > -1) { STATE.blockTxs.splice(bIdx, 1); userAffected = true; }
                });

                const rawBotTime = STATE.botTimes[botId];
                const d = new Date(parseInt(rawBotTime) * 1000);
                const finalTimeStr = `${rawBotTime} (${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')})`;
                const finalBitsStr = STATE.botBits[botId];

                const newBlock = { 
                    height: STATE.liveHeight + 1, hash: botHash, prevHash: STATE.prevHash, merkleRoot: Utils.generateHash(), 
                    version: "0x20000000", bits: finalBitsStr, 
                    nonce: winningNonce, nonceMethod: info.name, nonceEq: info.eq, 
                    time: finalTimeStr, miner: `🤖 Bot ${botId.toUpperCase()}`, reward: `${botReward.toLocaleString()} sats`, transactions: botTxs, 
                    timeTaken: Math.max(0, Math.floor((Date.now() - STATE.lastBlockTimeMs) / 1000)) 
                };
                STATE.blockchain.push(newBlock); STATE.liveHeight++; STATE.prevHash = botHash;
                
                STATE.lastBlockTimeMs = Date.now();
                STATE.liveSubsidy = Utils.getSubsidyForHeight(STATE.liveHeight);
                const inputSub = document.getElementById('input-subsidy');
                if (inputSub) inputSub.value = STATE.liveSubsidy;

                if (STATE.nodeUnbanHeight) {
                    for (let nid in STATE.nodeUnbanHeight) {
                        if (STATE.liveHeight >= STATE.nodeUnbanHeight[nid]) {
                            if (window.UI && window.UI.unbanNode) window.UI.unbanNode(nid);
                            delete STATE.nodeUnbanHeight[nid];
                        }
                    }
                }

                if (window.Leaderboard && window.Leaderboard.calculateAndRender) window.Leaderboard.calculateAndRender();

                const strip = document.getElementById('blockchain-strip-right');
                if(strip) { 
                    const el = document.createElement('div'); el.className = 'block-cube my-new-block flex-shrink-0 z-10'; 
                    const curIdx = STATE.blockchain.length - 1; el.onclick = () => UI.showBlockDetails(curIdx); 
                    el.innerHTML = `<span class="text-cyan-400 font-bold text-lg sm:text-xl">#${STATE.liveHeight.toLocaleString()}</span><span class="text-slate-200 text-[10px] sm:text-xs mt-1 text-center leading-tight">Mined by<br>Bot ${botId.toUpperCase()}</span><span class="text-emerald-400 text-[9px] mt-1 font-bold time-ago" data-ts="${Date.now()}">เพิ่งขุดเจอ</span>`; 
                    strip.insertBefore(el, strip.firstChild); while (strip.children.length > 4) { strip.removeChild(strip.children[strip.children.length - 3]); } 
                }

                UI.setHashDisplay('ui-prev-hash', STATE.prevHash);
                UI.addLiveNodeLog(`🔥 <span class="bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-400 text-transparent bg-clip-text font-extrabold text-[11px] sm:text-xs animate-pulse">เครือข่ายบันทึก Block #${STATE.liveHeight} ลงเชนเรียบร้อยแล้ว</span>`, 'system');
            }

            // ==========================================
            // ให้ผู้เล่นเริ่มดำเนินการต่อได้ทันที หลังจาก "โหนดผู้เล่น (ME)" แสดงแชท Bubble เรียบร้อยแล้ว
            // โดยไม่ต้องรอโหนดอื่นๆ ซุบซิบให้จบ
            // ==========================================
            if (meNeedsRestart) {
                meNeedsRestart = false; // รันครั้งเดียว
                STATE.isBroadcasting = false; // ปลดล็อกให้ขุดได้ทันที

                if(window.Engine && window.Engine.evaluateDifficulty) window.Engine.evaluateDifficulty(); 
                if(window.UI && window.UI.renderMempool) window.UI.renderMempool();

                if (wasMining) {
                    UI.showToast("🤖 เครือข่ายอัปเดตบล็อกใหม่! ระบบกำลังเคลียร์ข้อมูลและเตรียมขุดบล็อกถัดไป...", "error");
                    
                    if(STATE.miningReq) cancelAnimationFrame(STATE.miningReq);
                    if(STATE.timerInterval) clearInterval(STATE.timerInterval);
                    STATE.isMining = false; 
                    
                    const termModal = document.getElementById('hash-terminal-modal');
                    const outModal = document.getElementById('hash-output-modal');
                    if (outModal) {
                        outModal.innerHTML += `<div class="text-rose-500 mt-3 font-bold px-2 py-2 bg-rose-950/80 border border-rose-900 rounded shadow-md">🚨 [STALE BLOCK]<br>เครือข่ายรับบล็อกใหม่จากบอทแล้ว! ข้อมูลของคุณล้าสมัย ระบบได้ยกเลิกการขุดและกำลังเริ่มขุดบล็อกใหม่...</div>`;
                        if (termModal) termModal.scrollTop = termModal.scrollHeight;
                    }
                    
                    if(window.Engine && window.Engine.abortMining) window.Engine.abortMining();
                    
                    STATE.manualFee = false;
                    if (window.App && typeof window.App.autoFillFromMempool === 'function') {
                        window.App.autoFillFromMempool();
                    }

                    // สั่งให้เริ่มขุดบล็อกใหม่ทันที
                    setTimeout(() => {
                        if (window.Engine && window.Engine.mine) {
                            window.Engine.mine();
                        }
                    }, 500);

                } else if (userAffected) {
                    UI.showToast("🤖 เครือข่ายอัปเดตบล็อกใหม่! ข้อมูลที่คุณเตรียมขุดล้าสมัยแล้ว โปรดจัดเรียงใหม่", "error");
                    const btnMineTemp = document.getElementById('btn-mine');
                    if (btnMineTemp && document.getElementById('hash-modal') && document.getElementById('hash-modal').classList.contains('opacity-0')) { 
                        btnMineTemp.disabled = false; btnMineTemp.innerText = "⛏️ เริ่มขุดใหม่ (Stale Block)"; 
                        btnMineTemp.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
                    }
                    STATE.minedHash = ""; 
                } else {
                    UI.showToast(`🤖 บอท ${botName} ขุด Block #${STATE.liveHeight} สำเร็จ! อัปเดตข้อมูลให้คุณขุดต่อได้แล้ว`, "warning");
                    const btnMineTemp = document.getElementById('btn-mine');
                    if (btnMineTemp && document.getElementById('hash-modal') && document.getElementById('hash-modal').classList.contains('opacity-0')) { 
                        btnMineTemp.disabled = false; btnMineTemp.innerText = "⛏️ เริ่มขุด (PoW)"; 
                        btnMineTemp.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
                    }
                }
            }

            if (meNeedsResume) {
                meNeedsResume = false;
                STATE.isBroadcasting = false; // ปลดล็อกให้ขุดต่อได้
                if (wasMining) {
                    UI.toggleNodeMining('me', true);
                }
            }
            
            if (isMalicious) { 
                UI.banNode(botId); 
                STATE.nodeUnbanHeight = STATE.nodeUnbanHeight || {};
                STATE.nodeUnbanHeight[botId] = STATE.liveHeight + Math.floor(Math.random() * 3) + 2;
                UI.addLiveNodeLog(`🚨 [NETWORK] ตัดการเชื่อมต่อโหนด ${botId.toUpperCase()} ชั่วคราว (2-4 บล็อก)!`, 'system'); 
                await Utils.sleep(500); Utils.healNetwork(); break; 
            }
        }

        await Utils.sleep(500);

        if (!logHasRun) {
            // กรณีที่โหนดของคุณไม่ได้รับผลกระทบจาก Gossip (เช่น โดนแบน หรือหลุด)
            if (!isMalicious) {
                blockAccepted = true;
                botTxs.forEach(btx => {
                    const mIdx = STATE.mempoolTxs.findIndex(t => t.id === btx.id); if (mIdx > -1) STATE.mempoolTxs.splice(mIdx, 1);
                    const bIdx = STATE.blockTxs.findIndex(t => t.id === btx.id); if (bIdx > -1) { STATE.blockTxs.splice(bIdx, 1); userAffected = true; }
                });

                const rawBotTime = STATE.botTimes[botId];
                const d = new Date(parseInt(rawBotTime) * 1000);
                const finalTimeStr = `${rawBotTime} (${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')})`;
                const finalBitsStr = STATE.botBits[botId];

                const newBlock = { 
                    height: STATE.liveHeight + 1, hash: botHash, prevHash: STATE.prevHash, merkleRoot: Utils.generateHash(), 
                    version: "0x20000000", bits: finalBitsStr, 
                    nonce: winningNonce, nonceMethod: info.name, nonceEq: info.eq, 
                    time: finalTimeStr, miner: `🤖 Bot ${botId.toUpperCase()}`, reward: `${botReward.toLocaleString()} sats`, transactions: botTxs, 
                    timeTaken: Math.max(0, Math.floor((Date.now() - STATE.lastBlockTimeMs) / 1000)) 
                };
                STATE.blockchain.push(newBlock); STATE.liveHeight++; STATE.prevHash = botHash;
                
                STATE.lastBlockTimeMs = Date.now();
                STATE.liveSubsidy = Utils.getSubsidyForHeight(STATE.liveHeight);
                const inputSub = document.getElementById('input-subsidy');
                if (inputSub) inputSub.value = STATE.liveSubsidy;

                if (STATE.nodeUnbanHeight) {
                    for (let nid in STATE.nodeUnbanHeight) {
                        if (STATE.liveHeight >= STATE.nodeUnbanHeight[nid]) {
                            if (window.UI && window.UI.unbanNode) window.UI.unbanNode(nid);
                            delete STATE.nodeUnbanHeight[nid];
                        }
                    }
                }
                
                if (window.Leaderboard && window.Leaderboard.calculateAndRender) window.Leaderboard.calculateAndRender();
                
                const strip = document.getElementById('blockchain-strip-right');
                if(strip) { 
                    const el = document.createElement('div'); el.className = 'block-cube my-new-block flex-shrink-0 z-10'; 
                    const curIdx = STATE.blockchain.length - 1; el.onclick = () => UI.showBlockDetails(curIdx); 
                    el.innerHTML = `<span class="text-cyan-400 font-bold text-lg sm:text-xl">#${STATE.liveHeight.toLocaleString()}</span><span class="text-slate-200 text-[10px] sm:text-xs mt-1 text-center leading-tight">Mined by<br>Bot ${botId.toUpperCase()}</span><span class="text-emerald-400 text-[9px] mt-1 font-bold time-ago" data-ts="${Date.now()}">เพิ่งขุดเจอ</span>`; 
                    strip.insertBefore(el, strip.firstChild); while (strip.children.length > 4) { strip.removeChild(strip.children[strip.children.length - 3]); } 
                }

                UI.setHashDisplay('ui-prev-hash', STATE.prevHash);
                UI.addLiveNodeLog(`🔥 <span class="bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-400 text-transparent bg-clip-text font-extrabold text-[11px] sm:text-xs animate-pulse">เครือข่ายบันทึก Block #${STATE.liveHeight} ลงเชนเรียบร้อยแล้ว</span>`, 'system');
            }
        }

        STATE.isBroadcasting = false; 

        if (wasMining && !logHasRun && (isMalicious || isRejectedByMe)) {
            UI.toggleNodeMining('me', true);
        }

        setTimeout(() => {
            document.querySelectorAll('.net-link').forEach(l => { l.classList.remove('anim-line-flow', 'anim-line-fail', 'anim-line-transmit', 'anim-packet-inv', 'anim-packet-get'); });
            CONFIG.NODES.forEach(n => { const el = document.getElementById('nd-'+n); if(el && !STATE.bannedNodes.has(n)) el.classList.remove('anim-node-success', 'anim-node-fail', 'anim-node-verifying'); });
            STATE.globalGossipActive = false; 
            
            // รอจนกว่า Global Gossip จะแอนิเมทจบ บอทโหนดอื่นๆ ถึงจะเริ่มขุดรอบใหม่ได้
            if(STATE.isBotMode && !STATE.bannedNodes.has('me') && !STATE.chainCorrupted) this.startBotsMining();
        }, 500);
    }
});