var CONFIG = {
    MAX_BLOCK_VB: 4000,
    API_TIMEOUT_MS: 5000,
    NODES: ['th', 'sg', 'my', 'vn', 'in', 'cn', 'jp', 'kr', 'au', 'ph', 'ae', 'za', 'ru', 'de', 'uk', 'fr', 'it', 'tr', 'us', 'ca', 'mx', 'br', 'ar', 'sat1', 'sat2', 'sat3'],
    CONNECTIONS: {
        'ca': ['us', 'sat2'], 'us': ['ca', 'mx', 'sat2'], 'mx': ['us', 'br'], 'br': ['mx', 'ar', 'sat3'], 'ar': ['br'],
        'uk': ['fr', 'de', 'sat2'], 'fr': ['uk', 'it'], 'de': ['uk', 'it'], 'it': ['fr', 'de', 'tr', 'sat3'],
        'tr': ['it', 'ru', 'ae'], 'ru': ['tr', 'cn', 'sat1'], 'ae': ['tr', 'in'], 'in': ['ae', 'cn', 'th', 'me'],
        'cn': ['ru', 'in', 'kr'], 'kr': ['cn', 'jp'], 'jp': ['kr', 'sat1'], 'th': ['in', 'vn', 'my', 'me'],
        'vn': ['th', 'ph'], 'ph': ['vn', 'au'], 'my': ['th', 'sg', 'me'], 'sg': ['my', 'au'], 'au': ['ph', 'sg'],
        'sat1': ['ru', 'jp', 'sat2'], 'sat3': ['it', 'za', 'br', 'me'],
        'sat2': ['sat1', 'ca', 'us', 'uk'], 'za': ['sat3'], 'me': ['th', 'my', 'in', 'sat3']
    },
    NODE_POS: {
        'ca': [22, 18], 'us': [18, 30], 'mx': [14, 45], 'br': [30, 65], 'ar': [26, 82],
        'uk': [44, 22], 'fr': [46, 34], 'de': [52, 24], 'it': [54, 40], 'tr': [62, 40],
        'ru': [74, 20], 'ae': [64, 54], 'in': [72, 50], 'cn': [80, 36], 'kr': [88, 30],
        'jp': [94, 40], 'th': [80, 62], 'vn': [86, 60], 'ph': [92, 66], 'my': [78, 72],
        'sg': [84, 80], 'au': [92, 86], 'me': [68, 68], 'sat1': [80, 8], 'sat2': [35, 8],
        'sat3': [56, 60], 'za': [52, 80]
    }
};

var P2P_DIALOG = {
    inv: ["เฮ้ย มีบล็อกใหม่เว้ย เอาป่าว?", "เจอของดีละ ดึงไหม?", "มีอัปเดตเชน สนใจป่าว?", "มี Block ใหม่เพิ่งขุดเจอ โหลดไหม?", "เฮ้ย... มีของว่ะ บล็อกใหม่กริ๊บ", "บล็อกใหม่มาแล้วจ้า มียัง?", "เดี๋ยวหาว่าคุย เจอบล็อกใหม่อีกละ เอาป่ะ ?", "บล็อกใหม่ ๆ เลย มีรึยัง"],
    getdata: ["จัดมาเลยลูกพี่!", "ขอดูหน่อยซิ ส่งมาๆ", "โหลดมาเลย พร้อมตรวจ!", "ส่งมาโลด รอดูอยู่!" , "ส่งมาซะดี ๆ รอดูอยู่!" , "ส่งมาดิ เอาหมด"],
    block: ["รับไป 📦 ไฟล์หนักหน่อยนะ", "อ่ะ โหลดไปซะ!", "กำลังส่ง Block Data...", "โยนให้แล้ว ตรวจด้วย!" , "รบกวนตรวจสอบด้วยนะครับ" , "เอ้ารับ.."],
    accept: ["ของแท้ ผ่าน!", "เรียบร้อย ลงเชน!", "ถูกต้องตามกฎเป๊ะ", "จัดไป บันทึกแล้ว!" , "แท้..ดูง่าย"],
    reject: ["บล็อกปลอมนี่หว่า แบน!", "กฎไม่ผ่าน โดนเตะทิ้ง!", "เล่นตุกติกนี่ Reject!", "ข้อมูลมั่ว ขยะชัดๆ!" , "ไปคุยกับรากมะม่วงซะ!"]
};

var getRandomChat = (type) => P2P_DIALOG[type][Math.floor(Math.random() * P2P_DIALOG[type].length)];

var STATE = {
    actualFee: 0, liveSubsidy: 312500000, liveExpectedZeros: 19, liveHeight: 840000,
    merkleRoot: "", minedHash: "", minedNonce: 0, minedVersion: "", minedBits: "",
    prevHash: "", syncedHash: "", syncedPrevHash: "", syncedTime: "",
    syncedMiner: "", syncedReward: 0, syncedMerkleRoot: "", syncedVersion: "", syncedBits: "", syncedNonce: 0,
    blockchain: [], mempoolTxs: [], blockTxs: [],
    miningReq: null, timerInterval: null, merkleTreeData: null,
    botInterval: null, botStartTimers: [], txStreamInterval: null,
    isBroadcasting: false, isMining: false, 
    lastBlockTimeMs: Date.now(), bannedNodes: new Set() 
};

var AudioEngine = {
    ctx: null,
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); },
    play(freq, type, duration, vol = 0.1) { if (!this.ctx) return; const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain(); osc.type = type; osc.frequency.setValueAtTime(freq, this.ctx.currentTime); gain.gain.setValueAtTime(vol, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration); osc.connect(gain); gain.connect(this.ctx.destination); osc.start(); osc.stop(this.ctx.currentTime + duration); },
    sfxTick() { this.play(1200, 'square', 0.03, 0.015); }, 
    sfxFound() { this.play(880, 'sine', 0.1, 0.1); setTimeout(() => this.play(1760, 'sine', 0.3, 0.1), 100); }, 
    sfxFail() { this.play(150, 'sawtooth', 0.3, 0.1); }, 
    sfxFinalSuccess() { [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => { setTimeout(() => this.play(f, 'square', 0.2, 0.1), i * 100); }); }, 
    sfxFinalReject() { this.play(100, 'sawtooth', 0.5, 0.15); setTimeout(() => this.play(80, 'sawtooth', 0.8, 0.15), 300); },
    sfxBotMine() { this.play(400, 'triangle', 0.2, 0.15); setTimeout(() => this.play(300, 'sawtooth', 0.3, 0.15), 200); }
};

var Utils = {
    sleep: ms => new Promise(r => setTimeout(r, ms)),
    generateHash: (prefix = "") => { let hash = prefix; while(hash.length < 64) hash += Math.random().toString(16).substring(2); return hash.substring(0, 64); },
    getTimeString: () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour12: false }),
    shortenHash: (hash) => { if (!hash || hash.length < 12) return hash || "Syncing..."; return hash.substring(0, 12) + '...' + hash.substring(hash.length - 5); },
    deterministicHash: (input) => {
        let h1 = 0xdeadbeef ^ input.length, h2 = 0x41c6ce57 ^ input.length;
        for (let i = 0, ch; i < input.length; i++) { ch = input.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        const out = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
        return out.padStart(16, '0').repeat(4);
    },
    getTimeAgo: (tsMs) => {
        const diff = Math.floor((Date.now() - tsMs) / 1000);
        if (diff < 60) return "เพิ่งขุดเจอ";
        const mins = Math.floor(diff / 60);
        if (mins < 60) return `${mins} นาทีที่แล้ว`;
        const hrs = Math.floor(mins / 60);
        return `${hrs} ชม. ที่แล้ว`;
    },
    buildMerkleTreeData: (txList, isCorrupted = false) => {
        if (!txList || txList.length === 0) return { root: "0000000000000000000000000000000000000000000000000000000000000000", levels: [] };
        let levels = [];
        let currentLevel = txList.map((tx, idx) => {
            let hash = tx === "COINBASE" ? `reward:${STATE.liveSubsidy + STATE.actualFee}` : tx;
            if (isCorrupted && idx === txList.length - 1) hash = hash + "_DOUBLE_SPEND_HACK"; 
            return { hash: Utils.deterministicHash(hash), type: tx === "COINBASE" ? 'Coinbase' : 'Tx', originalTx: tx, isCorrupted: (isCorrupted && idx === txList.length - 1) };
        });
        levels.push([...currentLevel]);
        while (currentLevel.length > 1) {
            let nextLevel = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
                let left = currentLevel[i]; let right, isDup = false;
                if (i + 1 < currentLevel.length) { right = currentLevel[i + 1]; } else { right = left; isDup = true; }
                let combinedHash = Utils.deterministicHash(left.hash + right.hash);
                let corrupted = left.isCorrupted || right.isCorrupted; 
                nextLevel.push({ hash: combinedHash, type: 'Branch', isDup: isDup, isCorrupted: corrupted });
            }
            levels.push([...nextLevel]); currentLevel = nextLevel;
        }
        return { root: currentLevel[0].hash, levels: levels };
    },
    generateGossipWaves: (startNodeId) => {
        if (STATE.bannedNodes.has(startNodeId)) return []; 
        let waves = []; let visitedNodes = new Set([startNodeId]); let visitedLines = new Set(); let currentNodes = [startNodeId];
        while (currentNodes.length > 0) {
            let nextNodes = []; let waveLines = []; let waveNodes = [];
            for (let node of currentNodes) {
                if (CONFIG.CONNECTIONS[node]) {
                    for (let neighbor of CONFIG.CONNECTIONS[node]) {
                        if (STATE.bannedNodes.has(neighbor)) continue; 
                        let lineId1 = `l-${node}-${neighbor}`; let lineId2 = `l-${neighbor}-${node}`;
                        let lineToUse = document.getElementById(lineId1) ? lineId1 : (document.getElementById(lineId2) ? lineId2 : null);
                        if (lineToUse && !visitedLines.has(lineToUse)) {
                            visitedLines.add(lineToUse); waveLines.push(lineToUse);
                            if (!visitedNodes.has(neighbor)) { visitedNodes.add(neighbor); waveNodes.push(`nd-${neighbor}`); nextNodes.push(neighbor); }
                        }
                    }
                }
            }
            if (waveLines.length > 0 || waveNodes.length > 0) waves.push({ lines: waveLines, nodes: waveNodes });
            currentNodes = nextNodes;
        }
        return waves;
    },
    async fetchWithTimeout(resource, options = {}) {
        const { timeout = 5000 } = options;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(resource, { ...options, signal: controller.signal });
        clearTimeout(id); return response;
    },
    
    // ===== อัปเดตระบบ Heal Network คำนวณระยะทางโหนดและสร้างเส้นประดาวเทียม =====
    healNetwork() {
        const allNodes = Object.keys(CONFIG.CONNECTIONS);
        const healthyNodes = allNodes.filter(n => !STATE.bannedNodes.has(n));
        let root = healthyNodes.includes('me') ? 'me' : (healthyNodes.length > 0 ? healthyNodes[0] : null);
        if (!root) return;

        // ค้นหาโหนดที่ยังต่อกันเป็นเครือข่ายหลักอยู่
        let visited = new Set([root]); let queue = [root];
        while(queue.length > 0) {
            let curr = queue.shift();
            for (let neighbor of CONFIG.CONNECTIONS[curr] || []) {
                if (!STATE.bannedNodes.has(neighbor) && !visited.has(neighbor)) { 
                    visited.add(neighbor); 
                    queue.push(neighbor); 
                }
            }
        }

        // ค้นหาโหนดที่โดนลอยแพ (Isolated) ไม่มีเส้นทางไปเครือข่ายหลัก
        let isolatedNodes = healthyNodes.filter(n => !visited.has(n));
        
        if (isolatedNodes.length > 0) {
            isolatedNodes.forEach(iso => {
                let connectedNodes = Array.from(visited);
                if (connectedNodes.length === 0) return;

                // 1. หาโหนดเป้าหมายที่อยู่ใกล้ที่สุดจากแกนพิกัด X,Y
                let closestPeer = null;
                let minDistance = Infinity;
                const isoPos = CONFIG.NODE_POS[iso];

                connectedNodes.forEach(peer => {
                    const peerPos = CONFIG.NODE_POS[peer];
                    if (isoPos && peerPos) {
                        // คำนวณระยะทางแบบเส้นตรง (Euclidean Distance)
                        const dist = Math.hypot(isoPos[0] - peerPos[0], isoPos[1] - peerPos[1]);
                        if (dist < minDistance) {
                            minDistance = dist;
                            closestPeer = peer;
                        }
                    }
                });

                // หากหาพิกัดไม่ได้ ให้สุ่มดึงมาหนึ่งโหนด
                let peer = closestPeer || connectedNodes[Math.floor(Math.random() * connectedNodes.length)];

                // 2. บันทึกเส้นทางใหม่ลงในข้อมูลระบบ (ป้องกันการใส่ข้อมูลซ้ำ)
                if (!CONFIG.CONNECTIONS[iso].includes(peer)) CONFIG.CONNECTIONS[iso].push(peer); 
                if (!CONFIG.CONNECTIONS[peer].includes(iso)) CONFIG.CONNECTIONS[peer].push(iso);

                // 3. วาดเส้นทางลงบนแผนที่
                const svg = document.querySelector('svg');
                if (svg && CONFIG.NODE_POS && CONFIG.NODE_POS[iso] && CONFIG.NODE_POS[peer]) {
                    const lineId1 = `l-${iso}-${peer}`;
                    const lineId2 = `l-${peer}-${iso}`;
                    
                    // สร้างใหม่ต่อเมื่อยังไม่มีเส้นนี้เท่านั้น
                    if (!document.getElementById(lineId1) && !document.getElementById(lineId2)) {
                        const newLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        newLine.setAttribute('id', lineId1); 
                        // ใส่คลาส net-link เพื่อให้มันแสดงผลและรับไฟวิ่งเหมือนเส้นเดิม 100%
                        newLine.setAttribute('class', 'net-link');
                        newLine.setAttribute('x1', CONFIG.NODE_POS[iso][0]); 
                        newLine.setAttribute('y1', CONFIG.NODE_POS[iso][1]);
                        newLine.setAttribute('x2', CONFIG.NODE_POS[peer][0]); 
                        newLine.setAttribute('y2', CONFIG.NODE_POS[peer][1]);
                        
                        // หากเชื่อมกับดาวเทียม ให้เปลี่ยนเป็นเส้นประผ่าน Attribute แทน Inline CSS
                        if (iso.startsWith('sat') || peer.startsWith('sat')) {
                            newLine.setAttribute('stroke-dasharray', '1.5 1.5');
                        }

                        // นำเส้นไปวางในล่างสุดของ SVG จะได้ไม่ทับโหนด (Nodes)
                        svg.insertBefore(newLine, svg.firstChild);
                        
                        // แจ้งเตือน Log
                        if (typeof UI !== 'undefined') {
                            UI.addLiveNodeLog(`🔧 [Self-Healing] ${iso.toUpperCase()} ถูกตัดขาด! สร้างเส้นทาง P2P ใหม่ไปยังโหนด: ${peer.toUpperCase()}`, 'system');
                        }
                    }
                    
                    visited.add(iso); 
                }
            });
        }
    }
};