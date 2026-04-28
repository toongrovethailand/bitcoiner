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

    drawMerkleTree() {
        const canvas = document.getElementById('merkle-tree-canvas'); 
        if (!canvas || !STATE.merkleTreeData) return; 
        
        canvas.innerHTML = '';
        canvas.style.position = 'relative'; 

        const rawLevels = STATE.merkleTreeData.levels; 
        const totalLevels = rawLevels.length;

        // 1. จำลอง Binary Tree เสมือนจริง (Odd-Number Rule)
        // ทำการคลี่ปม Shorthand ออกมาให้เห็นกิ่งโคลนชัดเจนแบบในระบบ bitcoind
        const levels = [];
        for (let i = 0; i < totalLevels; i++) {
            const currentLevel = [];
            for(let j = 0; j < rawLevels[i].length; j++) {
                let nodeData = Object.assign({}, rawLevels[i][j]);
                // ปลดป้ายเดิมที่มาจากระบบรวบรัด
                if (nodeData.isDup) nodeData.isDup = false; 
                currentLevel.push(nodeData);
            }
            
            // กฎเลขคี่: ถ้าไม่ใช่ชั้น Root และมีจำนวนโหนดเป็นคี่ ให้จำลองการใส่โหนดตัวสุดท้ายซ้ำ (โคลน) เข้าไป
            if (i < totalLevels - 1 && currentLevel.length % 2 !== 0) {
                const lastNode = currentLevel[currentLevel.length - 1];
                currentLevel.push({ ...lastNode, isGhostClone: true });
            }
            levels.push(currentLevel);
        }

        // ขนาดกล่อง Tx เล็กกว่า Combined Hash ครึ่งหนึ่ง
        const LEAF_WIDTH = 90;     
        const BRANCH_WIDTH = 180;  
        const GAP_X = 30;           
        const GAP_Y = 85;           
        const BOX_HEIGHT = 45;      

        // 2. คำนวณพิกัดแกน X แบบคณิตศาสตร์จากล่าง (Leaves) ขึ้นบน (Root)
        const coords = [];
        for (let i = 0; i < totalLevels; i++) {
            coords[i] = [];
            const y = (totalLevels - 1 - i) * GAP_Y + 20; 
            
            for (let j = 0; j < levels[i].length; j++) {
                let x;
                if (i === 0) {
                    // ชั้น [Tx]: วางเรียงจากซ้ายไปขวา
                    x = (LEAF_WIDTH / 2) + j * (LEAF_WIDTH + GAP_X);
                } else {
                    if (levels[i][j].isGhostClone) {
                        // โหนดโคลน วางต่อจากโหนดจริงทางขวาในชั้นเดียวกัน
                        const prevX = coords[i][j - 1].x;
                        x = prevX + BRANCH_WIDTH + GAP_X;
                    } else {
                        // โหนดทั่วไป หาค่ากึ่งกลางของลูกสองตัวด้านล่างเสมอ
                        const child1X = coords[i - 1][j * 2].x;
                        const child2X = coords[i - 1][j * 2 + 1].x;
                        x = (child1X + child2X) / 2;
                    }
                }
                coords[i].push({ x, y });
            }
        }

        // หากรอบขอบเขต (Container) กว้างที่สุดเพื่อไม่ให้เกิดการตัดขอบ
        let maxRightX = 0;
        for (let i = 0; i < totalLevels; i++) {
            const lastX = coords[i][coords[i].length - 1].x;
            if (lastX > maxRightX) maxRightX = lastX;
        }
        const containerWidth = maxRightX + (BRANCH_WIDTH / 2) + 20; 
        const containerHeight = coords[0][0].y + BOX_HEIGHT + 20;

        const wrapper = document.createElement('div');
        wrapper.className = 'relative mx-auto'; 
        wrapper.style.width = `${containerWidth}px`;
        wrapper.style.height = `${containerHeight}px`;

        const svgNamespace = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNamespace, "svg");
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.zIndex = '0';
        svg.style.pointerEvents = 'none'; 
        svg.style.overflow = 'visible'; 
        wrapper.appendChild(svg);

        // 3. วาดเส้นตั้งฉาก
        for (let i = 1; i < totalLevels; i++) {
            for (let j = 0; j < levels[i].length; j++) {
                const parentNode = levels[i][j];
                
                // ข้ามการวาดเส้น ถ้าเป็นโหนดโคลนในชั้นถัดๆไป (ไม่มีการดึงแฮชจากลูก เพราะมันทำซ้ำในระดับตัวเอง)
                if (parentNode.isGhostClone) continue; 

                const parentCoord = coords[i][j];
                const childIdx1 = j * 2;
                const childIdx2 = j * 2 + 1;
                
                const child1Coord = coords[i - 1][childIdx1];
                const child2Coord = coords[i - 1][childIdx2];
                
                const drawPath = (cCoord, childNodeData) => {
                    const parentBottom = parentCoord.y + BOX_HEIGHT;
                    const childTop = cCoord.y;
                    const midY = (parentBottom + childTop) / 2;

                    const path = document.createElementNS(svgNamespace, "path");
                    path.setAttribute("d", `M ${cCoord.x} ${childTop} L ${cCoord.x} ${midY} L ${parentCoord.x} ${midY} L ${parentCoord.x} ${parentBottom}`);
                    path.setAttribute("fill", "none");
                    path.setAttribute("stroke", "#10b981"); 
                    path.setAttribute("stroke-width", "1");
                    path.setAttribute("class", "transition-all duration-300");

                    // เส้นโกง
                    if (childNodeData.isCorrupted) {
                        const delayMs = (i - 1) * 600 + 300; 
                        setTimeout(() => {
                            path.setAttribute("stroke", "#e11d48"); 
                            path.setAttribute("stroke-width", "1.5");
                            path.style.filter = "drop-shadow(0px 0px 6px rgba(225,29,72,0.8))";
                        }, delayMs); 
                    }
                    svg.appendChild(path);
                };

                drawPath(child1Coord, levels[i - 1][childIdx1]);
                if (child2Coord) {
                    drawPath(child2Coord, levels[i - 1][childIdx2]);
                }
            }
        }

        // 4. สร้างและวางกล่องด้วย Absolute Position
        for (let i = 0; i < totalLevels; i++) {
            for (let j = 0; j < levels[i].length; j++) {
                const nodeData = levels[i][j];
                const coord = coords[i][j];
                
                const isLeaf = i === 0;
                const isRoot = i === totalLevels - 1;
                
                let title = isRoot ? "Merkle Root" : (isLeaf ? `[Tx] ${nodeData.originalTx}` : "Combined Hash");
                let finalBgClass = "bg-slate-900 border-slate-700 text-slate-400"; 
                
                if (nodeData.isCorrupted && isLeaf) {
                    title = `🚨 [Tx] โกง!`; 
                } else if (nodeData.isGhostClone) {
                    finalBgClass = "bg-amber-950/30 border-amber-500/50 border-dashed text-amber-500 opacity-80"; 
                    title = "👻 โคลนตัวเอง";
                } else if (isRoot) {
                    finalBgClass = "bg-fuchsia-950/60 border-fuchsia-500 text-fuchsia-300 shadow-[0_0_15px_rgba(217,70,239,0.4)]";
                }

                const box = document.createElement('div');
                box.style.position = 'absolute';
                box.style.left = `${coord.x}px`;
                box.style.top = `${coord.y}px`;
                box.style.transform = 'translateX(-50%)'; // จัดให้อยู่กึ่งกลางพิกัดอย่างสมบูรณ์
                box.style.height = `${BOX_HEIGHT}px`;
                box.style.width = `${isLeaf ? LEAF_WIDTH : BRANCH_WIDTH}px`;
                
                const fontClass = isLeaf ? "text-[7.5px] sm:text-[8px]" : "text-[9.5px] sm:text-[10px]";
                const pxClass = isLeaf ? "px-1" : "px-3";
                
                box.className = `${pxClass} border-[1.5px] rounded-lg font-mono ${fontClass} text-center flex flex-col justify-center transition-all duration-500 ${finalBgClass} z-20 shrink-0 shadow-sm`;
                box.innerHTML = `<span class="font-bold opacity-80 block mb-0.5 uppercase tracking-wider truncate">${title}</span><span class="truncate">${Utils.shortenHash(nodeData.hash)}</span>`;
                
                if (nodeData.isCorrupted) {
                    const delayMs = i * 600; 
                    setTimeout(() => {
                        box.classList.remove('bg-slate-900', 'border-slate-700', 'text-slate-400', 'bg-fuchsia-950/60', 'border-fuchsia-500', 'text-fuchsia-300');
                        // นำคลาส scale-110 และ anim-shake-once ออก เพื่อไม่ให้รบกวนพิกัดเดิม
                        if (isLeaf) {
                            box.classList.add('bg-rose-900', 'border-rose-500', 'text-white', 'shadow-[0_0_20px_rgba(225,29,72,0.8)]', 'z-50');
                        } else {
                            box.classList.add('bg-rose-950/90', 'border-rose-500', 'text-rose-200', 'shadow-[0_0_15px_rgba(225,29,72,0.6)]');
                        }
                    }, delayMs);
                }
                
                wrapper.appendChild(box);
            }
        }

        canvas.appendChild(wrapper);
    },
    
    renderMempool() {
        const memEl = document.getElementById('mempool-list'); const blkEl = document.getElementById('block-list'); if(!memEl || !blkEl) return;
        memEl.innerHTML = ''; blkEl.innerHTML = ''; let curVb = 0; 
        
        let newFee = 0;
        STATE.blockTxs.forEach(tx => { curVb += tx.vb; newFee += tx.fee; blkEl.innerHTML += this.createTxCardHTML(tx, 'block'); });
        STATE.actualFee = newFee;
        
        STATE.mempoolTxs.forEach(tx => memEl.innerHTML += this.createTxCardHTML(tx, 'mempool'));
        
        document.getElementById('block-size-text').innerText = curVb.toLocaleString(); 
        document.getElementById('block-fee-text').innerText = STATE.actualFee.toLocaleString(); 
        document.getElementById('input-fee').value = STATE.actualFee; 
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
        }
    },
    createTxCardHTML(tx, loc) { const isM = loc === 'mempool'; return `<div onclick="window.App.moveTx('${tx.id}', '${isM?'block':'mempool'}')" class="tx-card ${isM?'bg-slate-900/50 border-slate-800':'bg-cyan-900/30 border-cyan-800'} border rounded flex justify-between items-center hover:border-cyan-500 transition-colors cursor-pointer mb-2 p-2"><div><div class="text-sm font-bold text-${isM?'slate':'cyan'}-400">${tx.type} [${tx.id}]</div><div class="text-xs text-slate-400 mt-0.5">${tx.vb} vB | ${tx.satPerVb} sat/vB</div></div><div class="text-sm text-amber-400 font-bold">+${tx.fee.toLocaleString()} sats</div></div>`; }
});