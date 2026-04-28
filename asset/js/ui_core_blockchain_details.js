window.UI = window.UI || {};
Object.assign(window.UI, {
    toggleHash(element) { 
        if(!element) return;
        const fullHash = element.getAttribute('data-full'); 
        const shortHash = element.getAttribute('data-short'); 
        if (!fullHash || !shortHash) return; 
        
        if (element.classList.contains('break-all')) { 
            element.innerText = shortHash; 
            element.classList.remove('break-all'); 
        } else { 
            element.innerText = fullHash; 
            element.classList.add('break-all'); 
        } 
    },
    setHashElement(elementId, hashString) { const el = document.getElementById(elementId); if(!el) return; const short = Utils.shortenHash(hashString); el.setAttribute('data-full', hashString); el.setAttribute('data-short', short); el.innerText = short; el.classList.remove('break-all'); },
    setHashDisplay(elementId, hashString) { this.setHashElement(elementId, hashString); },
    
    showBlockDetails(index) {
        const block = STATE.blockchain[index]; const prevBlock = index > 0 ? STATE.blockchain[index - 1] : null;
        document.getElementById('latest-modal-title').innerText = `🔗 Block #${block.height.toLocaleString()}`;
        this.setHashElement('latest-modal-hash', block.hash); this.setHashElement('latest-modal-prev-hash', block.prevHash); this.setHashElement('latest-modal-merkle', block.merkleRoot);
        document.getElementById('latest-modal-version').innerText = block.version; document.getElementById('latest-modal-time').innerText = block.time; 
        document.getElementById('latest-modal-bits').innerText = block.bits; 
        document.getElementById('latest-modal-miner').innerText = block.miner; document.getElementById('latest-modal-reward').innerText = block.reward;
        
        const nonceBaseStr = block.nonce ? block.nonce.toLocaleString() : "Unknown";
        const methodStr = block.nonceMethod ? ` <span class="text-[10px] text-emerald-300 font-normal ml-2 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/50 whitespace-nowrap hidden sm:inline-block">⚙️ ${block.nonceMethod} [ ${block.nonceEq} ]</span><div class="block sm:hidden mt-1"><span class="text-[10px] text-emerald-300 font-normal bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/50 whitespace-nowrap">⚙️ ${block.nonceMethod} [ ${block.nonceEq} ]</span></div>` : "";
        document.getElementById('latest-modal-nonce').innerHTML = nonceBaseStr + methodStr;

        let oldBuggyNote = document.getElementById('hash-explanation-note');
        if (oldBuggyNote) oldBuggyNote.remove();

        let hashSpan = document.getElementById('latest-modal-hash');
        if (!document.getElementById('hash-explanation-inner-note')) {
            let hashRow = hashSpan.parentElement; 
            hashRow.className = "bg-cyan-950/10 p-3 rounded-lg border border-cyan-900/30 flex flex-col gap-1 mb-3 relative z-10 hash-boxed";
            let label = hashRow.querySelector('span.text-slate-500');
            if (label) { label.className = "text-slate-500 uppercase text-[10px] font-bold shrink-0 mb-1"; label.innerText = "Hash"; }
            let innerWrapper = document.createElement('div');
            innerWrapper.className = "w-full cursor-pointer hover:bg-cyan-950/30 p-2 -mx-2 rounded-lg transition-colors relative z-40";
            hashRow.insertBefore(innerWrapper, hashSpan); innerWrapper.appendChild(hashSpan);
            innerWrapper.onclick = () => { window.App.toggleHash(hashSpan); }; hashSpan.removeAttribute('onclick');
            
            let hashNote = document.createElement('div');
            hashNote.id = 'hash-explanation-inner-note';
            hashNote.className = 'bg-cyan-950/20 p-2.5 rounded-lg border border-cyan-900/50 mt-1 relative overflow-hidden shadow-inner cursor-pointer hover:bg-cyan-950/30 transition-colors select-none';
            hashNote.onclick = function(e) {
                e.stopPropagation(); let body = this.querySelector('.accordion-body'); let icon = this.querySelector('.accordion-icon');
                if (body && icon) { body.classList.toggle('hidden'); icon.innerText = body.classList.contains('hidden') ? '▼' : '▲'; }
            };
            hashNote.innerHTML = `
                <div class="flex items-center gap-2 relative z-10">
                    <div class="text-sm text-cyan-400">ℹ️</div>
                    <div class="w-full flex justify-between items-center">
                        <span class="text-cyan-400 font-bold text-[10px] sm:text-[11px] tracking-wide block">Hash ถูกสร้างขึ้นมาอย่างไร?</span>
                        <span class="accordion-icon text-cyan-400 text-xs transition-transform">▼</span>
                    </div>
                </div>
                <div class="accordion-body hidden w-full mt-2 pt-2 border-t border-cyan-900/30 relative z-10 cursor-default" onclick="(function(e){ e.stopPropagation(); })(event)">
                    <p class="text-slate-300 text-[10px] sm:text-[11px] leading-relaxed mb-1.5 font-sans">
                        Hash ของบล็อกคือ "ลายนิ้วมือดิจิทัล" ที่เกิดจากการนำข้อมูลทั้งหมดใน <b>Block Header</b> มาเรียงต่อกัน แล้วคำนวณผ่านฟังก์ชันคณิตศาสตร์ทิศทางเดียว (Double SHA-256)
                    </p>
                    <div class="bg-[#050B14] px-2 py-1.5 rounded border border-cyan-900/30 w-full shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                        <span class="text-emerald-300 font-mono text-[9px] sm:text-[10px] block break-words text-center font-bold tracking-tight">
                            Hash = SHA256d( Version + PrevHash + MerkleRoot + Bits + Nonce )
                        </span>
                    </div>
                </div>
            `;
            hashRow.appendChild(hashNote);
        }

        let merkleSpan = document.getElementById('latest-modal-merkle');
        let merkleNoteExists = document.getElementById('merkle-explanation-note');
        if (!merkleNoteExists) {
            let merkleWrapper = merkleSpan.parentElement; 
            let merkleRow = merkleWrapper.parentElement; 

            merkleRow.className = "bg-fuchsia-950/10 p-3 rounded-lg border border-fuchsia-900/30 flex flex-col gap-1 my-2 relative z-10 merkle-boxed";
            
            let oldLabel = merkleRow.querySelector('span.text-slate-500');
            if (oldLabel) {
                let headerDiv = document.createElement('div');
                headerDiv.className = "flex justify-between items-center w-full mb-1";
                headerDiv.innerHTML = `
                    <span class="text-slate-500 uppercase text-[10px] font-bold shrink-0">Merkle Root</span>
                    <button id="btn-corrupt-tx" class="text-[10px] bg-rose-900/40 text-rose-400 border border-rose-500/50 px-2 py-1 rounded hover:bg-rose-800/60 transition-all cursor-pointer relative z-50 shadow-[0_0_10px_rgba(225,29,72,0.2)]">😈 แก้ไขข้อมูลธุรกรรม</button>
                `;
                oldLabel.replaceWith(headerDiv);
            }
            
            merkleWrapper.className = "w-full cursor-pointer hover:bg-fuchsia-950/30 p-2 -mx-2 rounded-lg transition-colors relative z-40";
            
            let merkleNote = document.createElement('div');
            merkleNote.id = 'merkle-explanation-note';
            merkleNote.className = 'bg-fuchsia-950/20 p-2.5 rounded-lg border border-fuchsia-900/50 mt-1 relative overflow-hidden shadow-inner cursor-pointer hover:bg-fuchsia-950/30 transition-colors select-none';
            merkleNote.onclick = function(e) {
                e.stopPropagation(); let body = this.querySelector('.accordion-body'); let icon = this.querySelector('.accordion-icon');
                if (body && icon) { body.classList.toggle('hidden'); icon.innerText = body.classList.contains('hidden') ? '▼' : '▲'; }
            };
            merkleNote.innerHTML = `
                <div class="flex items-center gap-2 relative z-10">
                    <div class="text-sm">🌳</div>
                    <div class="w-full flex justify-between items-center">
                        <span class="text-fuchsia-400 font-bold text-[10px] sm:text-[11px] tracking-wide block">Merkle Root คืออะไร?</span>
                        <span class="accordion-icon text-fuchsia-400 text-xs transition-transform">▼</span>
                    </div>
                </div>
                <div class="accordion-body hidden w-full mt-2 pt-2 border-t border-fuchsia-900/30 relative z-10 cursor-default" onclick="(function(e){ e.stopPropagation(); })(event)">
                    <p class="text-slate-300 text-[10px] sm:text-[11px] leading-relaxed mb-1.5 font-sans">
                        ลายนิ้วมือรวมที่เกิดจากการนำ Hash ของ <b>"ธุรกรรมทั้งหมด"</b> มาจับคู่ผสมกันเป็นทอดๆ (Tree) จนเหลือเพียง Hash เดียว
                    </p>
                    <div class="bg-[#050B14] px-2 py-1.5 rounded border border-fuchsia-900/30 w-full shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                        <span class="text-fuchsia-300 font-mono text-[9px] sm:text-[10px] block break-words text-center font-bold tracking-tight">
                            Root = SHA256d( ... SHA256d(TxA + TxB) ... )
                        </span>
                    </div>
                </div>
            `;
            merkleRow.appendChild(merkleNote);
        }
        
        let avalancheNote = document.getElementById('avalanche-explanation-note');
        if (!avalancheNote) {
            let rewardContainer = document.getElementById('latest-modal-reward').parentElement;
            avalancheNote = document.createElement('div');
            avalancheNote.id = 'avalanche-explanation-note';
            avalancheNote.className = 'mt-4 bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 relative overflow-hidden shadow-inner cursor-pointer hover:bg-slate-800/80 transition-colors select-none';
            avalancheNote.onclick = function(e) {
                e.stopPropagation(); let body = this.querySelector('.accordion-body'); let icon = this.querySelector('.accordion-icon');
                if (body && icon) { body.classList.toggle('hidden'); icon.innerText = body.classList.contains('hidden') ? '▼' : '▲'; }
            };
            avalancheNote.innerHTML = `
                <div class="flex items-center gap-3 relative z-10">
                    <div class="text-lg">⚠️</div>
                    <div class="w-full flex justify-between items-center">
                        <span class="text-rose-400 font-bold text-sm tracking-wide block">โดมิโนเอฟเฟกต์ (Avalanche Effect)</span>
                        <span class="accordion-icon text-rose-400 text-xs transition-transform">▼</span>
                    </div>
                </div>
                <div class="accordion-body hidden w-full mt-3 pt-3 border-t border-slate-700/80 relative z-10 cursor-default" onclick="(function(e){ e.stopPropagation(); })(event)">
                    <div class="bg-rose-950/20 border-l-2 border-rose-500 pl-2.5 py-1">
                        <p class="text-rose-300/90 text-[11px] sm:text-xs leading-relaxed font-sans">
                            หากมีการดัดแปลงธุรกรรมแม้แต่ 1 รายการ จะส่งผลให้ <b>Merkle Root เปลี่ยน ➔ ส่งผลให้สมการรวมเปลี่ยน ➔ ค่า Block Hash จึงเปลี่ยนไปเป็นคนละค่าทันที!</b> ทำให้บล็อกถัดไปที่เชื่อมโยงมาหา (PrevHash) ขาดสะบั้น และสายโซ่พังทลายลงทั้งหมด
                        </p>
                    </div>
                </div>
            `;
            rewardContainer.parentNode.appendChild(avalancheNote);
        }

        if (block.isCorrupted) {
            hashSpan.classList.remove('text-cyan-400'); hashSpan.classList.add('text-rose-500');
            merkleSpan.classList.remove('text-fuchsia-400'); merkleSpan.classList.add('text-rose-500');
        } else {
            hashSpan.classList.remove('text-rose-500'); hashSpan.classList.add('text-cyan-400');
            merkleSpan.classList.remove('text-rose-500'); merkleSpan.classList.add('text-fuchsia-400');
        }

        let corruptBtn = document.getElementById('btn-corrupt-tx');
        if (corruptBtn) {
            corruptBtn.setAttribute('onclick', `window.UI.corruptBlock(${index})`);
            if (block.isCorrupted) {
                corruptBtn.disabled = true; corruptBtn.innerText = "🚨 ข้อมูลถูกดัดแปลงแล้ว"; corruptBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-rose-950/80');
            } else {
                corruptBtn.disabled = false; corruptBtn.innerText = "😈 แก้ไขข้อมูลธุรกรรม"; corruptBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-rose-950/80');
            }
        }

        window.currentVerifyData = { currentHeight: block.height, claimedPrev: block.prevHash, actualPrev: prevBlock ? prevBlock.hash : "0000000000000000000000000000000000000000000000000000000000000000", isCorrupted: block.isCorrupted };
        
        document.getElementById('verify-result').classList.add('hidden'); 
        this.toggleModal('latest-modal', true);
    },
    
    verifyLink() {
        const data = window.currentVerifyData; const resDiv = document.getElementById('verify-result'); const resText = document.getElementById('verify-text');
        if (!resDiv || !resText) return; 

        resDiv.classList.remove('animate-pulse');
        void resDiv.offsetWidth; 
        resDiv.classList.add('animate-pulse');
        resDiv.classList.remove('hidden');

        if (data.isCorrupted || (data.claimedPrev !== data.actualPrev && data.actualPrev !== "0000000000000000000000000000000000000000000000000000000000000000")) {
            resText.innerHTML = `<span class="text-rose-400">❌ <b>สายโซ่พังทลาย:</b> บล็อกนี้หรือบล็อกก่อนหน้าในสายโซ่ถูกดัดแปลงข้อมูล (Avalanche Effect) ทำให้สายโซ่ตั้งแต่จุดนี้เป็นต้นไปกลายเป็น <b>Invalid</b> ทั้งหมด!</span>`;
            return;
        }

        if (data.currentHeight === 0 || data.claimedPrev.includes("00000000000000000000000000000000")) { 
            resText.innerHTML = `<span class="text-amber-400">ℹ️ นี่คือ <b>Genesis Block</b> จึงไม่มีบล็อกก่อนหน้า ค่า Prev Hash จึงเป็นศูนย์เพื่อเริ่มสายโซ่</span>`; 
        } 
        else if (data.claimedPrev === data.actualPrev) { 
            resText.innerHTML = `<span class="text-emerald-400">✅ <b>ตรวจสอบสำเร็จ:</b> Prev Hash ตรงกับ Hash จริงของบล็อก #${data.currentHeight - 1} เป๊ะ! ข้อมูลเชื่อมโยงกันอย่างสมบูรณ์<br><span class="text-[10px] text-emerald-200/80 mt-1 block break-all">Hash ของบล็อก #${data.currentHeight - 1} คือ: ${data.actualPrev}</span></span>`; 
        } 
        else { 
            resText.innerHTML = `<span class="text-rose-400">❌ <b>ล้มเหลว:</b> ข้อมูลไม่ตรงกัน! สายโซ่ขาดออกจากกัน บล็อกนี้อาจถูกปลอมแปลง<br><span class="text-[10px] text-rose-200/80 mt-1 block break-all">Hash จริงคือ: ${data.actualPrev}</span></span>`; 
        }
    },
    writeLog(msg, type = 'info') {
        const logBox = document.getElementById('event-log'); if(!logBox) return; 
        const div = document.createElement('div'); 
        let prefix = `<span class="text-slate-500 mr-2 font-mono">[${Utils.getTimeString()}]</span> `; 
        let col = "text-slate-300"; 
        
        const styles = { 
            success: { p: "<span class='text-emerald-400 font-bold'>[PASS]</span> ", c: "text-emerald-300" }, 
            error: { p: "<span class='text-rose-500 font-bold'>[FAIL]</span> ", c: "text-rose-300 bg-rose-950/20 border-l-2 border-rose-500 pl-3 py-1 my-1" }, 
            process: { p: "<span class='text-cyan-400 font-bold'>[SYSTEM]</span> ", c: "text-cyan-200" }, 
            warning: { p: "<br><span class='text-amber-400 font-bold'>[VALIDATION]</span> ", c: "text-amber-200 mt-2 font-semibold" }, 
            'final-success': { p: "<br><span class='text-emerald-400 font-bold'>[ACCEPTED]</span> ", c: "text-emerald-300 font-bold bg-emerald-950/30 p-2 border border-emerald-900/50 rounded mt-2" } 
        };
        if (styles[type]) { prefix += styles[type].p; col = styles[type].c; } 
        div.className = `${col} text-[11px] sm:text-xs tracking-wide`; 
        div.innerHTML = prefix + msg; 
        logBox.appendChild(div); 
        logBox.scrollTop = logBox.scrollHeight;
    }
});