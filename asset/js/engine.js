var Mempool = {
    generate(count = 8) { const types = ['P2PKH', 'SegWit', 'Taproot', 'Lightning', 'Batch Tx', 'Consolidation', 'Spam']; const txs = []; for(let i=0; i<count; i++) { const id = Math.random().toString(16).substring(2, 6); const vb = Math.floor(Math.random() * 400) + 150; const sat = Math.floor(Math.random() * 80) + 5; txs.push({ id: id.padEnd(4, '0'), type: types[Math.floor(Math.random()*types.length)], fee: Math.floor(vb*sat), vb, satPerVb: sat }); } return txs.sort((a,b) => b.satPerVb - a.satPerVb); },
    init() { 
        STATE.mempoolTxs = this.generate(25); // เตรียมธุรกรรมไว้ 25 อันเฉพาะตอนเริ่มเว็บ
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
    replenish() { 
        // ยกเลิกการเติมธุรกรรมอัตโนมัติแบบทีเดียวเต็ม 
        // ปล่อยให้เป็นหน้าที่ของ txStreamInterval ด้านบน ค่อยๆ ทยอยประกาศผ่าน P2P Gossip เท่านั้น
    }
};

var Engine = {
    startBotsMining() {
        STATE.botStartTimers.forEach(t => clearTimeout(t));
        STATE.botStartTimers = [];
        const activeNodes = CONFIG.NODES.filter(n => !n.startsWith('sat') && n !== 'me' && !STATE.bannedNodes.has(n));
        activeNodes.forEach(nodeId => {
            const delay = Math.random() * 8000 + 500; 
            const timer = setTimeout(() => {
                if (!STATE.isBroadcasting && document.getElementById('cb-bot-mode') && document.getElementById('cb-bot-mode').checked) {
                    UI.toggleNodeMining(nodeId, true);
                }
            }, delay);
            STATE.botStartTimers.push(timer);
        });
    },
    stopBotsMining() {
        STATE.botStartTimers.forEach(t => clearTimeout(t));
        STATE.botStartTimers = [];
        UI.clearAllMining();
    },
    evaluateDifficulty() {
        if (!document.getElementById('cb-bot-mode') || !document.getElementById('cb-bot-mode').checked) return;
        const elapsedSec = (Date.now() - STATE.lastBlockTimeMs) / 1000;
        let currentDiff = parseInt(document.getElementById('input-difficulty').value) || 3;
        let diffChange = 0;
        
        if (elapsedSec < 30) { diffChange = 2; } 
        else if (elapsedSec < 60) { diffChange = 1; } 
        else if (elapsedSec > 180) { diffChange = -2; } 
        else if (elapsedSec > 120) { diffChange = -1; }

        if (diffChange !== 0) {
            let newDiff = currentDiff + diffChange;
            if (newDiff < 1) newDiff = 1;
            if (newDiff > 19) newDiff = 19;
            
            document.getElementById('input-difficulty').value = newDiff;
            let dirText = diffChange > 0 ? "เพิ่มขึ้น" : "ลดลง"; let levelText = Math.abs(diffChange);
            UI.addLiveNodeLog(`⚙️ [ปรับความยากอัตโนมัติ] บล็อกใช้เวลาไป ${Math.floor(elapsedSec)} วิ. เครือข่าย${dirText} ${levelText} ระดับ -> เป็น Target ${newDiff}!`, 'da');
        }
        STATE.lastBlockTimeMs = Date.now(); 
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
        
        UI.setHashDisplay('ui-prev-hash', STATE.prevHash); 
        
        // ให้ isStartup เป็น true เฉพาะตอนเริ่มเว็บครั้งแรกสุด เพื่อเรียก Mempool.init()
        this.prepareNext(true);
    },
    toggleBotMode() {
        AudioEngine.init(); 
        const isBotOn = document.getElementById('cb-bot-mode') && document.getElementById('cb-bot-mode').checked;
        const bg = document.getElementById('bot-mode-bg');
        const diffInput = document.getElementById('input-difficulty'); 

        if (isBotOn) {
            if(bg) bg.classList.remove('opacity-0');
            if(diffInput) { diffInput.disabled = true; diffInput.classList.add('opacity-50', 'cursor-not-allowed'); }
            UI.addLiveNodeLog(`🚨 [SYSTEM] โหมดแข่งขันเปิด: เครือข่ายบอทเริ่มการเชื่อมต่อ!`, 'bot');
            UI.showToast("ระบบบอทเปิดทำงาน: ไม่อนุญาตให้ปรับความยากด้วยตัวเอง!", "warning");
            STATE.lastBlockTimeMs = Date.now(); 
            
            this.startBotsMining(); 

            if (STATE.botInterval) clearInterval(STATE.botInterval);
            STATE.botInterval = setInterval(() => {
                if (document.getElementById('log-modal').classList.contains('modal-show') || STATE.isBroadcasting) return;
                let diff = parseInt(document.getElementById('input-difficulty').value) || 3;
                const diffMult = Math.pow(2.2, diff - 3); const expectedHashes = 30000 * diffMult; const botChancePerSec = 60000 / expectedHashes; 
                if (Math.random() < botChancePerSec) { this.botFindsBlock(diff); }
            }, 1000);
        } else {
            if(bg) bg.classList.add('opacity-0');
            if(diffInput) { diffInput.disabled = false; diffInput.classList.remove('opacity-50', 'cursor-not-allowed'); }
            UI.addLiveNodeLog(`✅ [SYSTEM] บอทถูกปิดการทำงาน ตอนนี้คุณสามารถปรับความยากได้เอง`, 'system');
            if (STATE.botInterval) clearInterval(STATE.botInterval);
            
            this.stopBotsMining(); 
            if (STATE.isMining) UI.toggleNodeMining('me', true); 
        }
    },
    async botFindsBlock(diff) {
        this.stopBotsMining(); 
        UI.toggleNodeMining('me', false); 
        STATE.isBroadcasting = true; 
        AudioEngine.sfxBotMine();
        const botHash = Utils.generateHash('0'.repeat(diff));
        
        const activeBots = CONFIG.NODES.filter(n => !n.startsWith('sat') && n !== 'me' && !STATE.bannedNodes.has(n));
        if (activeBots.length === 0) { STATE.isBroadcasting = false; return; }
        
        let miningBots = activeBots.filter(id => { const el = document.getElementById(`nd-${id}`); return el && el.querySelector('.mining-indicator'); });
        if (miningBots.length === 0) miningBots = activeBots; 
        
        const botId = miningBots[Math.floor(Math.random() * miningBots.length)];
        const botName = `Node ${botId.toUpperCase()}`;

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
        
        const numBotTxs = Math.floor(Math.random() * 8) + 8; // บอทดึงไป 8-15 Txs
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
                // แก้อนิเมชันสีให้ถูกต้องเมื่อบอทโดนเครือข่ายแบน
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
                if(document.getElementById('cb-bot-mode') && document.getElementById('cb-bot-mode').checked) this.startBotsMining();
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
            
            const newBlock = { height: STATE.liveHeight + 1, hash: botHash, prevHash: STATE.prevHash, merkleRoot: Utils.generateHash(), version: "0x20000000", bits: `${mockBits} (Target ${diff} Zeros)`, nonce: Math.floor(Math.random() * 10000000), time: timeStr, miner: `🤖 Bot ${botId.toUpperCase()}`, reward: `${botReward.toLocaleString()} sats`, transactions: botTxs };
            STATE.blockchain.push(newBlock); STATE.liveHeight++; STATE.prevHash = botHash;

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
                if(document.getElementById('cb-bot-mode') && document.getElementById('cb-bot-mode').checked) this.startBotsMining();
            }, 500);

            // บอทขุดเสร็จ ให้อัปเดต UI โดยไม่เรียกเติม Mempool อัตโนมัติแล้ว
            this.evaluateDifficulty(); 
            UI.renderMempool();
        }
    },
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
        if (STATE.isMining) return; // ป้องกันการกดซ้ำเมื่อเริ่มขุดไปแล้ว
        
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
            btn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none'); // ล็อกปุ่ม 100% ป้องกันการคลิกซ้ำ
        }
        window.App.toggleModal('hash-modal', true);
        
        if(outModal) { 
            outModal.innerHTML = `<div class="text-cyan-400 font-bold">> Constructing Block Header (80 bytes)...</div>
            <div class="text-slate-400 opacity-90 ml-2 mt-1">├ <span class="text-white">Version:</span> ${STATE.minedVersion}</div>
            <div class="text-slate-400 opacity-90 ml-2">├ <span class="text-white">PrevHash:</span> ${Utils.shortenHash(STATE.prevHash)}</div>
            <div class="text-fuchsia-400 font-bold ml-2">├ <span class="text-white">MerkleRoot:</span> ${Utils.shortenHash(STATE.merkleRoot)}</div>
            <div class="text-slate-400 opacity-90 ml-2 mb-2 group relative w-max cursor-help z-50">└ <span class="text-white border-b border-dashed border-slate-500">Nonce:</span> [สุ่มไปเรื่อยๆ]</div>
            <div class="text-amber-400 font-bold mb-2">> Start SHA-256 Hashing...</div>`; 
        }
        if(timerEl) timerEl.innerText = "00:00.00";
        
        let nonce = 0; let found = false; const diffMult = Math.pow(2.2, diff - 3); const expHashes = 30000 * diffMult; const chance = 1 / expHashes; 
        let startT = Date.now(); 
        let totalPausedTime = 0; 
        let pauseStartT = 0;     
        
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

            for(let i=0; i<1000; i++) {
                nonce++; let isWinner = Math.random() < chance; let h = isWinner ? Utils.generateHash('0'.repeat(diff)) : Utils.generateHash();
                if (h.startsWith(target)) {
                    found = true; STATE.isMining = false; UI.toggleNodeMining('me', false); clearInterval(STATE.timerInterval); STATE.minedHash = h.substring(0, 64); STATE.minedNonce = nonce;
                    
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
                if (i === 999 && outModal) { const logDiv = document.createElement('div'); logDiv.className = "mb-1 border-b border-slate-800/40 pb-1"; logDiv.innerHTML = `<span class="text-slate-500">> Hashing... Nonce: ${nonce}</span><br><span class="text-slate-300 opacity-50">${h}</span>`; outModal.appendChild(logDiv); while (outModal.children.length > 100) { outModal.removeChild(outModal.firstChild); } if (termModal) termModal.scrollTop = termModal.scrollHeight; }
            }
            STATE.miningReq = requestAnimationFrame(loop);
        };
        setTimeout(loop, 400); 
    },
    async broadcast() {
        if (STATE.bannedNodes.has('me')) { UI.showToast("☠️ โหนดของคุณถูกแบนถาวร! โปรดเริ่มรอบใหม่", "error"); return; }
        if (!STATE.minedHash) { UI.showToast("คุณต้องขุดเจอบล็อก (Valid Hash) ก่อนกระจายข้อมูล", "warning"); return; }
        
        STATE.isBroadcasting = true; 
        this.stopBotsMining(); 
        
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
                // แก้ไขข้อความในส่วนของ Live Node Gossip ให้แสดงผลถูกต้อง
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

            const newBlock = { height: STATE.liveHeight + 1, hash: STATE.minedHash, prevHash: STATE.prevHash, merkleRoot: STATE.merkleRoot, version: STATE.minedVersion, bits: `${mockBits} (Target ${diff} Zeros)`, nonce: STATE.minedNonce, time: finalTimeStr, miner: "คุณ (Simulator)", reward: `${totalClaimed.toLocaleString()} sats`, transactions: [...STATE.blockTxs] };
            STATE.blockchain.push(newBlock); STATE.liveHeight++; STATE.prevHash = STATE.minedHash;
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
            if(document.getElementById('cb-bot-mode') && document.getElementById('cb-bot-mode').checked) this.startBotsMining();
        }, 500); 

        // ไม่เรียก Mempool.init() แล้ว เพื่อให้การเติมธุรกรรมไหลมาตาม Gossip เท่านั้น (ส่งค่า false เป็นสัญญาณบอกว่าไม่ใช่ตอนโหลดเว็บครั้งแรก)
        setTimeout(() => this.prepareNext(false), 1000);
    },
    prepareNext(isStartup = false) {
        UI.setHashDisplay('ui-prev-hash', STATE.prevHash); 
        STATE.blockTxs = []; 
        STATE.minedHash = ""; 
        STATE.minedNonce = 0; 
        
        // ถ้าเป็นการโหลดเว็บครั้งแรก ให้สุ่มใส่ให้เต็ม 25 อัน แต่ถ้าเพิ่งขุดเสร็จ แค่ล้างกล่อง Candidate แล้วให้สตรีมทำงานต่อ
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