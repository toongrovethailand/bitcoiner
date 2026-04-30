window.Engine = window.Engine || {};
Object.assign(window.Engine, {
    startBotsMining() {
        if (STATE.bannedNodes.has('me') || STATE.chainCorrupted) return;

        STATE.botStartTimers = STATE.botStartTimers || [];
        STATE.botStartTimers.forEach(t => clearTimeout(t));
        STATE.botStartTimers = [];
        STATE.botNonces = STATE.botNonces || {};
        STATE.botBaseHeader = STATE.botBaseHeader || {};
        STATE.botTimes = STATE.botTimes || {};
        STATE.botBits = STATE.botBits || {};
        
        const activeNodes = CONFIG.NODES.filter(n => !n.startsWith('sat') && n !== 'me' && !STATE.bannedNodes.has(n));
        
        let diff = parseInt(document.getElementById('input-difficulty').value) || 4;
        let exp = 32 - Math.floor(diff / 2);
        let coeff = (diff % 2 !== 0) ? '0fffff' : 'ffffff';
        let currentBotBits = '0x' + exp.toString(16) + coeff;

        activeNodes.forEach(nodeId => {
            STATE.botNonces[nodeId] = 0;
            STATE.botTimes[nodeId] = Math.floor(Date.now() / 1000).toString();
            STATE.botBits[nodeId] = currentBotBits;
            
            STATE.botBaseHeader[nodeId] = "0x20000000" + STATE.prevHash + STATE.merkleRoot + STATE.botTimes[nodeId] + STATE.botBits[nodeId];
            
            const delay = Math.random() * 8000 + 500; 
            const timer = setTimeout(() => {
                if (!STATE.isBroadcasting && STATE.isBotMode) {
                    UI.toggleNodeMining(nodeId, true);
                }
            }, delay);
            STATE.botStartTimers.push(timer);
        });

        if (STATE.botMiningReq) cancelAnimationFrame(STATE.botMiningReq);
        
        const botLoop = () => {
            if (!STATE.isBotMode || STATE.bannedNodes.has('me') || STATE.chainCorrupted) {
                return;
            }

            if (STATE.isBroadcasting) {
                STATE.botMiningReq = requestAnimationFrame(botLoop);
                return;
            }

            let diff = parseInt(document.getElementById('input-difficulty').value) || 4;
            const target = '0'.repeat(Math.min(diff, 64));
            let winnerBot = null;
            let winningHash = "";
            let winningNonce = 0;

            const activeBots = CONFIG.NODES.filter(n => !n.startsWith('sat') && n !== 'me' && !STATE.bannedNodes.has(n));
            
            for (let i = 0; i < activeBots.length; i++) {
                let botId = activeBots[i];
                const nodeEl = document.getElementById(`nd-${botId}`);
                if (!nodeEl || !nodeEl.querySelector('.mining-indicator')) continue;

                let limit = STATE.nodeFrameLimits[botId] || 1;
                let strat = STATE.nodeNonceStrategies[botId] || 'linear';
                
                if (strat === 'asic') limit = Math.floor(limit * 1.2);

                let headerBase = STATE.botBaseHeader[botId];
                let nonce = STATE.botNonces[botId] || 0;

                for (let j = 0; j < limit; j++) {
                    if (strat === 'linear') {
                        nonce++;
                    } else if (strat === 'random') {
                        nonce = Math.floor(Math.random() * 4294967296);
                    } else if (strat === 'asic') {
                        nonce = (nonce + 7) % 4294967296;
                    } else if (strat === 'reverse') {
                        nonce = nonce > 0 ? nonce - 1 : 4294967295;
                    } else if (strat === 'evens') {
                        nonce = (nonce + 2) % 4294967296;
                        if (nonce % 2 !== 0) nonce++; 
                    }

                    let realHash = Utils.sha256d(headerBase + nonce.toString());
                    if (realHash.startsWith(target)) {
                        winnerBot = botId;
                        winningHash = realHash;
                        winningNonce = nonce;
                        STATE.botNonces[botId] = nonce;
                        break;
                    }
                }
                STATE.botNonces[botId] = nonce;
                if (winnerBot) break; 
            }

            if (winnerBot) {
                this.botFindsBlock(diff, winnerBot, winningHash, winningNonce);
                return; 
            }

            STATE.botMiningReq = requestAnimationFrame(botLoop);
        };
        STATE.botMiningReq = requestAnimationFrame(botLoop);
    },

    stopBotsMining() {
        if(STATE.botStartTimers) STATE.botStartTimers.forEach(t => clearTimeout(t));
        STATE.botStartTimers = [];
        if (STATE.botMiningReq) cancelAnimationFrame(STATE.botMiningReq);
        UI.clearAllMining();
    }
});