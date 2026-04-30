window.ModalLogic = {
    updateDiffStats: async () => {
        let localHps = window.STATE && window.STATE.benchmarkTotalHashes ? Math.floor(window.STATE.benchmarkTotalHashes * 60) : 1200;
        const elLocal = document.getElementById('diff-stat-local');
        const elTime = document.getElementById('diff-stat-time');
        const elNetTarget = document.getElementById('diff-stat-net-target');
        const elNetHash = document.getElementById('diff-stat-net-hash');
        const elNetHashRaw = document.getElementById('diff-stat-net-hash-raw');
        
        if (elLocal) elLocal.innerText = localHps.toLocaleString() + " H/s";
        if (elNetTarget) elNetTarget.innerText = "Syncing...";
        if (elNetHash) elNetHash.innerText = "Syncing...";
        if (elNetHashRaw) elNetHashRaw.innerText = "(...)";
        if (elTime) elTime.innerText = "Calculating...";

        try {
            const res = await fetch('https://mempool.space/api/v1/blocks');
            const blocks = await res.json();
            const currentDifficulty = blocks[0].difficulty;

            const currentNetHashrate = (currentDifficulty * Math.pow(2, 32)) / 600;
            const expectedZeros = Math.floor(8 + Math.log2(currentDifficulty) / 4);

            if (elNetTarget) elNetTarget.innerText = `~${expectedZeros} Zeros`;
            
            let ehs = (currentNetHashrate / 1e18).toFixed(2);
            if (elNetHash) elNetHash.innerText = `~${ehs} EH/s`;
            if (elNetHashRaw) elNetHashRaw.innerText = `(${Math.floor(currentNetHashrate).toLocaleString()} H/s)`;

            const hashesNeeded = currentDifficulty * Math.pow(2, 32); 
            const secondsNeeded = hashesNeeded / localHps;
            const yearsNeeded = secondsNeeded / (60 * 60 * 24 * 365);
            
            let yearStr = yearsNeeded.toLocaleString('en-US', { maximumFractionDigits: 0 });
            if (yearsNeeded > 1e12) {
                yearStr = (yearsNeeded / 1e9).toLocaleString('en-US', { maximumFractionDigits: 2 }) + " พันล้าน";
            }
            if (elTime) elTime.innerText = yearStr + " ปี";

        } catch(e) {
            console.error("Failed to sync mempool stats", e);
            if (elNetTarget) elNetTarget.innerText = `~19 Zeros (Offline)`;
            if (elNetHash) elNetHash.innerText = `~600 EH/s (Offline)`;
            if (elNetHashRaw) elNetHashRaw.innerText = `(600,000,000,000,000,000,000 H/s)`;

            const hashesNeeded = 7.55e22; 
            const secondsNeeded = hashesNeeded / localHps;
            const yearsNeeded = secondsNeeded / (60 * 60 * 24 * 365);
            
            let yearStr = yearsNeeded.toLocaleString('en-US', { maximumFractionDigits: 0 });
            if (yearsNeeded > 1e12) {
                yearStr = (yearsNeeded / 1e9).toLocaleString('en-US', { maximumFractionDigits: 2 }) + " พันล้าน";
            }
            if (elTime) elTime.innerText = yearStr + " ปี";
        }
    },

    renderHalvingTable: () => {
        const tbody = document.getElementById('halving-table-body');
        if(!tbody) return;
        if(tbody.innerHTML.trim() !== '') return; // ถ้าเคยวาดแล้ว ไม่ต้องทำซ้ำ
        
        let html = '';
        let currentReward = 5000000000; // เริ่มต้นที่ 50 BTC (ในหน่วย sats)
        const currentYear = new Date().getFullYear(); // ดึงปีปัจจุบันอัตโนมัติ

        for(let i = 0; i <= 33; i++) {
            let startBlock = i * 210000;
            let endBlock = startBlock + 209999;
            
            // คำนวณช่วงปี
            let y1 = i === 0 ? 2009 : 2008 + (i * 4);
            let y2 = y1 + 4;
            if(i === 0) y2 = 2012;
            
            // ตรวจสอบว่ารอบนั้นอยู่ในปีปัจจุบันหรือไม่ เพื่อไฮไลท์แถว
            let isNow = currentYear >= y1 && currentYear < y2;
            if (i === 33) { 
                y1 = 2140; y2 = 2144; 
                isNow = currentYear >= 2140; 
            }

            // คำนวณผลรวมของเหรียญที่เกิดในรอบนั้น
            let epochTotal = currentReward * 210000;
            
            // กำหนด CSS Class
            let rowClass = isNow ? "bg-cyan-950/40 border-b border-cyan-800/50" : "border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors";
            let textClass = isNow ? "text-cyan-300 font-bold" : "text-slate-400";
            let rewardClass = isNow ? "text-cyan-400 font-bold" : "text-emerald-400";
            
            // ป้ายไฮไลท์คำว่า "ปัจจุบัน"
            let curLabel = isNow ? ` <span class="text-[9px] bg-cyan-700/80 text-cyan-100 px-1.5 py-0.5 rounded ml-2 uppercase shadow-[0_0_5px_rgba(34,211,238,0.5)]">ปัจจุบัน</span>` : '';

            html += `<tr class="${rowClass}">
                <td class="p-2 sm:p-3">${i}${curLabel}</td>
                <td class="p-2 sm:p-3 whitespace-nowrap text-center text-slate-300">📦 ${startBlock.toLocaleString()} - ${endBlock.toLocaleString()}</td>
                <td class="p-2 sm:p-3 text-center ${textClass}">${y1} - ${y2}</td>
                <td class="p-2 sm:p-3 text-right ${rewardClass}">${currentReward.toLocaleString()}</td>
                <td class="p-2 sm:p-3 text-right text-amber-400/80">${epochTotal.toLocaleString()}</td>
            </tr>`;
            
            // ใช้หลักการเดียวกับ Bitwise Shift Right คือหารสองแล้วปัดเศษลง
            currentReward = Math.floor(currentReward / 2);
        }
        tbody.innerHTML = html;
    }
};

// สั่งวาดตารางอัตโนมัติ 1 วินาที หลังจากที่โหลดไฟล์เข้ามาในหน้าเว็บสำเร็จ
setTimeout(() => {
    if (window.ModalLogic && window.ModalLogic.renderHalvingTable) {
        window.ModalLogic.renderHalvingTable();
    }
}, 1000);