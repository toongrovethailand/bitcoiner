window.Leaderboard = {
    init() {
        if (!document.getElementById('leaderboard-modal')) {
            const modalHTML = `
            <div id="leaderboard-modal" class="fixed inset-0 bg-black/90 backdrop-blur-md z-[350] flex items-center justify-center p-4 opacity-0 pointer-events-none transition-opacity duration-300">
                <div class="bg-[#050B14] border border-amber-500/50 rounded-xl flex flex-col w-full max-w-4xl h-[85vh] shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden transform scale-95 transition-transform duration-300 modal-content">
                    <div class="bg-amber-950/40 px-4 py-3 border-b border-amber-800/50 flex justify-between items-center">
                        <span class="text-amber-400 font-bold flex items-center gap-2">🏆 สถิติการขุดและกระดานผู้นำ (Leaderboard)</span>
                        <button onclick="window.UI.toggleModal('leaderboard-modal', false)" class="text-slate-400 hover:text-white text-sm font-bold bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded transition-colors">ปิด (Close)</button>
                    </div>
                    <div class="p-4 sm:p-6 overflow-y-auto h-full space-y-6 text-slate-300 custom-scrollbar">
                        
                        <div>
                            <h3 class="text-emerald-400 font-bold mb-3 flex items-center gap-2"><span class="text-xl">🌟</span> Top 5 นักขุดที่เจอบล็อกมากที่สุด</h3>
                            <div class="grid grid-cols-2 md:grid-cols-5 gap-3" id="lb-top5-container">
                                </div>
                        </div>

                        <div>
                            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-3 gap-2">
                                <h3 class="text-cyan-400 font-bold flex items-center gap-2"><span class="text-xl">📜</span> ประวัติการเจอบล็อก (Block History)</h3>
                                
                                <div id="lb-time-stats" class="text-[10px] sm:text-xs bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-lg text-slate-300 shadow-inner select-none cursor-pointer hover:bg-slate-700 transition-colors" onclick="document.getElementById('diff-explanation-note').classList.toggle('hidden')">
                                    </div>
                            </div>

                            <div id="diff-explanation-note" class="hidden mb-4 bg-slate-900/80 p-4 rounded-xl border border-cyan-700/50 relative overflow-hidden shadow-inner text-[11px] sm:text-xs text-slate-300 leading-relaxed font-sans">
                                <h4 class="text-cyan-400 font-bold mb-2 flex items-center gap-1"><span class="text-sm">ℹ️</span> ความยาก (Difficulty) และ Block Time ในโลกจริงทำงานอย่างไร?</h4>
                                <ul class="space-y-2 list-disc pl-4">
                                    <li><b class="text-amber-400">Target & Difficulty:</b> Target คือตัวเลขเป้าหมายที่กำหนดว่า Hash ต้องมีค่าน้อยกว่าเท่าไหร่ (ยิ่งเลขศูนย์นำหน้าเยอะยิ่งยาก) ส่วน Difficulty คือตัวเลขที่ใช้วัดความยากสัมพัทธ์เทียบกับบล็อกแรกสุด (Genesis Block)</li>
                                    <li><b class="text-emerald-400">Difficulty Adjustment (การปรับความยาก):</b> ในเครือข่าย Bitcoin จริง ระบบจะประเมินและปรับความยากอัตโนมัติในทุกๆ 2,016 บล็อก (ประมาณ 14 วัน) ถ้านักขุดแห่กันเข้ามาขุดจนเจอบล็อกเร็วเกินไป ความยากจะปรับ <b>"เพิ่มขึ้น"</b> แต่ถ้าคนเลิกขุดจนเจอบล็อกช้าเกินไป ความยากก็จะปรับ <b>"ลดลง"</b></li>
                                    <li><b class="text-fuchsia-400">ทำไมต้อง 10 นาที?:</b> ซาโตชิ นากาโมโตะ ออกแบบให้ระบบปรับความยากเพื่อพยุงเวลาเฉลี่ย (Expected Block Time) ให้ตกอยู่ที่ <b>10 นาทีเสมอ</b> เพื่อให้เครือข่ายมีเวลามากพอในการกระจายข้อมูล (Gossip) และตรวจสอบความถูกต้องทั่วโลก ช่วยป้องกันการเกิดสายโซ่แยก (Chain Split) บ่อยเกินไปนั่นเอง</li>
                                </ul>
                            </div>

                            <div class="overflow-x-auto rounded-lg border border-slate-700/80 shadow-inner bg-slate-900/50">
                                <table class="w-full text-left border-collapse text-[10px] sm:text-xs">
                                    <thead>
                                        <tr class="bg-slate-950 text-slate-400 border-b border-slate-700/80">
                                            <th class="p-3 font-bold whitespace-nowrap">Block Height</th>
                                            <th class="p-3 font-bold">Miner</th>
                                            <th class="p-3 font-bold text-right whitespace-nowrap">เวลาที่ใช้ขุด</th>
                                            <th class="p-3 font-bold text-right whitespace-nowrap">Base Reward</th>
                                            <th class="p-3 font-bold text-right whitespace-nowrap">Tx Fee</th>
                                            <th class="p-3 font-bold text-right text-amber-400 whitespace-nowrap">Total (sats)</th>
                                        </tr>
                                    </thead>
                                    <tbody id="lb-history-body" class="font-mono text-slate-300">
                                        </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    },

    show() {
        this.calculateAndRender();
        if (window.UI && window.UI.toggleModal) {
            window.UI.toggleModal('leaderboard-modal', true);
        }
    },

    calculateAndRender() {
        const historyBody = document.getElementById('lb-history-body');
        const top5Container = document.getElementById('lb-top5-container');
        const timeStatsEl = document.getElementById('lb-time-stats');
        
        if (!historyBody || !top5Container) return;

        const minerStats = {}; 
        const historyRows = [];
        let sumTimeTaken = 0;
        let validMinedBlocks = 0;

        const extractTs = (timeStr) => {
            if (!timeStr) return null;
            const match = timeStr.match(/\((\d+)\)/);
            return match ? parseInt(match[1]) : null;
        };

        for (let i = STATE.blockchain.length - 1; i >= 0; i--) {
            const block = STATE.blockchain[i];
            
            const isLocalMine = block.miner && (block.miner.includes("คุณ") || block.miner.includes("Bot"));
            if (!isLocalMine) continue; 

            let totalClaimed = 0;
            if (typeof block.reward === 'string') {
                totalClaimed = parseInt(block.reward.replace(/,/g, '').replace(' sats', '')) || 0;
            } else {
                totalClaimed = block.reward || 0;
            }

            const fee = block.transactions ? block.transactions.reduce((sum, tx) => sum + tx.fee, 0) : 0;
            const baseReward = totalClaimed - fee;

            let timeTakenStr = "N/A";
            if (block.timeTaken !== undefined) {
                const diffSec = block.timeTaken;
                if (diffSec < 60) timeTakenStr = `${diffSec} วินาที`;
                else timeTakenStr = `${Math.floor(diffSec/60)} น. ${diffSec%60} วิ.`;
                
                if (!block.isCorrupted) {
                    sumTimeTaken += diffSec;
                    validMinedBlocks++;
                }
            } else if (i > 0) {
                const currentTs = extractTs(block.time);
                const prevTs = extractTs(STATE.blockchain[i-1].time);
                if (currentTs && prevTs) {
                    const diffSec = currentTs - prevTs;
                    if (diffSec >= 0 && diffSec < 86400) {
                        if (diffSec < 60) timeTakenStr = `${diffSec} วินาที`;
                        else timeTakenStr = `${Math.floor(diffSec/60)} น. ${diffSec%60} วิ.`;
                        
                        if (!block.isCorrupted) {
                            sumTimeTaken += diffSec;
                            validMinedBlocks++;
                        }
                    }
                }
            }

            if (!block.isCorrupted) {
                const minerName = block.miner;
                if (!minerStats[minerName]) {
                    minerStats[minerName] = { blocks: 0, totalReward: 0 };
                }
                minerStats[minerName].blocks++;
                minerStats[minerName].totalReward += totalClaimed;
            }

            let rowBg = block.isCorrupted ? 'bg-rose-950/20 text-rose-400' : 'hover:bg-slate-800/50';
            historyRows.push(`
                <tr class="${rowBg} border-b border-slate-800/50 transition-colors">
                    <td class="p-3">#${block.height.toLocaleString()}${block.isCorrupted ? ' <span class="text-[9px] bg-rose-600 text-white px-1.5 py-0.5 rounded ml-1 tracking-wider uppercase">Invalid</span>' : ''}</td>
                    <td class="p-3 font-bold ${block.miner.includes('คุณ') ? 'text-emerald-400' : 'text-cyan-400'}">${block.miner}</td>
                    <td class="p-3 text-right text-slate-400">${timeTakenStr}</td>
                    <td class="p-3 text-right text-slate-400">${baseReward.toLocaleString()}</td>
                    <td class="p-3 text-right text-slate-400">${fee.toLocaleString()}</td>
                    <td class="p-3 text-right font-bold text-amber-400">${totalClaimed.toLocaleString()}</td>
                </tr>
            `);
        }

        if (historyRows.length === 0) {
            historyBody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-500 italic">ยังไม่มีข้อมูลการขุดในรอบนี้ ลองขุดบล็อกแรกดูสิ!</td></tr>`;
        } else {
            historyBody.innerHTML = historyRows.join('');
        }

        // --- แก้บัค เปลี่ยนจาก ExpectedTime คำนวณตาม Diff เป็นโชว์ Target Time เป้าหมายจริงของเครือข่าย ---
        if (timeStatsEl) {
            // ระบบของเราตั้งเป้า (Target) ไว้ที่ 1 นาที เสมอ
            let targetStr = "60 วินาที (1 นาที)";

            let avgStr = "ยังไม่มีข้อมูล";
            if (validMinedBlocks > 0) {
                let avgSec = sumTimeTaken / validMinedBlocks;
                avgStr = avgSec < 60 ? `${avgSec.toFixed(1)} วินาที` : `${Math.floor(avgSec/60)} นาที ${Math.floor(avgSec%60)} วินาที`;
            }

            timeStatsEl.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="text-slate-400">🎯 เป้าหมายเครือข่าย:</span> <span class="text-cyan-300 font-bold">${targetStr}</span> 
                    <span class="mx-1 text-slate-600">|</span> 
                    <span class="text-slate-400">เฉลี่ยจริง:</span> <span class="text-emerald-400 font-bold">${avgStr}</span>
                    <span class="text-cyan-500 text-[10px] ml-1">▼ ข้อมูล</span>
                </div>`;
        }

        const sortedMiners = Object.entries(minerStats)
            .sort((a, b) => b[1].blocks - a[1].blocks || b[1].totalReward - a[1].totalReward)
            .slice(0, 5);

        if (sortedMiners.length === 0) {
            top5Container.innerHTML = `<div class="col-span-2 md:col-span-5 text-center text-slate-500 italic py-4">ยังไม่มีใครขุดเจอบล็อกที่สมบูรณ์</div>`;
        } else {
            const medals = ['🥇', '🥈', '🥉', '🏅', '🏅'];
            const top5Html = sortedMiners.map((miner, index) => `
                <div class="bg-slate-800/60 border ${miner[0].includes('คุณ') ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-slate-700'} rounded-lg p-3 flex flex-col items-center justify-center text-center relative overflow-hidden transition-all hover:scale-105">
                    <div class="text-2xl mb-1">${medals[index]}</div>
                    <div class="font-bold text-[11px] sm:text-xs mb-1.5 ${miner[0].includes('คุณ') ? 'text-emerald-400' : 'text-cyan-400'} truncate w-full">${miner[0]}</div>
                    <div class="text-[10px] text-slate-300 bg-slate-900 px-2 py-1 rounded w-full mb-1 border border-slate-800">
                        พบ <span class="text-white font-bold">${miner[1].blocks}</span> บล็อก
                    </div>
                    <div class="text-[10px] font-bold text-amber-400 truncate w-full tracking-tight">
                        ${(miner[1].totalReward / 100000000).toFixed(4)} BTC
                    </div>
                </div>
            `).join('');
            top5Container.innerHTML = top5Html;
        }
    }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(() => window.Leaderboard.init(), 800));
} else {
    setTimeout(() => window.Leaderboard.init(), 800);
}