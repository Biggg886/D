/**
 * 🌌 TITAN V100,000: THE SINGULARITY
 * 👑 The Final God Emperor Edition
 * 🚀 Fix: Jimp Import Error (Hybrid Loader) | Auto-Join | QR | Full Dashboard
 */

import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import https from "https";
import express from "express";
import { performance } from "perf_hooks";
import fs from "fs";
import { createRequire } from "module";
import { execSync } from "child_process";
import os from "os";

// [ 1. HYBRID LOADER - แก้ปัญหา Library Error ถาวร ]
const require = createRequire(import.meta.url);

// Auto-Install Dependencies
const deps = ['jimp', 'jsqr', 'express', 'telegram', 'input'];
try {
    const missing = deps.filter(d => !fs.existsSync(`./node_modules/${d}`));
    if (missing.length > 0) {
        console.log(`📦 Installing Singularity Core: ${missing.join(', ')}...`);
        execSync(`npm install ${missing.join(' ')}`, { stdio: 'inherit' });
    }
} catch (e) {}

// Load Libraries safely using Require (No more SyntaxError)
const Jimp = require("jimp");
const jsQR = require("jsqr");

const app = express();
const DB_PATH = './titan_v100000_singularity.json';

// ============================================================
// [ 2. CONFIGURATION CORE ]
// ============================================================
let DB = {
    config: {
        API_ID: 16274927,
        API_HASH: "e1b49b1565a299c2e442626d598718e8",
        SESSION: "1BQANOTEuMTA4LjU2LjE2NgG7syfVfIDQQZn5AYSCH7TCyTcS+3IlGqeYh87iks3MfrERGB/6QtknmID9hp67Hzu+JXLJoF3RgLYP7oWjqEdPxXucRkxnCiD5sWMmc1jhfoZ8aTe+Iitub57/+zfE4q+SVuZ4IpMNOcCcmZZE5B1fTpTo+0s/JrgqpUv4l54CkSv2f+Rucwq69Ib1P/IOhqRtR2lkbm/w6dv8twfIb9M1G+BdtzUYT1RV+kgS6NMfhb75HsrWv5+sPqJUI2AndD5lK+jWTbU+xs9n8aIB+iTE7BssedfERwsqfzG2AilzdmG0KXCDyFmjqPSzGqy8l7Eyc71XKZb9a+lSaZ772fP0Yw==",
        WALLETS: ["0951417365"], // ⚠️ ใส่เบอร์วอลเลทของคุณที่นี่
        LOG_CHAT: "-1003647725597", // ⚠️ ใส่ ID กลุ่ม Log
        GATEWAY: "https://api.mystrix2.me/truemoney"
    },
    stats: { total: 0, hits: 0, wallet_stats: {} },
    logs: [],
    history: []
};

if (fs.existsSync(DB_PATH)) Object.assign(DB, JSON.parse(fs.readFileSync(DB_PATH)));
const save = () => fs.writeFileSync(DB_PATH, JSON.stringify(DB, null, 2));
const getTime = () => new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok", hour12: false }) + `.${new Date().getMilliseconds().toString().padStart(3, '0')}`;

// ============================================================
// [ 3. SINGULARITY ENGINE ]
// ============================================================
class SingularityEngine {
    static scrub(text) {
        if (!text || !text.includes("gift.truemoney.com")) return null;
        try {
            const part = text.split(/v=|campaign\//)[1];
            return part ? part.split(/[^a-zA-Z0-9]/)[0] : null;
        } catch(e) { return null; }
    }

    static async scanQR(buffer) {
        try {
            const image = await Jimp.read(buffer);
            const qr = jsQR(image.bitmap.data, image.bitmap.width, image.bitmap.height);
            return qr ? this.scrub(qr.data) : null;
        } catch (e) { return null; }
    }
}

class TitanV100000 {
    constructor() { this.tg = null; this.cache = new Set(); this.port = 3000; }

    async deploy() {
        console.clear();
        console.log(`\n🌌 TITAN V100,000: SINGULARITY ONLINE | ${getTime()}`);
        
        this.tg = new TelegramClient(new StringSession(DB.config.SESSION), DB.config.API_ID, DB.config.API_HASH, { connectionRetries: 100 });
        await this.tg.connect();
        
        console.log(`✅ NEURAL NETWORK CONNECTED`);
        this.startListeners();
        this.initDashboard();
    }

    startListeners() {
        this.tg.addEventHandler(async (ev) => {
            const m = ev.message;
            if (!m) return;
            const text = m.message || "";

            // [AUTO-JOIN MODULE]
            if (text.includes("t.me/") || text.includes("telegram.me/")) {
                this.handleInfiltration(text);
            }

            // [SCANNING MODULE]
            let code = SingularityEngine.scrub(text);
            
            // QR Check
            if (!code && m.media instanceof Api.MessageMediaPhoto) {
                const buffer = await this.tg.downloadMedia(m.media);
                code = await SingularityEngine.scanQR(buffer);
            }

            if (code && !this.cache.has(code)) {
                this.cache.add(code);
                this.execute(code);
            }
        }, new NewMessage({ incoming: true }));
    }

    async handleInfiltration(text) {
        // Regex ครอบคลุมทั้ง Private Join และ Public Channel
        const patterns = [
            /(?:t|telegram)\.me\/\+([a-zA-Z0-9_-]+)/, // Private
            /(?:t|telegram)\.me\/joinchat\/([a-zA-Z0-9_-]+)/, // Old Private
            /(?:t|telegram)\.me\/([a-zA-Z0-9_]{5,})/ // Public
        ];

        for (let p of patterns) {
            const match = text.match(p);
            if (match && match[1]) {
                const target = match[1];
                if (target === 'gift') continue; // ข้ามลิงก์ซอง
                
                try {
                    // Try Join
                    await this.tg.invoke(new Api.messages.ImportChatInvite({ hash: target }));
                    this.log("JOIN", `Infiltrated Private: ${target}`);
                } catch (e) {
                    try {
                        await this.tg.invoke(new Api.channels.JoinChannel({ channel: target }));
                        this.log("JOIN", `Joined Public: ${target}`);
                    } catch (ex) {}
                }
            }
        }
    }

    async execute(hash) {
        const ts = getTime();
        this.log("FIRE", `SINGULARITY STRIKE -> ${hash}`);

        const volley = DB.config.WALLETS.map(phone => {
            return new Promise((res) => {
                const t0 = performance.now();
                https.get(`${DB.config.GATEWAY}?phone=${phone}&gift=${hash}`, (resp) => {
                    let d = ""; resp.on("data", c => d += c);
                    resp.on("end", () => res({ phone, raw: d, ms: (performance.now()-t0).toFixed(0) }));
                }).on("error", () => res(null));
            });
        });

        const results = await Promise.allSettled(volley);
        this.process(results, hash, ts);
    }

    process(results, hash, ts) {
        let win = false;
        let logs = [];

        results.forEach(r => {
            if (r.status === 'fulfilled' && r.value) {
                try {
                    const json = JSON.parse(r.value.raw);
                    const v = json.data?.voucher || json.voucher;
                    if (v) {
                        const amt = parseFloat(v.amount_baht);
                        DB.stats.total += amt;
                        DB.stats.hits++;
                        DB.stats.wallet_stats[r.value.phone] = (DB.stats.wallet_stats[r.value.phone] || 0) + amt;
                        win = true;
                        logs.push(`🏆 ${r.value.phone} [+${amt}฿] (${r.value.ms}ms)`);
                    }
                } catch(e){}
            }
        });

        const status = win ? "SUCCESS" : "MISS";
        DB.history.unshift({ ts, hash, status, detail: logs.join(', ') || 'Full/Expired' });
        if (DB.history.length > 100) DB.history.pop();
        save();

        if (win) {
            const msg = `🌌 **TITAN V100,000 HIT!**\n━━━━━━━━━━━━━━\n⏰ \`${ts}\`\n🎫 \`${hash}\`\n💰 **LOOT:**\n${logs.join('\n')}`;
            this.tg.sendMessage(DB.config.LOG_CHAT, { message: msg, parseMode: "markdown" }).catch(()=>{});
        }
    }

    log(cat, msg) {
        const str = `[${getTime()}] [${cat}] ${msg}`;
        console.log(str);
        DB.logs.unshift(str);
        if (DB.logs.length > 50) DB.logs.pop();
    }

    initDashboard() {
        app.get("/", (req, res) => res.send(this.renderUI()));
        app.get("/api/ctl", (req, res) => {
            const {a,v} = req.query;
            if(a==='add') DB.config.WALLETS.push(v);
            if(a==='del') DB.config.WALLETS = DB.config.WALLETS.filter(x=>x!==v);
            save(); res.send('ok');
        });

        const spin = (p) => {
            app.listen(p, () => {
                this.port = p;
                console.log(`🌐 SINGULARITY DASHBOARD: http://localhost:${p}`);
            }).on('error', (e) => { if(e.code==='EADDRINUSE') spin(p+1); });
        };
        spin(3000);
    }

    renderUI() {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>TITAN V100,000</title>
            <meta charset="UTF-8">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
                body { background: #000; color: #0f0; font-family: 'Share Tech Mono', monospace; margin: 0; padding: 20px; overflow-x: hidden; }
                .container { max-width: 1400px; margin: 0 auto; border: 2px solid #0f0; padding: 20px; box-shadow: 0 0 20px #0f0; background: rgba(0,20,0,0.9); }
                h1 { text-align: center; text-shadow: 0 0 10px #0f0; font-size: 3em; margin-bottom: 5px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px; }
                .panel { border: 1px solid #005500; padding: 15px; background: #001100; position: relative; }
                .panel::before { content: "SYSTEM_MODULE"; position: absolute; top: -10px; left: 10px; background: #000; color: #0f0; padding: 0 5px; font-size: 0.8em; }
                .big-num { font-size: 4em; color: #fff; text-shadow: 0 0 15px #fff; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.9em; }
                td, th { border-bottom: 1px solid #004400; padding: 8px; text-align: left; }
                th { color: #00ff00; }
                .win { color: #fff; background: #004400; }
                .fail { color: #444; }
                input, button { background: #000; border: 1px solid #0f0; color: #0f0; padding: 10px; font-family: inherit; }
                button:hover { background: #0f0; color: #000; cursor: pointer; }
                
                /* Matrix Effect Background */
                .matrix-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; opacity: 0.2; pointer-events: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>TITAN V100,000 <span style="font-size:0.4em">SINGULARITY</span></h1>
                <div style="text-align:center; color:#fff;">SYSTEM TIME: ${getTime()}</div>

                <div class="grid">
                    <div class="panel">
                        <div class="big-num">฿${DB.stats.total.toFixed(2)}</div>
                        <div>TOTAL HITS: ${DB.stats.hits}</div>
                        <div style="margin-top:20px;">
                            <input id="w" placeholder="Wallet ID"> <button onclick="ctl('add')">INJECT</button>
                        </div>
                    </div>
                    <div class="panel">
                         <div style="height:150px; overflow-y:auto; font-size:0.8em;">
                            ${DB.logs.join('<br>')}
                         </div>
                    </div>
                </div>

                <div class="panel" style="margin-top:20px;">
                    <h3>ACTIVE NODES (WALLETS)</h3>
                    ${DB.config.WALLETS.map(w => `<span style="border:1px solid #0f0; padding:5px; margin:5px; display:inline-block;">📱 ${w} : ฿${DB.stats.wallet_stats[w]||0} <b style="cursor:pointer; color:red" onclick="ctl('del','${w}')">[X]</b></span>`).join('')}
                </div>

                <div class="panel" style="margin-top:20px;">
                    <h3>EVENT HORIZON (HISTORY)</h3>
                    <table>
                        <thead><tr><th>TIME</th><th>HASH</th><th>STATUS</th><th>PAYLOAD</th></tr></thead>
                        <tbody>
                            ${DB.history.map(h => `<tr><td>${h.ts}</td><td>${h.hash}</td><td class="${h.status==='SUCCESS'?'win':'fail'}">${h.status}</td><td>${h.detail}</td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            <script>
                function ctl(a,v){ fetch('/api/ctl?a='+a+'&v='+(v||document.getElementById('w').value)).then(()=>location.reload()); }
                setInterval(()=>location.reload(), 3000);
            </script>
        </body>
        </html>`;
    }
}

new TitanV100000().deploy();
