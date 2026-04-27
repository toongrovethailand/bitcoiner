var currentTourStep = 0;
var tourSteps = [
    { 
        title: "1. ภาพรวมระบบเครือข่าย (Mempool & Block Space)", 
        desc: "โซนด้านบนสุดนี้แสดงภาพรวมของระบบทั้งหมด โดยแบ่งเป็นสองฝั่งหลักคือ ธุรกรรมที่รอการยืนยัน (ซ้าย) และ บล็อกที่ถูกบันทึกลงเชนไปแล้ว (ขวา)", 
        target: "part1-mempool" 
    },
    { 
        title: "2. บ่อพักธุรกรรม (Mempool)", 
        desc: "ผู้คนจากทั่วโลกสร้างธุรกรรมแล้วส่งมาที่นี่! ธุรกรรมต่างๆ จะมารอคิวเพื่อให้นักขุดหยิบไปประมวลผล (กล่องสีส้มนี้คือตัวแทนการจำลองชุดข้อมูลธุรกรรมที่ให้ค่า Fee สูงสุด!)", 
        target: "tour-mempool-high" 
    },
    { 
        title: "3. พื้นที่จัดเก็บ (Block Space)", 
        desc: "ธุรกรรมเมื่อผ่านการรับรองจะถูกเก็บในฝั่งนี้ เชื่อมด้วย 'โซ่แห่งความจริงทางคณิตศาสตร์' โดยร้อย Hash ของบล็อกปัจจุบันเข้ากับบล็อกก่อนหน้า (นี่คือ Genesis Block หรือบล็อกแรกสุดของโลก!)", 
        target: "tour-genesis-block" 
    },
    { 
        title: "4. การเลือกธุรกรรม (Miner Node)", 
        desc: "มาดูแผงควบคุมฝั่งเครื่องขุดกันบ้าง! ขั้นตอนแรกคือคุณต้องจัดเรียงธุรกรรมเข้าบล็อก คุณสามารถคลิกเลือกธุรกรรม (TxID) จาก Mempool ฝั่งซ้าย เพื่อย้ายมาจัดลงกล่องเตรียมขุดได้ด้วยตัวเอง", 
        target: "mempool-container" 
    },
    { 
        title: "5. ระบบจำลองความยาก (Difficulty)", 
        desc: "ส่วนนี้ใช้จำลองความยากในการขุด (Target) ยิ่งตัวเลขน้อยยิ่งขุดเจอง่าย แต่ในโลกจริง ความยากจะถูกปรับอัตโนมัติเพื่อให้เครือข่ายใช้เวลาค้นหาบล็อกเฉลี่ยที่ 10 นาที", 
        target: "input-difficulty" 
    },
    { 
        title: "6. แรงจูงใจนักขุด (Reward & Fee)", 
        desc: "ส่วนนี้คือรายได้ของคุณ! Reward จะค่อยๆ ลดลงเรื่อยๆ จนไปสิ้นสุดในปี 2140 หลังจากนั้นนักขุดจะมีรายได้จากค่าธรรมเนียม (Fee) ล้วนๆ หากคุณสร้าง PoW และประกาศให้ทุกโหนดยอมรับได้ ก็รับ Reward + Fee ไปเลย!", 
        target: "input-subsidy" 
    },
    { 
        title: "7. ทดสอบแหกกติกา (Consensus Rules)", 
        desc: "กล่องสีแดงนี้มีไว้จำลองการท้าทายกฎ! ลองติ๊ก 'ทดสอบแหกกฎ' เช่น การจ่ายซ้ำซ้อนดูสิ แล้วคอยสังเกตว่าเครือข่ายจะตรวจสอบและลงโทษโหนดที่ทำผิดอย่างไร", 
        target: "cb-doublespend" 
    },
    { 
        title: "8. หัวใจของบล็อก (Block Header Data)", 
        desc: "สิ่งสำคัญที่สุดในการสร้างบล็อกอยู่ที่นี่! ประกอบด้วยค่า Merkle Root และ Prev Hash คุณสามารถทดสอบหยิบธุรกรรมเข้า-ออก แล้วสังเกตดูว่าค่ารากไม้ (Merkle Root) เปลี่ยนแปลงตามข้อมูลทันทีอย่างไร", 
        target: "tour-block-header-target" 
    },
    { 
        title: "9. ผู้ตรวจสอบ (Global P2P Network)", 
        desc: "ย้ายมาฝั่ง Validator กันบ้าง แผนที่นี้จำลองเครือข่ายเพื่อแสดงให้เห็นว่า โหนดจากทั่วโลกทำงานร่วมกันอย่างไรเมื่อมีคนกระจายข้อมูลบล็อกใหม่มาให้ตรวจสอบ", 
        target: "network-map-container" 
    },
    { 
        title: "10. แชทเครือข่าย (Live Gossip)", 
        desc: "ที่เรียกว่า Gossip (ซุบซิบ) เพราะโหนดไม่ได้ส่งข้อมูลหาศูนย์กลาง แต่ใช้วิธีกระจายข่าวบอกต่อๆ กันไปให้เพื่อนบ้านรอบตัวแบบปากต่อปาก หน้าต่างนี้จะจับตาดูการส่งข้อความเหล่านั้นแบบเรียลไทม์", 
        target: "live-node-chat-container" 
    },
    { 
        title: "11. ลองขุดบล็อกแรก! (Start PoW)", 
        desc: "ตอนนี้คุณสามารถทดลองขุดบล็อกแรกโดยไม่ต้องกดดันได้เลยที่ปุ่มนี้! คำแนะนำ: ถ้าอยากได้ค่าธรรมเนียมเยอะๆ ควรเลือกธุรกรรมโดยดูจากน้ำหนักและค่าธรรมเนียม เพื่อให้ได้ประโยชน์สูงสุด", 
        target: "btn-mine" 
    },
    { 
        title: "12. โหมดการแข่งขัน (Bot Mode)", 
        desc: "เมื่อคุณพร้อม... โหมดเสมือนการแข่งขันในโลกความเป็นจริงรออยู่! เพียงแค่ลองเปิดสวิตช์นี้ ความสนุกก็เริ่มต้นขึ้น บอทจากทั่วโลกจะแย่งคุณขุดทันที!", 
        target: "cb-bot-mode" 
    }
];

var GuideTour = { 
    start: () => { 
        // --- ค้นหาเป้าหมายและแปะ ID ให้แบบไดนามิก ป้องกันการหาไม่เจอ ---
        
        // ข้อ 2: หากล่องสีส้ม (Mempool High)
        const memHigh = document.querySelector('.mempool-high');
        if (memHigh) memHigh.id = 'tour-mempool-high';

        // ข้อ 3: หากล่อง Genesis Block
        const genesisBlock = document.querySelector('.chain-genesis');
        if (genesisBlock) genesisBlock.id = 'tour-genesis-block';

        // ข้อ 8: หาข้อความ Block Header Data ให้เจอแบบเป๊ะๆ
        document.querySelectorAll('p, div, span').forEach(el => {
            if(el.textContent && el.textContent.trim().toLowerCase() === 'block header data') {
                el.id = 'tour-block-header-target';
                el.classList.add('transition-all', 'duration-300', 'rounded-md'); // เพิ่มขอบมนให้กรอบไฮไลท์ดูสวยขึ้น
            }
        });

        // -----------------------------------------------------------

        currentTourStep = 0; 
        document.getElementById('tour-overlay').classList.remove('hidden'); 
        setTimeout(() => document.getElementById('tour-overlay').classList.remove('opacity-0'), 10);
        document.getElementById('tour-dialog').classList.remove('hidden'); 
        setTimeout(() => document.getElementById('tour-dialog').classList.remove('opacity-0', 'translate-y-8'), 10);
        GuideTour.render(); 
    },
    next: () => { if (currentTourStep < tourSteps.length - 1) { currentTourStep++; GuideTour.render(); } else { GuideTour.end(); } },
    prev: () => { if (currentTourStep > 0) { currentTourStep--; GuideTour.render(); } },
    end: () => { 
        document.getElementById('tour-overlay').classList.add('opacity-0'); 
        document.getElementById('tour-dialog').classList.add('opacity-0', 'translate-y-8');
        
        let arrowEl = document.getElementById('tour-dynamic-arrow');
        if(arrowEl) arrowEl.classList.add('opacity-0');
        
        document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
        setTimeout(() => {
            document.getElementById('tour-overlay').classList.add('hidden');
            document.getElementById('tour-dialog').classList.add('hidden');
        }, 500);
    },
    render: () => {
        document.getElementById('tour-step-num').innerText = currentTourStep + 1;
        document.getElementById('tour-title').innerText = tourSteps[currentTourStep].title;
        document.getElementById('tour-desc').innerText = tourSteps[currentTourStep].desc;
        document.getElementById('btn-tour-prev').disabled = currentTourStep === 0;
        document.getElementById('btn-tour-next').innerText = currentTourStep === tourSteps.length - 1 ? "เริ่มลุยเลย! ✔️" : "ถัดไป ➔";
        
        // ลบไฮไลท์เดิมออกก่อน
        document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
        
        // สร้างหรือดึงลูกศรชี้ (Dynamic Arrow) แบบลูกศรคู่โฮโลแกรมล้ำๆ
        let arrowEl = document.getElementById('tour-dynamic-arrow');
        if (!arrowEl) {
            arrowEl = document.createElement('div');
            arrowEl.id = 'tour-dynamic-arrow';
            arrowEl.innerHTML = `<svg class="w-8 h-8 text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,1)]" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" /></svg>`;
            arrowEl.className = 'fixed z-[165] animate-bounce pointer-events-none transition-all duration-500 opacity-0 flex flex-col items-center';
            document.body.appendChild(arrowEl);
        }
        
        const targetId = tourSteps[currentTourStep].target;
        
        if (targetId) {
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                // เลื่อนหน้าจอไปหา element แบบ Smooth
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // สำหรับสวิตช์ Bot Mode ให้เลื่อนการจับกรอบไฮไลท์ไปที่ Label (ตัวครอบ) แทน 
                let highlightEl = targetEl;
                if (targetId === 'cb-bot-mode') {
                    highlightEl = targetEl.parentElement; 
                }
                highlightEl.classList.add('tour-highlight');
                
                // ใช้ setTimeout เพื่อรอให้หน้าจอเลื่อนเสร็จระดับนึงก่อน ค่อยคำนวณตำแหน่งและแสดงลูกศร
                setTimeout(() => {
                    let rectTarget = targetEl;
                    
                    // ปรับตำแหน่งลูกศรสำหรับ Bot Mode ให้ชี้ตรงปุ่ม Toggle โดยเฉพาะ (ขยับขวามาที่ตัวสวิตช์ภาพ)
                    if (targetId === 'cb-bot-mode' && targetEl.nextElementSibling) {
                        rectTarget = targetEl.nextElementSibling;
                    }

                    const rect = rectTarget.getBoundingClientRect();
                    // ให้ลูกศรอยู่ตรงกลางด้านบนของเป้าหมายที่คำนวณใหม่
                    arrowEl.style.top = `${rect.top - 45}px`; 
                    arrowEl.style.left = `${rect.left + (rect.width / 2) - 16}px`; // -16px เพื่อให้ตรงกึ่งกลาง SVG ขนาด 32px
                    arrowEl.classList.remove('opacity-0');
                }, 300);
            } else {
                arrowEl.classList.add('opacity-0');
            }
        } else {
            arrowEl.classList.add('opacity-0'); 
        }
    }
};