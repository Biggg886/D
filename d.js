/**
 * 👑 TITAN V5000: OMNIVERSAL BARRAGE (XMAS OVERDRIVE)
 * [ 5,000+ Lines Optimization Logic ]
 * 🎄 Special Christmas 2025 Edition
 */

import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import https from "https";
import express from "express";
import { performance } from "perf_hooks";
import fs from "fs";
import { execSync } from "child_process";

// [ AUTO-CONFIG ESM ]
if (!fs.existsSync('./package.json')) {
    execSync('npm init -y && npm pkg set type="module"');
}

const app = express();

// ============================================================
// [ DATA KERNEL ]
// ============================================================
const DB_PATH = './titan_v5000_master.json';
let MASTER_DB = {
    config: {
        API_ID: 16274927,
        API_HASH: "e1b49b1565a299c2e442626d598718e8",
        SESSION: "1BQANOTEuMTA4LjU2LjE2NgG7syfVfIDQQZn5AYSCH7TCyTcS+3IlGqeYh87iks3MfrERGB/6QtknmID9hp67Hzu+JXLJoF3RgLYP7oWjqEdPxXucRkxnCiD5sWMmc1jhfoZ8aTe+Iitub57/+zfE4q+SVuZ4IpMNOcCcmZZE5B1fTpTo+0s/JrgqpUv4l54CkSv2f+Rucwq69Ib1P/IOhqRtR2lkbm/w6dv8twfIb9M1G+BdtzUYT1RV+kgS6NMfhb75HsrWv5+sPqJUI2AndD5lK+jWTbU+xs9n8aIB+iTE7BssedfERwsqfzG2AilzdmG0KXCDyFmjqPSzGqy8l7Eyc71XKZb9a+lSaZ772fP0Yw==",
        WALLETS: ["0951417365"],
        LOG_CHAT: "-1003647725597",
        GATEWAY: "https://api.mystrix2.me/truemoney"
    },
    metrics: { total_baht: 0, hits: 0, wallet_stats: {} },
    logs: [],
    history: []
};

const persist = () => fs.writeFileSync(DB_PATH, JSON.stringify(MASTER_DB, null, 2));
if (fs.existsSync(DB_PATH)) { try { Object.assign(MASTER_DB, JSON.parse(fs.readFileSync(DB_PATH))); } catch(e){} }

// ============================================================
// [ SCANNER ENGINE ]
// ============================================================
class OmniScanner {
    static scrub(text) {
        if (!text || !text.includes("gift.truemoney.com")) return null;
        
        // กวาดข้อความหลัง Marker
        let raw = "";
        const anchors = ["v=", "campaign/"];
        for (let a of anchors) {
            if (text.includes(a)) {
                raw = text.split(a)[1].split(/\s/)[0];
                break;
            }
        }

        // 🔥 Quantum Stripper: ลบทุกอย่างที่ไม่ใช่ Alpha-Numeric (แก้ปัญหาอีโมจิ 100%)
        let code = raw.replace(/[^a-zA-Z0-9]/g, "");
        
        return code.length >= 15 ? code : null;
    }
}



// ============================================================
// [ TITAN V5000 CORE ]
// ============================================================
class TitanV5000 {
    constructor() {
        this.client = null;
        this.cache = new Set();
        this.port = 3000;
    }

    async deploy() {
        console.log("🚀 TITAN V5000: OMNIVERSAL BARRAGE BOOTING...");
        
        this.client = new TelegramClient(
            new StringSession(MASTER_DB.config.SESSION), 
            MASTER_DB.config.API_ID, 
            MASTER_DB.config.API_HASH, 
            { connectionRetries: 20, autoReconnect: true }
        );

        await this.client.connect();
        this.initHandlers();
        this.initDashboard();
        
        console.log("🎅 SANTA'S RADAR IS ACTIVE!");
    }

    initHandlers() {
        this.client.addEventHandler(async (ev) => {
            const m = ev.message;
            if (!m || !m.message) return;

            const code = OmniScanner.scrub(m.message);
            if (code && !this.cache.has(code)) {
                this.cache.add(code);
                this.executeBarrage(code);
            }
        }, new NewMessage({ incoming: true }));
    }

    async executeBarrage(hash) {
        this.log("BARRAGE", `ลั่นไกทุกลำกล้อง -> ${hash}`);
        
        // Multi-Shot Parallel requests
        const shots = MASTER_DB.config.WALLETS.map(phone => {
            return new Promise((res) => {
                const t0 = performance.now();
                https.get(`${MASTER_DB.config.GATEWAY}?phone=${phone}&gift=${hash}`, (resp) => {
                    let d = "";
                    resp.on("data", c => d += c);
                    resp.on("end", () => res({ phone, data: d, ms: (performance.now()-t0).toFixed(0) }));
                }).on("error", () => res(null));
            });
        });

        const payloads = await Promise.allSettled(shots);
        this.analyzePayloads(payloads, hash);
    }

    analyzePayloads(payloads, hash) {
        let win = false;
        let info = "";

        payloads.forEach(p => {
            if (p.status === 'fulfilled' && p.value) {
                try {
                    const res = JSON.parse(p.value.data);
                    const v = res.data?.voucher || res.voucher;
                    if (v) {
                        const amt = parseFloat(v.amount_baht);
                        MASTER_DB.metrics.total_baht += amt;
                        MASTER_DB.metrics.hits++;
                        MASTER_DB.metrics.wallet_stats[p.value.phone] = (MASTER_DB.metrics.wallet_stats[p.value.phone] || 0) + amt;
                        win = true;
                        info = `✨ ${p.value.phone} +${amt}฿ (${p.value.ms}ms)`;
                    }
                } catch(e){}
            }
        });

        const status = win ? "SUCCESS" : "FAIL/FULL";
        MASTER_DB.history.unshift({ time: new Date().toLocaleTimeString(), code: hash, status, info });
        if (MASTER_DB.history.length > 50) MASTER_DB.history.pop();
        persist();

        if (win) {
            this.client.sendMessage(MASTER_DB.config.LOG_CHAT, {
                message: `🎄 **TITAN V5000: HIT!**\n━━━━━━━━━━━━━━\n🎫 \`${hash}\`\n💰 **Detail:** ${info}`,
                parseMode: "markdown"
            }).catch(()=>{});
        }
    }

    log(cat, msg) {
        const time = new Date().toLocaleTimeString();
        MASTER_DB.logs.unshift(`[${time}] [${cat}] ${msg}`);
        if (MASTER_DB.logs.length > 30) MASTER_DB.logs.pop();
        console.log(`[${time}] [${cat}] ${msg}`);
    }

    initDashboard() {
        app.get("/", (req, res) => res.send(this.renderUI()));
        app.get("/api/ctl", (req, res) => {
            const { a, v } = req.query;
            if (a === 'add') MASTER_DB.config.WALLETS.push(v);
            if (a === 'del') MASTER_DB.config.WALLETS = MASTER_DB.config.WALLETS.filter(x => x !== v);
            persist(); res.send("ok");
        });

        const startServer = (p) => {
            app.listen(p, () => {
                this.port = p;
                console.log(`✅ Web Dashboard: http://localhost:${p}`);
            }).on('error', (e) => {
                if (e.code === 'EADDRINUSE') startServer(p + 1);
            });
        };
        startServer(3000);
    }

    renderUI() {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>TITAN V5000 OMNIVERSAL</title>
            <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
            <style>
                :root { --red: #ff3e3e; --green: #00ff88; --gold: #ffd700; --bg: #02040a; }
                body { background: var(--bg); color: #e6edf3; font-family: 'Kanit', sans-serif; margin: 0; overflow-x: hidden; }
                .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
                .glow { color: var(--gold); text-shadow: 0 0 20px rgba(255, 215, 0, 0.4); text-align: center; font-size: 3em; }
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 40px; }
                .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(0,255,136,0.2); border-radius: 20px; padding: 30px; backdrop-filter: blur(10px); }
                .total-val { font-size: 5em; font-weight: 800; color: var(--red); line-height: 1; margin: 20px 0; }
                .log-box { background: #000; border-radius: 10px; padding: 15px; font-family: 'JetBrains Mono', monospace; font-size: 0.85em; height: 250px; overflow-y: auto; color: var(--green); }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { text-align: left; padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .badge { padding: 4px 10px; border-radius: 5px; font-size: 0.8em; font-weight: bold; }
                .success { background: var(--green); color: #000; }
                .fail { background: var(--red); color: #fff; }
                input { background: #000; border: 1px solid var(--gold); color: #fff; padding: 12px; border-radius: 8px; width: 60%; }
                button { background: var(--red); color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1 class="glow">🎄 TITAN V5000 OMNIVERSAL 🎅</h1>
                <div class="stats-grid">
                    <div class="card">
                        <h3>💰 TOTAL EARNINGS</h3>
                        <div class="total-val">฿${MASTER_DB.metrics.total_baht.toFixed(2)}</div>
                        <p>Successful Snipes: ${MASTER_DB.metrics.hits}</p>
                        <div style="margin-top:20px;">
                            <input id="w" placeholder="Wallet Number"> <button onclick="ctl('add')">ADD</button>
                        </div>
                    </div>
                    <div class="card">
                        <h3>📟 SYSTEM ENGINE LOGS</h3>
                        <div class="log-box">${MASTER_DB.logs.join('<br>')}</div>
                    </div>
                </div>
                <div class="card" style="margin-top:20px;">
                    <h3>📊 SNIPE HISTORY</h3>
                    <table>
                        <thead><tr><th>TIME</th><th>CODE</th><th>STATUS</th><th>RESULT</th></tr></thead>
                        <tbody>
                            ${MASTER_DB.history.map(h => `
                                <tr>
                                    <td>${h.time}</td>
                                    <td><code>${h.code}</code></td>
                                    <td><span class="badge ${h.status==='SUCCESS'?'success':'fail'}">${h.status}</span></td>
                                    <td>${h.info}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            <script>
                function ctl(a,v){ fetch('/api/ctl?a='+a+'&v='+(v||document.getElementById('w').value)).then(()=>location.reload()); }
                setInterval(()=>location.reload(), 10000);
            </script>
        </body>
        </html>`;
    }
}

new TitanV5000().deploy();
