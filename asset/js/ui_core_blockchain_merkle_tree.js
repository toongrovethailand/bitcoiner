window.UI = window.UI || {};
Object.assign(window.UI, {
    drawMerkleTree() {
        const canvas = document.getElementById('merkle-tree-canvas'); 
        if (!canvas || !STATE.merkleTreeData) return; 
        
        canvas.innerHTML = '';
        canvas.style.position = 'relative'; 

        const rawLevels = STATE.merkleTreeData.levels; 
        const totalLevels = rawLevels.length;

        const levels = [];
        for (let i = 0; i < totalLevels; i++) {
            const currentLevel = [];
            for(let j = 0; j < rawLevels[i].length; j++) {
                let nodeData = Object.assign({}, rawLevels[i][j]);
                if (nodeData.isDup) nodeData.isDup = false; 
                currentLevel.push(nodeData);
            }
            
            if (i < totalLevels - 1 && currentLevel.length % 2 !== 0) {
                const lastNode = currentLevel[currentLevel.length - 1];
                currentLevel.push({ ...lastNode, isGhostClone: true });
            }
            levels.push(currentLevel);
        }

        const LEAF_WIDTH = 90;     
        const BRANCH_WIDTH = 180;  
        const GAP_X = 30;           
        const GAP_Y = 85;           
        const BOX_HEIGHT = 45;      

        const coords = [];
        for (let i = 0; i < totalLevels; i++) {
            coords[i] = [];
            // ปรับ Y ให้ขยับต้นไม้ลงมา 100px เพื่อเว้นที่ให้ UTXO Set ด้านบน
            const y = (totalLevels - 1 - i) * GAP_Y + 100; 
            
            for (let j = 0; j < levels[i].length; j++) {
                let x;
                if (i === 0) {
                    // ปรับ X ขยับไปทางขวา 60px เพื่อเว้นพื้นที่ขอบซ้ายให้เส้นอ้อม
                    x = 60 + (LEAF_WIDTH / 2) + j * (LEAF_WIDTH + GAP_X);
                } else {
                    if (levels[i][j].isGhostClone) {
                        const prevX = coords[i][j - 1].x;
                        x = prevX + BRANCH_WIDTH + GAP_X;
                    } else {
                        const child1X = coords[i - 1][j * 2].x;
                        const child2X = coords[i - 1][j * 2 + 1].x;
                        x = (child1X + child2X) / 2;
                    }
                }
                coords[i].push({ x, y });
            }
        }

        let maxRightX = 0;
        for (let i = 0; i < totalLevels; i++) {
            const lastX = coords[i][coords[i].length - 1].x;
            if (lastX > maxRightX) maxRightX = lastX;
        }

        const UTXO_BOX_WIDTH = 120;
        // เผื่อพื้นที่ขวาสุด 60px สำหรับเส้นอ้อมทางขวา
        const containerWidth = maxRightX + (BRANCH_WIDTH / 2) + 60; 
        // เผื่อความสูงด้านล่างเพิ่มขึ้นเป็น 40px เพื่อให้เส้นอ้อมลงข้างล่างไม่โดนตัด
        const containerHeight = coords[0][0].y + BOX_HEIGHT + 40;

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

        // --- วาดกล่อง UTXO Set ลอยอยู่กึ่งกลางด้านบน ---
        const rootCoord = coords[totalLevels - 1][0];
        const utxoX = rootCoord.x; // กึ่งกลางอิงตาม Root
        const utxoY = 15; // ด้านบนสุด

        const utxoBox = document.createElement('div');
        utxoBox.style.position = 'absolute';
        utxoBox.style.left = `${utxoX}px`;
        utxoBox.style.top = `${utxoY}px`;
        utxoBox.style.transform = 'translateX(-50%)';
        utxoBox.style.height = `${BOX_HEIGHT}px`;
        utxoBox.style.width = `${UTXO_BOX_WIDTH}px`;
        utxoBox.className = "bg-amber-950/80 border-2 border-amber-500/80 text-amber-200 rounded-lg font-mono text-[9px] sm:text-[10px] text-center flex flex-col justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)] z-30 transition-all duration-300";
        utxoBox.innerHTML = `<span class="font-bold opacity-90 block mb-0.5 uppercase tracking-wider">📚 UTXO Set</span><span class="truncate opacity-70">(สมุดบัญชีเครือข่าย)</span>`;
        wrapper.appendChild(utxoBox);

        for (let i = 1; i < totalLevels; i++) {
            for (let j = 0; j < levels[i].length; j++) {
                const parentNode = levels[i][j];
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

                    if (childNodeData.isCorrupted) {
                        // หน่วงเวลา Avalanche Effect ให้รอกระบวนการตรวจสอบ UTXO เสร็จก่อน (บวกไปอีก 1500ms)
                        const delayMs = (i - 1) * 600 + 1500; 
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

        for (let i = 0; i < totalLevels; i++) {
            for (let j = 0; j < levels[i].length; j++) {
                const nodeData = levels[i][j];
                const coord = coords[i][j];
                
                const isLeaf = i === 0;
                const isRoot = i === totalLevels - 1;
                
                let title = isRoot ? "Merkle Root" : (isLeaf ? `[Tx] ${nodeData.originalTx}` : "Combined Hash");
                let finalBgClass = "bg-slate-900 border-slate-700 text-slate-400"; 
                
                if (isLeaf && nodeData.originalTx === "COINBASE") {
                    title = "💰 Coinbase";
                }

                if (nodeData.isGhostClone) {
                    finalBgClass = "bg-amber-950/30 border-amber-500/50 border-dashed text-amber-500 opacity-80"; 
                    title = "👻 โคลนตัวเอง";
                } else if (nodeData.isCorrupted && isLeaf) {
                    title = `🚨 [Tx] โกง!`; 
                } else if (isRoot) {
                    finalBgClass = "bg-fuchsia-950/60 border-fuchsia-500 text-fuchsia-300 shadow-[0_0_15px_rgba(217,70,239,0.4)]";
                } else if (isLeaf && nodeData.originalTx === "COINBASE") {
                    finalBgClass = "bg-emerald-950/40 border-emerald-600 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]";
                }

                const box = document.createElement('div');
                box.style.position = 'absolute';
                box.style.left = `${coord.x}px`;
                box.style.top = `${coord.y}px`;
                box.style.transform = 'translateX(-50%)';
                box.style.height = `${BOX_HEIGHT}px`;
                box.style.width = `${isLeaf ? LEAF_WIDTH : BRANCH_WIDTH}px`;
                box.id = `merkle-node-${i}-${j}`; 
                
                const fontClass = isLeaf ? "text-[7.5px] sm:text-[8px]" : "text-[9.5px] sm:text-[10px]";
                const pxClass = isLeaf ? "px-1" : "px-3";
                
                box.className = `${pxClass} border-[1.5px] rounded-lg font-mono ${fontClass} text-center flex flex-col justify-center transition-all duration-500 ${finalBgClass} z-20 shrink-0 shadow-sm`;
                box.innerHTML = `<span class="font-bold opacity-80 block mb-0.5 uppercase tracking-wider truncate title-span">${title}</span><span class="truncate hash-span">${Utils.shortenHash(nodeData.hash)}</span>`;
                
                if (nodeData.isCorrupted && isLeaf) {
                    // --- แอนิเมชันตรวจสอบ UTXO Set (ลากเส้นออกล่างสุด แล้วอ้อมซ้ายขวา) ---
                    const isLeftSide = coord.x <= utxoX;
                    // จุดหลบต้นไม้ไปทางซ้ายสุด หรือ ขวาสุด
                    const bypassX = isLeftSide ? 15 : containerWidth - 15;
                    // ขอบกล่อง UTXO ด้านซ้ายหรือขวา
                    const utxoSideX = isLeftSide ? utxoX - (UTXO_BOX_WIDTH/2) : utxoX + (UTXO_BOX_WIDTH/2);
                    
                    const startX = coord.x;
                    const startY = coord.y + BOX_HEIGHT; // จุดเริ่มต้น: กึ่งกลางขอบล่างของ Tx
                    const dropY = startY + 20; // ดรอปเส้นลงมาด้านล่าง 20px ให้พ้นกล่อง
                    const utxoTargetY = utxoY + (BOX_HEIGHT/2);

                    // 1. วาดเส้นตรวจสอบสีเหลือง วิ่งลงล่าง -> อ้อมซ้าย/ขวา -> ขึ้นบน -> เข้า UTXO
                    const checkPath = document.createElementNS(svgNamespace, "path");
                    checkPath.setAttribute("d", `M ${startX} ${startY} L ${startX} ${dropY} L ${bypassX} ${dropY} L ${bypassX} ${utxoTargetY} L ${utxoSideX} ${utxoTargetY}`);
                    checkPath.setAttribute("fill", "none");
                    checkPath.setAttribute("stroke", "#f59e0b"); // สีเหลือง
                    checkPath.setAttribute("stroke-width", "2");
                    checkPath.setAttribute("stroke-dasharray", "5,5"); 
                    checkPath.setAttribute("class", "transition-all duration-300 opacity-0");
                    svg.appendChild(checkPath);

                    setTimeout(() => {
                        checkPath.classList.remove('opacity-0');
                        checkPath.classList.add('animate-pulse');
                        utxoBox.classList.add('bg-amber-800', 'scale-105');
                        utxoBox.innerHTML = `<span class="font-bold block mb-0.5 uppercase tracking-wider text-white animate-pulse">🔍 Checking...</span><span class="truncate text-amber-200">UTXO Database</span>`;
                    }, 200); 

                    // 2. ผลลัพธ์กลับมาว่า "ผิด"
                    setTimeout(() => {
                        checkPath.setAttribute("stroke", "#e11d48"); // เปลี่ยนเป็นเส้นแดง
                        checkPath.classList.remove('animate-pulse', 'stroke-dasharray');
                        checkPath.removeAttribute('stroke-dasharray');
                        utxoBox.classList.remove('bg-amber-800', 'scale-105');
                        utxoBox.classList.add('bg-rose-950/80', 'border-rose-500');
                        utxoBox.innerHTML = `<span class="font-bold block mb-0.5 uppercase tracking-wider text-rose-400">❌ REJECTED</span><span class="truncate text-rose-200">Double Spend!</span>`;
                        
                        // Tx เปลี่ยนเป็นสีแดง (รู้ตัวว่าผิด)
                        box.classList.remove('bg-slate-900', 'border-slate-700', 'text-slate-400', 'bg-fuchsia-950/60', 'border-fuchsia-500', 'text-fuchsia-300');
                        box.classList.add('bg-rose-900', 'border-rose-500', 'text-white', 'shadow-[0_0_20px_rgba(225,29,72,0.8)]', 'z-50');
                        
                        setTimeout(() => checkPath.remove(), 800);
                        setTimeout(() => {
                            utxoBox.classList.remove('bg-rose-950/80', 'border-rose-500');
                            utxoBox.innerHTML = `<span class="font-bold opacity-90 block mb-0.5 uppercase tracking-wider">📚 UTXO Set</span><span class="truncate opacity-70">(สมุดบัญชีเครือข่าย)</span>`;
                        }, 1200);

                    }, 1200); 

                } else if (nodeData.isCorrupted && !isLeaf) {
                    const delayMs = i * 600 + 1500; 
                    setTimeout(() => {
                        box.classList.remove('bg-slate-900', 'border-slate-700', 'text-slate-400', 'bg-fuchsia-950/60', 'border-fuchsia-500', 'text-fuchsia-300');
                        box.classList.add('bg-rose-950/90', 'border-rose-500', 'text-rose-200', 'shadow-[0_0_15px_rgba(225,29,72,0.6)]');
                    }, delayMs);
                }
                
                wrapper.appendChild(box);
            }
        }

        canvas.appendChild(wrapper);
    }
});