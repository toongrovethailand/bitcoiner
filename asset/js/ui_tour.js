window.GuideTour = {
    currentStep: 0,
    steps: [
        {
            title: "1. ยินดีต้อนรับสู่ Simulator",
            desc: "ระบบนี้จะพาคุณสวมบทบาทเป็น <b>'นักขุด'</b> และ <b>'ผู้ตรวจสอบ'</b> บนเครือข่ายบิตคอยน์ เพื่อเรียนรู้การทำงานของระบบที่แข็งแกร่งที่สุดในโลกการเงิน!<br><br><span class='text-amber-400 font-bold'>💡 คำใบ้สำคัญ:</span> ตลอดการใช้งาน หากคุณเห็นข้อความที่มี <u class='decoration-dashed underline-offset-4 decoration-amber-500/80'>เส้นประใต้คำ</u> (เช่น หัวข้อต่างๆ) มันคือปุ่มลับที่สอดแทรกความรู้เจาะลึกเอาไว้เพียบ... ถ้าตรงไหนกดได้ ลองกดดูเลยครับ!",
            targetId: null
        },
        {
            title: "2. Mempool & Blockchain",
            desc: "พื้นที่ส่วนบนจำลอง <b>Mempool</b> (ฝั่งซ้าย) ลานจอดรถของธุรกรรมที่รอคิว และ <b>Blockchain</b> (ฝั่งขวา) บล็อกที่ถูกขุดสำเร็จแล้ว<br><br>💡 ลองคลิกที่ข้อความ <u class='text-cyan-400 decoration-dashed underline-offset-4'>Mempool & Blockchain State</u> ดูสิ!",
            targetId: "part1-mempool"
        },
        {
            title: "3. จัดเรียงธุรกรรมเข้าบล็อก",
            desc: "หน้าที่แรกของ <b>Node Miner</b> คือคุณต้องเลือกธุรกรรมจาก Mempool มาใส่ในกล่อง <b>Candidate Block</b> โดยไม่ให้ขนาดล้นขีดจำกัด (สามารถคลิกที่กล่อง Top Fee ด้านบนเพื่อดึงอัตโนมัติได้)<br><br>💡 สังเกต <u class='text-cyan-400 decoration-dashed underline-offset-4'>1. จัดเรียงธุรกรรม</u> หรือ <u class='text-amber-400 decoration-dashed underline-offset-4'>จำกัด 4000 vB</u> ก็กดอ่านเกร็ดความรู้ได้นะ",
            targetId: "block-container"
        },
        {
            title: "4. กำหนดพารามิเตอร์การขุด",
            desc: "หัวข้อที่ 2 - 5 คือเงื่อนไขในการขุดบล็อก ไม่ว่าจะเป็น <u class='text-cyan-400 decoration-dashed underline-offset-4'>ความยาก (Target)</u>, <u class='text-emerald-400 decoration-dashed underline-offset-4'>กลยุทธ์ Nonce</u>, <u class='text-emerald-400 decoration-dashed underline-offset-4'>Subsidy</u> หรือ <u class='text-amber-400 decoration-dashed underline-offset-4'>Fee</u> <br><br>ทุกหัวข้อกดอ่านความรู้ฉบับเต็มเปรียบเทียบโลกความจริงได้ทั้งหมดเลย!",
            targetId: "input-difficulty"
        },
        {
            title: "5. จำลองเป็นแฮกเกอร์",
            desc: "กรอบสีแดงนี้คือพื้นที่ให้คุณลองแหกกฎ Consensus เช่น ลองกดติ๊ก <b>'จ่ายซ้ำซ้อน (Double Spend)'</b> แล้วขุดดูสิ... มาดูกันว่าผู้คุมกฎของเครือข่ายบิตคอยน์จะจัดการกับคนโกงยังไง!",
            targetId: "tour-target-hacker"
        },
        {
            title: "6. Block Header Data",
            desc: "ข้อมูลส่วนนี้จะถูกนำไปเข้าสมการ SHA-256d<br>• <b>Merkle Root:</b> คือ Hash ที่ซีลสรุปธุรกรรมทั้งหมดในบล็อก<br>• <b>Prev Hash:</b> คือโซ่ที่คล้องกับบล็อกก่อนหน้า ทำให้แก้ไขอดีตไม่ได้<br><br>💡 ลองคลิกปุ่ม <u class='text-fuchsia-400 decoration-dashed underline-offset-4'>🔍 ดูโครงสร้างรากไม้ (Tree)</u> เพื่อเปิด <b>Merkle Tree Visualizer</b> สิครับ! คุณจะได้เห็นภาพชัดเจนว่าธุรกรรมทั้งหมดถูกย่อยให้เหลือ Hash เพียงบรรทัดเดียวได้อย่างไร และมันช่วยโหนดจับโป๊ะคนแอบแก้ไขข้อมูลได้อย่างไร",
            targetId: "tour-target-header"
        },
        {
            title: "7. เครือข่าย P2P และผู้คุมกฎ",
            desc: "แผนที่นี้แสดง <b>Node Validator</b> ทั่วโลกที่เชื่อมต่อกันแบบใยแมงมุม พวกเขาคือคอมพิวเตอร์ของผู้ใช้ธรรมดาที่คอยตรวจสอบและแบนนักขุดที่พยายามจะโกง<br><br>💡 อย่าลืมคลิกอ่านที่หัวข้อ <u class='text-cyan-400 decoration-dashed underline-offset-4'>Global P2P Network</u> และ <u class='text-cyan-400 decoration-dashed underline-offset-4'>Live Node P2P Gossip</u> ล่ะ!",
            targetId: "network-map-container"
        },
        {
            title: "8. แผงควบคุมหลัก",
            desc: "เมื่อคุณจัดเรียงธุรกรรมเสร็จแล้ว กดปุ่ม <b>⛏️ เริ่มขุด (PoW)</b> ด้านล่างนี้ได้เลย! เครื่องจะสุ่มหา Hash ตามความยากที่กำหนด <br><br>และถ้าอยากดูว่าขุดได้กี่บล็อกแล้ว ให้กดปุ่ม <b>🏆 สถิติ</b>",
            targetId: "btn-mine"
        },
        {
            title: "9. พร้อมลุยแล้ว!",
            desc: "ถ้าอยากท้าทายตัวเอง ลองกด <b>⚔️ โหมดท้าทาย</b> เพื่อเปิดบอทขุดคู่แข่งจากทั่วโลกดูนะครับ คุณจะต้องแข่งความเร็วกับพวกมันเพื่อชิงรางวัล <br><br>ขอให้สนุกกับการขุดบิตคอยน์ครับ!",
            targetId: "btn-bot-mode"
        }
    ],
    
    start() {
        // แทรก CSS สำหรับทำ Hilight โดยเฉพาะ เพื่อไม่ให้ตีกับคลาสของ Tailwind
        if (!document.getElementById('tour-custom-style')) {
            const s = document.createElement('style');
            s.id = 'tour-custom-style';
            s.innerHTML = `
                .tour-active-focus {
                    position: relative !important;
                    z-index: 160 !important;
                    box-shadow: 0 0 0 4px rgba(34,211,238,0.5), 0 0 20px rgba(34,211,238,0.3) !important;
                    border-radius: inherit;
                }
            `;
            document.head.appendChild(s);
        }

        this.currentStep = 0;
        const overlay = document.getElementById('tour-overlay');
        const dialog = document.getElementById('tour-dialog');
        
        if (!overlay || !dialog) return;
        
        overlay.classList.remove('hidden');
        dialog.classList.remove('hidden');
        
        // Trigger reflow
        void overlay.offsetWidth;
        
        overlay.classList.remove('opacity-0');
        dialog.classList.remove('opacity-0', 'translate-y-8');
        
        this.renderStep();
        
        if (window.UI && window.UI.toggleModal) {
            window.UI.toggleModal('welcome-modal', false);
        }
    },
    
    renderStep() {
        const step = this.steps[this.currentStep];
        document.getElementById('tour-step-num').innerText = this.currentStep + 1;
        document.getElementById('tour-title').innerHTML = step.title;
        document.getElementById('tour-desc').innerHTML = step.desc;
        
        const btnPrev = document.getElementById('btn-tour-prev');
        const btnNext = document.getElementById('btn-tour-next');
        
        btnPrev.disabled = this.currentStep === 0;
        
        if (this.currentStep === this.steps.length - 1) {
            btnNext.innerHTML = 'เริ่มเล่นเลย! 🎉';
            btnNext.classList.replace('from-cyan-600', 'from-emerald-600');
            btnNext.classList.replace('to-blue-600', 'to-teal-600');
        } else {
            btnNext.innerHTML = 'ถัดไป ➔';
            btnNext.classList.replace('from-emerald-600', 'from-cyan-600');
            btnNext.classList.replace('to-teal-600', 'to-blue-600');
        }
        
        // ลบไฮไลท์เก่าออกทั้งหมดอย่างปลอดภัย
        document.querySelectorAll('.tour-active-focus').forEach(el => {
            el.classList.remove('tour-active-focus');
        });
        
        // ไฮไลท์สเต็ปใหม่
        if (step.targetId) {
            const target = document.getElementById(step.targetId);
            if (target) {
                target.classList.add('tour-active-focus');
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    },
    
    next() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.renderStep();
        } else {
            this.end();
        }
    },
    
    prev() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.renderStep();
        }
    },
    
    end() {
        const overlay = document.getElementById('tour-overlay');
        const dialog = document.getElementById('tour-dialog');
        
        overlay.classList.add('opacity-0');
        dialog.classList.add('opacity-0', 'translate-y-8');
        
        // ล้างไฮไลท์ตอนกดปิดไกด์
        document.querySelectorAll('.tour-active-focus').forEach(el => {
            el.classList.remove('tour-active-focus');
        });
        
        setTimeout(() => {
            overlay.classList.add('hidden');
            dialog.classList.add('hidden');
        }, 500);
    }
};