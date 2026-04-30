window.Engine = window.Engine || {};
Object.assign(window.Engine, {
    async broadcast() {
        if (STATE.bannedNodes.has('me')) { UI.showToast("☠️ โหนดของคุณกำลังถูกแบนชั่วคราว! โปรดรอให้บอทขุดผ่านไป 2-4 บล็อก", "error"); return; }
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

        UI.toggleModal('log-modal', true); 
        UI.writeLog(`BitcoinMiner: ขุดพบ proof-of-work แล้ว`, "success"); 
        await Utils.sleep(300);
        UI.writeLog(`CreateNewBlock(): สร้างเทมเพลตบล็อกสำเร็จแล้ว`, "process"); 
        await Utils.sleep(400);
        
        let failed = false;
        if (STATE.minedHash) { UI.writeLog(`CheckBlockHeader(): hash=${Utils.shortenHash(STATE.minedHash)} ตรวจสอบ proof-of-work ผ่าน`, "success"); } else { failed = true; }
        if (!failed) { await Utils.sleep(200); if (isOversize) { UI.writeLog(`CheckBlock(): ขนาดบล็อกล้มเหลว (> 4000000 WU)`, "error"); failed = true; } else { UI.writeLog(`CheckBlock(): ขนาดบล็อกถูกต้อง`, "success"); } }
        if (!failed) { await Utils.sleep(200); if (isBadTime) { UI.writeLog(`CheckBlockHeader(): เวลาของบล็อกล่วงหน้าไปในอนาคตไกลเกินไป`, "error"); failed = true; } else { UI.writeLog(`CheckBlockHeader(): เวลาของบล็อกถูกต้อง`, "success"); } }
        if (!failed) { await Utils.sleep(200); if (isDoubleSpend) { UI.writeLog(`ConnectBlock(): ไม่พบ Input หรือ Input ถูกใช้ไปแล้ว (Double Spend)`, "error"); failed = true; } else { UI.writeLog(`ConnectBlock(): Input ถูกต้อง`, "success"); } }
        if (!failed) { await Utils.sleep(200); if (isBadSig) { UI.writeLog(`ConnectBlock(): VerifyDB() ล้มเหลว: ลายเซ็นไม่ถูกต้อง (Bad Signature)`, "error"); failed = true; } else { UI.writeLog(`ConnectBlock(): ตรวจสอบลายเซ็นผ่าน`, "success"); } }
        if (!failed) { await Utils.sleep(200); if (overClaimed) { UI.writeLog(`CheckBlock(): bad-cb-amount (เคลมรางวัล Coinbase เกินจริง)`, "error"); failed = true; } else { UI.writeLog(`CheckBlock(): รางวัล coinbase ${totalClaimed.toLocaleString()} sats ถูกต้อง`, "success"); } }

        await Utils.sleep(400);
        if (failed || isInvalid) {
            UI.writeLog(`ProcessNewBlock: ปฏิเสธบล็อก ${Utils.shortenHash(STATE.minedHash)} (บล็อกไม่ถูกต้อง)`, "error"); AudioEngine.sfxFinalReject();
        } else {
            UI.writeLog(`AcceptBlock: ยอมรับบล็อกเข้าสู่ระบบ`, "success");
            await Utils.sleep(200);
            UI.writeLog(`UpdateTip: อัปเดตยอดเชนใหม่ best=${Utils.shortenHash(STATE.minedHash)} ความสูง=${STATE.liveHeight + 1} ธุรกรรม=${STATE.blockTxs.length + 1} วันที่=${new Date().toISOString()}`, "final-success"); 
            
            // ==========================================
            // นำการอัปเดตลง Blockchain มาไว้ตรงนี้ เพื่อให้พร้อมสำหรับการขุดใหม่ทันที
            // ==========================================
            if (typeof UI.shootFireworks === 'function') {
                UI.shootFireworks();
            }
            UI.showToast(`🎉 เยี่ยมมาก! บล็อกของคุณถูกบันทึกลงเชนแล้ว (ได้รับ ${totalClaimed.toLocaleString()} sats)`, 'success');
            
            const d = new Date(parseInt(STATE.minedTimeRaw) * 1000); 
            const finalTimeStr = `${STATE.minedTimeRaw} (${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')})`;
            const finalBitsStr = STATE.minedBitsRaw;

            const newBlock = { 
                height: STATE.liveHeight + 1, hash: STATE.minedHash, prevHash: STATE.prevHash, merkleRoot: STATE.merkleRoot, 
                version: STATE.minedVersion, bits: finalBitsStr, 
                nonce: STATE.minedNonce, nonceMethod: STATE.minedNonceMethod, nonceEq: STATE.minedNonceEq, 
                time: finalTimeStr, miner: "คุณ (Simulator)", reward: `${totalClaimed.toLocaleString()} sats`, transactions: [...STATE.blockTxs], 
                timeTaken: STATE.exactMiningTimeSec !== undefined ? STATE.exactMiningTimeSec : Math.max(0, Math.floor((Date.now() - STATE.lastBlockTimeMs) / 1000)) 
            };
            STATE.blockchain.push(newBlock); STATE.liveHeight++; STATE.prevHash = STATE.minedHash;
            
            STATE.lastBlockTimeMs = Date.now();
            
            STATE.liveSubsidy = Utils.getSubsidyForHeight(STATE.liveHeight);
            const inputSub = document.getElementById('input-subsidy');
            if (inputSub) inputSub.value = STATE.liveSubsidy;

            if (window.Leaderboard && window.Leaderboard.calculateAndRender) window.Leaderboard.calculateAndRender();
            
            const strip = document.getElementById('blockchain-strip-right');
            if(strip) { const el = document.createElement('div'); el.className = 'block-cube my-new-block flex-shrink-0 z-10'; const curIdx = STATE.blockchain.length - 1; el.onclick = () => UI.showBlockDetails(curIdx); el.innerHTML = `<span class="text-cyan-400 font-bold text-lg sm:text-xl">#${STATE.liveHeight.toLocaleString()}</span><span class="text-slate-200 text-[10px] sm:text-xs mt-1 text-center leading-tight">Mined by<br>You</span><span class="text-emerald-400 text-[9px] mt-1 font-bold time-ago" data-ts="${Date.now()}">เพิ่งขุดเจอ</span>`; strip.insertBefore(el, strip.firstChild); while (strip.children.length > 4) { strip.removeChild(strip.children[strip.children.length - 3]); } }
            
            UI.addLiveNodeLog(`🔥 <span class="bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-400 text-transparent bg-clip-text font-extrabold text-[11px] sm:text-xs animate-pulse">เครือข่ายบันทึก Block #${STATE.liveHeight} ลงเชนเรียบร้อยแล้ว</span>`, 'system');

            this.evaluateDifficulty(); 

            await Utils.sleep(200);
            UI.writeLog(`Relaying: กำลังกระจายบล็อก ${Utils.shortenHash(STATE.minedHash)} ไปยังโหนดอื่น`, "process");
            AudioEngine.sfxFinalSuccess();
        }
        
        await Utils.sleep(1500);
        UI.toggleModal('log-modal', false);
        await Utils.sleep(500);

        UI.addLiveNodeLog(`🚀 <span class="bg-gradient-to-r from-emerald-400 via-cyan-400 to-fuchsia-400 text-transparent bg-clip-text font-extrabold text-[11px] sm:text-xs">คุณ (ME) ขุดพบ Block: เริ่มกระบวนการ Gossip Protocol ส่งข้อมูลให้โหนดรอบข้าง...</span>`, 'system');
        
        const myWaves = Utils.generateGossipWaves('me');
        let playerReleased = false;

        for (const wave of myWaves) {
            wave.lines.forEach(l => { const el = document.getElementById(l); if(el) { el.classList.remove('anim-line-flow', 'anim-line-fail', 'anim-line-transmit', 'anim-packet-get'); el.classList.add('anim-packet-inv'); } });
            wave.nodes.forEach(n => { 
                let msg = getRandomChat('inv'); 
                let targetNode = `Node ${n.replace('nd-','').toUpperCase()}`;
                UI.showNodeChat(n, "📩 INV", "text-amber-400 border-amber-500/50"); 
                UI.addLiveNodeLog(`คุณ (ME) ➔ ${targetNode}: "${msg}"`, 'inv'); 
            }); 
            await Utils.sleep(500); 
            
            wave.lines.forEach(l => { const el = document.getElementById(l); if(el) { el.classList.remove('anim-packet-inv'); el.classList.add('anim-packet-get'); } });
            wave.nodes.forEach(n => { 
                let msg = getRandomChat('getdata'); 
                let targetNode = `Node ${n.replace('nd-','').toUpperCase()}`;
                UI.showNodeChat(n, "📤 GET", "text-fuchsia-400 border-fuchsia-500/50"); 
                const el = document.getElementById(n); if(el) el.classList.add('anim-node-verifying'); 
                UI.addLiveNodeLog(`${targetNode} ➔ คุณ (ME): "${msg}"`, 'getdata'); 
            }); 
            await Utils.sleep(500); 
            
            wave.lines.forEach(l => { const el = document.getElementById(l); if(el) { el.classList.remove('anim-packet-get'); el.classList.add('anim-line-transmit'); } });
            wave.nodes.forEach(n => { 
                let msg = getRandomChat('block'); 
                let targetNode = `Node ${n.replace('nd-','').toUpperCase()}`;
                UI.showNodeChat(n, "📦 BLK", "text-cyan-400 border-cyan-500/50"); 
                UI.addLiveNodeLog(`คุณ (ME) ➔ ${targetNode}: "${msg}"`, 'block'); 
            }); 
            await Utils.sleep(500);
            
            wave.nodes.forEach(n => { 
                let targetNode = `Node ${n.replace('nd-','').toUpperCase()}`;
                const el = document.getElementById(n); if(el) { el.classList.remove('anim-node-verifying'); el.classList.add(isInvalid ? 'anim-node-fail' : 'anim-node-success'); } 
                let msg = isInvalid ? getRandomChat('reject') : getRandomChat('accept');
                UI.showNodeChat(n, isInvalid ? "🛡️ REJECT" : "✅ ACCEPTED", isInvalid ? "text-amber-400 border-amber-500/50" : "text-emerald-400 border-emerald-500/50"); 
                UI.addLiveNodeLog(`${targetNode} ➔ คุณ (ME): "${msg}"`, isInvalid ? "reject" : "accept");
            });
            wave.lines.forEach(l => { const el = document.getElementById(l); if(el) { el.classList.remove('anim-line-transmit'); el.classList.add(isInvalid ? 'anim-line-fail' : 'anim-line-flow'); } });
            
            // ==========================================
            // เมื่อโหนดรอบข้างบอกว่า ACCEPTED ให้หน่วงเวลา 1 วินาที
            // แล้วเปิดปุ่มให้ผู้เล่นเริ่มขุดใหม่ต่อได้ทันที โดยไม่ต้องรอคลื่นอื่นจบ
            // ==========================================
            if (!isInvalid && !playerReleased) {
                playerReleased = true;
                setTimeout(() => {
                    STATE.isBroadcasting = false; 
                    this.prepareNext(false); // เคลียร์ UI เตรียมพร้อมให้ขุดใหม่
                    
                    // หากผู้เล่นเปิดโหมดขุดอัตโนมัติ ให้เริ่มดึงธุรกรรมและขุดใหม่เลย
                    if (STATE.isAutoMiner && !STATE.bannedNodes.has('me') && !STATE.chainCorrupted) {
                        STATE.manualFee = false;
                        if (window.App && typeof window.App.autoFillFromMempool === 'function') {
                            window.App.autoFillFromMempool();
                        }
                        setTimeout(() => {
                            if (window.Engine && window.Engine.mine) {
                                window.Engine.mine();
                            }
                        }, 500);
                    }
                }, 1000); // ดีเลย์ 1 วินาที (1000ms) ตามที่คุณระบุ
            }

            if (isInvalid) { 
                UI.banNode('me'); 
                UI.addLiveNodeLog(`🚨 [NETWORK] โหนดคุณ (ME) ถูกเครือข่ายเตะออกจากระบบ!`, 'system'); 
                await Utils.sleep(500); Utils.healNetwork(); 
                
                let cheatType = "";
                if (isOversize) cheatType = "สร้างบล็อกขนาดใหญ่เกิน 4M WU (Oversize)";
                else if (isBadTime) cheatType = "ปลอมแปลงเวลา (Invalid Timestamp)";
                else if (isDoubleSpend) cheatType = "พยายามจ่ายเงินซ้ำซ้อน (Double Spend)";
                else if (isBadSig) cheatType = "ปลอมแปลงลายเซ็นดิจิทัล (Bad Signature)";
                else if (overClaimed) cheatType = "เสกรางวัล Coinbase ให้ตัวเองเกินกำหนด (Overclaim)";

                const rewardLost = totalClaimed.toLocaleString();

                const interviewHTML = `
                    <div id="ban-interview-modal" class="fixed inset-0 bg-black/90 backdrop-blur-md z-[500] flex items-center justify-center p-4 transition-opacity duration-300">
                        <div class="bg-[#050B14] border border-rose-600/50 rounded-xl flex flex-col w-full max-w-lg shadow-[0_0_50px_rgba(225,29,72,0.3)] overflow-hidden transform scale-100 transition-transform duration-300 modal-content">
                            <div class="bg-rose-950/80 px-4 py-3 border-b border-rose-800/50 flex justify-center items-center">
                                <span class="text-rose-400 font-bold flex items-center gap-2 text-lg">🚨 เครือข่ายปฏิเสธบล็อกของคุณ!</span>
                            </div>
                            <div class="p-6 font-sans text-sm text-slate-300 space-y-5">
                                <p class="text-white font-bold text-base text-center">คุณถูกแบนเนื่องจากตรวจพบ: <br><span class="text-rose-400 text-lg">${cheatType}</span></p>
                                
                                <div class="bg-slate-900/80 p-4 rounded-lg border border-slate-700 shadow-inner space-y-3 text-xs sm:text-sm">
                                    <div>
                                        <b class="text-rose-400">ทำไมถึงเป็นสิ่งที่ไม่ควรทำ:</b>
                                        <p class="mt-1 text-slate-400 leading-relaxed">กฎ Consensus ถูกตรวจสอบอย่างเข้มงวดโดย Full Nodes นับหมื่นทั่วโลก ทันทีที่คุณส่งบล็อกที่แหกกฎ โหนดเพื่อนบ้านจะเตะบล็อกคุณทิ้งและตัดการเชื่อมต่อ (แบน) คุณทันทีเพื่อปกป้องความปลอดภัยของระบบ</p>
                                    </div>
                                    <div>
                                        <b class="text-amber-400">ทำไมถึงไม่คุ้มค่าเลย:</b>
                                        <p class="mt-1 text-slate-400 leading-relaxed">การขุด (Proof-of-Work) ต้องสูญเสียพลังงานไฟฟ้าและเวลาประมวลผลมหาศาล การที่คุณพยายามโกงจนโดนจับได้ สิ่งที่คุณจะได้คือการ <b class="text-white">สูญเสียพลังงานไปฟรีๆ</b> และชวดเงินรางวัลมูลค่า <b class="text-emerald-400">${rewardLost} sats</b> ที่คุณควรจะได้หากทำตามกฎ!</p>
                                    </div>
                                </div>

                                <div class="text-center pt-2">
                                    <p class="text-cyan-300 font-bold mb-4">"คุณเข้าใจและพร้อมที่จะทำตามกฎกติกาเพื่อเริ่มต้นขุดใหม่แล้วใช่หรือไม่?"</p>
                                    <div class="flex flex-col sm:flex-row gap-3 justify-center">
                                        <button id="btn-ban-yes" class="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 px-6 rounded-lg shadow transition-all w-full sm:w-auto">ใช่ เข้าใจแล้ว (เริ่มใหม่)</button>
                                        <button id="btn-ban-no" class="bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white font-bold py-2.5 px-6 rounded-lg border border-slate-700 hover:border-rose-500 transition-all w-full sm:w-auto">ไม่ใช่ (ก็ยังจะโกง)</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.insertAdjacentHTML('beforeend', interviewHTML);
                
                await new Promise(resolve => {
                    const btnYes = document.getElementById('btn-ban-yes');
                    const btnNo = document.getElementById('btn-ban-no');

                    btnYes.onclick = () => {
                        if (window.UI && window.UI.showToast) window.UI.showToast("เยี่ยมมาก! เครือข่ายยินดีต้อนรับนักขุดที่ซื่อสัตย์เสมอ", "success");
                        resolve();
                    };

                    btnNo.onclick = () => {
                        btnYes.disabled = true;
                        btnNo.disabled = true;
                        btnYes.classList.add('opacity-50', 'cursor-not-allowed');
                        btnNo.classList.add('opacity-50', 'cursor-not-allowed', 'bg-rose-900', 'text-white', 'border-rose-500');
                        btnNo.classList.remove('hover:bg-rose-900', 'hover:border-rose-500');

                        if (window.UI && window.UI.showToast) window.UI.showToast("ยังดื้ออีก! งั้นโดนทำโทษกักบริเวณ 10 วินาที!", "error");

                        let timeLeft = 10;
                        btnNo.innerText = `⏳ กำลังรับโทษ... (${timeLeft}s)`;

                        const countdown = setInterval(() => {
                            timeLeft--;
                            if (timeLeft > 0) {
                                btnNo.innerText = `⏳ กำลังรับโทษ... (${timeLeft}s)`;
                            } else {
                                clearInterval(countdown);
                                if (window.UI && window.UI.showToast) window.UI.showToast("พ้นโทษแล้ว! หวังว่าจะจำและทำตามกฎเครือข่ายนะ", "warning");
                                resolve();
                            }
                        }, 1000);
                    };
                });

                const modal = document.getElementById('ban-interview-modal');
                if (modal) modal.remove();
                
                if (window.UI && window.UI.unbanNode) window.UI.unbanNode('me');
                
                // คืนค่าระบบหลังถูกแบนเสร็จ
                STATE.isBroadcasting = false;
                this.prepareNext(false);
                break; 
            }
        }

        // เคลียร์แอนิเมชันตอนจบ
        setTimeout(() => {
            document.querySelectorAll('.net-link').forEach(l => { l.classList.remove('anim-line-flow', 'anim-line-fail', 'anim-line-transmit', 'anim-packet-inv', 'anim-packet-get'); });
            CONFIG.NODES.forEach(n => { const el = document.getElementById('nd-'+n); if(el && !STATE.bannedNodes.has(n)) el.classList.remove('anim-node-success', 'anim-node-fail', 'anim-node-verifying'); });
            const meEl = document.getElementById('nd-me'); if (meEl && !STATE.bannedNodes.has('me')) { meEl.classList.remove('anim-node-success', 'anim-node-fail', 'anim-node-verifying'); }
            
            // สั่งบอทให้กลับมาขุดต่อ
            if(STATE.isBotMode && !STATE.bannedNodes.has('me') && !STATE.chainCorrupted) {
                this.startBotsMining();
            }
        }, 500); 
    }
});