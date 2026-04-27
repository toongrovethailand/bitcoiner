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
    lastBlockTimeMs: Date.now(), bannedNodes: new Set(),
    nodeHashOffsets: {} // ตัวแปรสำหรับเก็บค่าเปอร์เซ็นต์กำลังขุดที่เหลื่อมกัน
};

var AudioEngine = {
    ctx: null,
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); },
    play(freq, type, duration, vol = 0.1, slideFreq = null) { 
        if (!this.ctx) return; 
        const osc = this.ctx.createOscillator(); 
        const gain = this.ctx.createGain(); 
        osc.type = type; 
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime); 
        
        if (slideFreq) {
            osc.frequency.exponentialRampToValueAtTime(slideFreq, this.ctx.currentTime + duration);
        }
        
        gain.gain.setValueAtTime(0.001, this.ctx.currentTime); 
        gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.02); 
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration); 
        
        osc.connect(gain); 
        gain.connect(this.ctx.destination); 
        osc.start(); 
        osc.stop(this.ctx.currentTime + duration); 
    },
    sfxTick() { 
        this.play(1200, 'square', 0.06, 0.02, 800); 
    }, 
    sfxFound() { 
        this.play(523.25, 'sine', 0.15, 0.1); 
        setTimeout(() => this.play(659.25, 'sine', 0.15, 0.1), 100); 
        setTimeout(() => this.play(783.99, 'sine', 0.3, 0.1), 200); 
    }, 
    sfxFail() { 
        this.play(200, 'sawtooth', 0.4, 0.1, 50); 
    }, 
    sfxFinalSuccess() { 
        [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => { 
            setTimeout(() => this.play(f, 'sine', 0.4, 0.15), i * 120); 
        }); 
        setTimeout(() => {
            this.play(523.25, 'triangle', 0.8, 0.1);
            this.play(659.25, 'triangle', 0.8, 0.1);
            this.play(1046.50, 'triangle', 0.8, 0.1);
        }, 480);
    }, 
    sfxFinalReject() { 
        this.play(150, 'sawtooth', 0.4, 0.15, 80); 
        setTimeout(() => this.play(90, 'sawtooth', 0.6, 0.2, 40), 250); 
    },
    sfxBotMine() { 
        this.play(600, 'square', 0.1, 0.08, 1200); 
        setTimeout(() => this.play(1200, 'square', 0.1, 0.08, 600), 100); 
        setTimeout(() => this.play(400, 'sawtooth', 0.25, 0.1, 200), 200); 
    }
};

var Utils = {
    sleep: ms => new Promise(r => setTimeout(r, ms)),
    generateHash: (prefix = "") => { let hash = prefix; while(hash.length < 64) hash += Math.random().toString(16).substring(2); return hash.substring(0, 64); },
    
    sha256: function(ascii) {
        function rightRotate(value, amount) { return (value>>>amount) | (value<<(32 - amount)); };
        var mathPow = Math.pow; var maxWord = mathPow(2, 32); var result = ''; var words = []; var asciiBitLength = ascii.length*8;
        var hash = [1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225];
        var k = [1116352408, 1899447441, 3049323471, 3921009573, 965070248, 237438962, 725511199, 76029189, 275056812, 206723606, 462214370, 462908921, 915227154, 915921829, 966050514, 2780633842, 3224354020, 2811436402, 3356061738, 2869850406, 3816654215, 2901353246, 3848245594, 3968257850, 4118042571, 3986872517, 4136657252, 4286441987, 4016767679, 4291888363, 11828352, 4294406256, 12615467, 34336214, 28243685, 34431872, 35649931, 35745512, 38555890, 45229641, 56346282, 53267571, 74768395, 60846513, 76229193, 85607371, 88523315, 96259463, 109594532, 110595371, 113333306, 119561081, 132640277, 145974051, 146974895, 149712814, 156828551, 169907765, 170908595, 173646524, 180762261, 193841465, 194842316, 197580225];
        ascii += '\x80';
        while (ascii.length%64 - 56) ascii += '\x00';
        for (var i = 0; i < ascii.length; i++) words[i>>2] |= ascii.charCodeAt(i) << ((3 - i)%4)*8;
        words[words.length] = ((asciiBitLength/maxWord)|0); words[words.length] = (asciiBitLength);
        for (var j = 0; j < words.length;) {
            var w = words.slice(j, j += 16); var oldHash = hash.slice(0);
            for (var i = 0; i < 64; i++) {
                var w15 = w[i - 15], w2 = w[i - 2]; var a = hash[0], e = hash[4];
                var temp1 = hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ((e&hash[5])^((~e)&hash[6])) + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15>>>3)) + w[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2>>>10)))|0);
                var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a&hash[1])^(a&hash[2])^(hash[1]&hash[2]));
                hash = [(temp1 + temp2)|0].concat(hash); hash[4] = (hash[4] + temp1)|0; hash.pop();
            }
            for (var i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i])|0;
        }
        for (var i = 0; i < 8; i++) for (var j = 3; j + 1; j--) { var b = (hash[i]>>(j*8))&255; result += ((b < 16) ? 0 : '') + b.toString(16); }
        return result;
    },
    sha256d: function(str) { return this.sha256(this.sha256(str)); },

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
    healNetwork() {
        const allNodes = Object.keys(CONFIG.CONNECTIONS);
        const healthyNodes = allNodes.filter(n => !STATE.bannedNodes.has(n));
        let root = healthyNodes.includes('me') ? 'me' : (healthyNodes.length > 0 ? healthyNodes[0] : null);
        if (!root) return;

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

        let isolatedNodes = healthyNodes.filter(n => !visited.has(n));
        
        if (isolatedNodes.length > 0) {
            isolatedNodes.forEach(iso => {
                let connectedNodes = Array.from(visited);
                if (connectedNodes.length === 0) return;

                let closestPeer = null;
                let minDistance = Infinity;
                const isoPos = CONFIG.NODE_POS[iso];

                connectedNodes.forEach(peer => {
                    const peerPos = CONFIG.NODE_POS[peer];
                    if (isoPos && peerPos) {
                        const dist = Math.hypot(isoPos[0] - peerPos[0], isoPos[1] - peerPos[1]);
                        if (dist < minDistance) {
                            minDistance = dist;
                            closestPeer = peer;
                        }
                    }
                });

                let peer = closestPeer || connectedNodes[Math.floor(Math.random() * connectedNodes.length)];

                if (!CONFIG.CONNECTIONS[iso].includes(peer)) CONFIG.CONNECTIONS[iso].push(peer); 
                if (!CONFIG.CONNECTIONS[peer].includes(iso)) CONFIG.CONNECTIONS[peer].push(iso);

                const svg = document.querySelector('svg');
                if (svg && CONFIG.NODE_POS && CONFIG.NODE_POS[iso] && CONFIG.NODE_POS[peer]) {
                    const lineId1 = `l-${iso}-${peer}`;
                    const lineId2 = `l-${peer}-${iso}`;
                    
                    if (!document.getElementById(lineId1) && !document.getElementById(lineId2)) {
                        const newLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        newLine.setAttribute('id', lineId1); 
                        newLine.setAttribute('class', 'net-link');
                        newLine.setAttribute('x1', CONFIG.NODE_POS[iso][0]); 
                        newLine.setAttribute('y1', CONFIG.NODE_POS[iso][1]);
                        newLine.setAttribute('x2', CONFIG.NODE_POS[peer][0]); 
                        newLine.setAttribute('y2', CONFIG.NODE_POS[peer][1]);
                        
                        if (iso.startsWith('sat') || peer.startsWith('sat')) {
                            newLine.setAttribute('stroke-dasharray', '1.5 1.5');
                        }

                        svg.insertBefore(newLine, svg.firstChild);
                        
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