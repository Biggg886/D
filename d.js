/**
 * 👑 TITAN V1,000,000: THE OMNIPOTENCE
 * 🌌 FINAL VERSION - FULL SYSTEM & AUTO-BROADCAST
 * 🚀 Fix: Scan All Formats | Fast Buffer | Thai Time | Auto-Join
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

const require = createRequire(import.meta.url);

// [ 1. AUTO-SYSTEM INITIALIZER ]
const deps = ['jimp', 'jsqr', 'express', 'telegram', 'input'];
try {
    const missing = deps.filter(d => !fs.existsSync(`./node_modules/${d}`));
    if (missing.length > 0) {
        console.log(`📦 Preparing God Mode Core: ${missing.join(', ')}...`);
        execSync(`npm install ${missing.join(' ')}`, { stdio: 'inherit' });
    }
} catch (e) {}

const Jimp = require("jimp");
const jsQR = require("jsqr");
const app = express();
const DB_PATH = './titan_v1000000_god.json';

// ============================================================
// [ 2. CONFIGURATION ]
// ============================================================
let DB = {
    config: {
        API_ID: 16274927,
        API_HASH: "e1b49b1565a299c2e442626d598718e8",
        SESSION: "1BQANOTEuMTA4LjU2LjE2NgG7syfVfIDQQZn5AYSCH7TCyTcS+3IlGqeYh87iks3MfrERGB/6QtknmID9hp67Hzu+JXLJoF3RgLYP7oWjqEdPxXucRkxnCiD5sWMmc1jhfoZ8aTe+Iitub57/+zfE4q+SVuZ4IpMNOcCcmZZE5B1fTpTo+0s/JrgqpUv4l54CkSv2f+Rucwq69Ib1P/IOhqRtR2lkbm/w6dv8twfIb9M1G+BdtzUYT1RV+kgS6NMfhb75HsrWv5+sPqJUI2AndD5lK+jWTbU+xs9n8aIB+iTE7BssedfERwsqfzG2AilzdmG0KXCDyFmjqPSzGqy8l7Eyc71XKZb9a+lSaZ772fP0Yw==",
        WALLETS: ["0951417365"], 
        LOG_CHAT: "-1003647725597",
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
// [ 3. ADVANCED EXTRACTION ENGINE ]
// ============================================================
class GodScanner {
    static extract(text) {
        if (!text) return null;
        // ปรับ Regex ให้ดึงรหัสซองได้ทุกรูปแบบ ทั้งที่มี / และไม่มี
        const regex = /gift\.truemoney\.com\/(?:v=|campaign\/)?([a-zA-Z0-9]{5,})/i;
        const match = text.match(regex);
        return match ? match[1] : null;
    }

    static async scanQR(buffer) {
        try {
            const image = await Jimp.read(buffer);
            const qr = jsQR(image.bitmap.data, image.bitmap.width, image.bitmap.height);
            return qr ? this.extract(qr.data) : null;
        } catch (e) { return null; }
    }
}

class TitanV1000000 {
    constructor() { 
        this.tg = null; 
        this.cache = new Set(); 
        this.port = 3000;
        this.startTime = getTime();
    }

    async deploy() {
        console.clear();
        console.log(`\n👑 TITAN V1,000,000: OMNIPOTENCE READY | ${this.startTime}`);
        
        this.tg = new TelegramClient(new StringSession(DB.config.SESSION), DB.config.API_ID, DB.config.API_HASH, { connectionRetries: 100 });
        await this.tg.connect();
        
        // ส่งข้อความแจ้งเตือนเมื่อบอทออนไลน์ (Auto-Broadcast)
        await this.broadcastStatus();
        
        this.startListening();
        this.initWebUI();
    }

    async broadcastStatus() {
        const msg = `🚀 **TITAN V1,000,000 [ONLINE]**\n━━━━━━━━━━━━━━━━━━━━\n⏰ **เวลาเริ่มงาน:** \`${this.startTime}\`\n✅ **ระบบสแกน:** พร้อมใช้งาน (Text + QR)\n📱 **จำนวนวอลเลท:** \`${DB.config.WALLETS.length}\` หน่วย\n📡 **สถานะ:** กำลังดักฟังทุกกลุ่ม...`;
        await this.tg.sendMessage(DB.config.LOG_CHAT, { message: msg, parseMode: "markdown" }).catch(e => console.log("Broadcast Error:", e.message));
        this.log("SYSTEM", "Broadcasted Online Status to Group");
    }

    startListening() {
        this.tg.addEventHandler(async (ev) => {
            const m = ev.message;
            if (!m) return;
            const text = m.message || "";

            // 1. AUTO-JOIN (Infiltrator)
            if (text.includes("t.me/")) this.infiltrate(text);

            // 2. TEXT SCAN (Omni-Extractor)
            let code = GodScanner.extract(text);
            
            // 3. QR SCAN (Turbo-Buffer)
            if (!code && m.media instanceof Api.MessageMediaPhoto) {
                const buffer = await this.tg.downloadMedia(m.media);
                code = await GodScanner.scanQR(buffer);
            }

            if (code && !this.cache.has(code)) {
                this.cache.add(code);
                this.strike(code);
            }
        }, new NewMessage({ incoming: true }));
    }

    async infiltrate(text) {
        const links = text.match(/(?:t|telegram)\.me\/(?:\+|joinchat\/)?([a-zA-Z0-9_-]{5,})/g);
        if (links) {
            for (let l of links) {
                const hash = l.split('/').pop().replace('+', '');
                if (hash === 'gift') continue;
                try {
                    await this.tg.invoke(new Api.messages.ImportChatInvite({ hash }));
                    this.log("JOIN", `Infiltrated: ${hash}`);
                } catch (e) {
                    try { await this.tg.invoke(new Api.channels.JoinChannel({ channel: hash })); } catch(ex) {}
                }
            }
        }
    }

    async strike(hash) {
        const ts = getTime();
        this.log("STRIKE", `LOCKED TARGET: ${hash}`);

        const barrage = DB.config.WALLETS.map(phone => {
            return new Promise((res) => {
                const t0 = performance.now();
                https.get(`${DB.config.GATEWAY}?phone=${phone}&gift=${hash}`, (r) => {
                    let b = ""; r.on("data", c => b += c);
                    r.on("end", () => res({ phone, body: b, ms: (performance.now()-t0).toFixed(0) }));
                }).on("error", () => res(null));
            });
        });

        const results = await Promise.allSettled(barrage);
        this.analyze(results, hash, ts);
    }

    analyze(results, hash, ts) {
        let win = false; let report = [];
        results.forEach(r => {
            if (r.status === 'fulfilled' && r.value) {
                try {
                    const data = JSON.parse(r.value.body);
                    const v = data.data?.voucher || data.voucher;
                    if (v) {
                        const amt = parseFloat(v.amount_baht);
                        DB.stats.total += amt;
                        DB.stats.hits++;
                        DB.stats.wallet_stats[r.value.phone] = (DB.stats.wallet_stats[r.value.phone] || 0) + amt;
                        win = true;
                        report.push(`📱 ${r.value.phone} +${amt}฿ (${r.value.ms}ms)`);
                    }
                } catch(e){}
            }
        });

        DB.history.unshift({ ts, hash, status: win ? "SUCCESS" : "MISS", detail: report.join(', ') });
        if (DB.history.length > 100) DB.history.pop();
        save();

        if (win) {
            const msg = `👑 **TITAN OMNIPOTENCE WIN!**\n━━━━━━━━━━━━━━\n⏰ \`${ts}\`\n🎫 \`${hash}\`\n💰 **LOOT:**\n${report.join('\n')}`;
            this.tg.sendMessage(DB.config.LOG_CHAT, { message: msg, parseMode: "markdown" }).catch(()=>{});
        }
    }

    log(cat, msg) {
        const str = `[${getTime()}] [${cat}] ${msg}`;
        console.log(str);
        DB.logs.unshift(str);
        if (DB.logs.length > 50) DB.logs.pop();
    }

    initWebUI() {
        app.get("/", (req, res) => res.send(this.ui()));
        app.get("/api/ctl", (req, res) => {
            const {a,v} = req.query;
            if(a==='add') DB.config.WALLETS.push(v);
            if(a==='del') DB.config.WALLETS = DB.config.WALLETS.filter(x=>x!==v);
            save(); res.send('ok');
        });
        const server = app.listen(this.port, () => console.log(`🌐 OMNI-DASHBOARD: http://localhost:${this.port}`))
            .on('error', (e) => { if(e.code==='EADDRINUSE') { this.port++; server.listen(this.port); } });
    }

    ui() {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>TITAN V1M OMNI</title>
            <meta charset="UTF-8">
            <style>
                body { background: #000; color: #00f3ff; font-family: 'Courier New', monospace; padding: 30px; }
                .box { border: 2px solid #00f3ff; padding: 20px; box-shadow: 0 0 20px #00f3ff; background: rgba(0,0,30,0.8); }
                h1 { text-align: center; color: #fff; text-shadow: 0 0 15px #00f3ff; }
                .stat { font-size: 5em; font-weight: bold; text-align: center; color: #fff; margin: 20px 0; }
                table { width: 100%; margin-top: 20px; border-collapse: collapse; }
                td, th { border: 1px solid #005577; padding: 10px; text-align: left; }
                .win { color: #00ff00; } .miss { color: #555; }
                input, button { background: #000; border: 1px solid #00f3ff; color: #00f3ff; padding: 10px; margin: 5px; }
                button:hover { background: #00f3ff; color: #000; cursor: pointer; }
            </style>
        </head>
        <body>
            <div class="box">
                <h1>💎 TITAN V1,000,000 : OMNIPOTENCE</h1>
                <div style="text-align:center">SERVER TIME: ${getTime()} | UPTIME: ${(process.uptime()/60).toFixed(2)}m</div>
                <div class="stat">฿${DB.stats.total.toFixed(2)}</div>
                
                <div style="display:flex; justify-content:space-around">
                    <div>
                        <h3>[ INJECT WALLET ]</h3>
                        <input id="w" placeholder="09xxxxxxx"> <button onclick="ctl('add')">ADD NODE</button>
                    </div>
                    <div style="max-height: 200px; overflow-y: auto;">
                        <h3>[ ACTIVE NODES ]</h3>
                        ${DB.config.WALLETS.map(w => `<div>📱 ${w} <button onclick="ctl('del','${w}')">REMOVE</button></div>`).join('')}
                    </div>
                </div>

                <h3>[ NEURAL LOGS ]</h3>
                <div style="height: 150px; overflow-y: auto; background: #001122; padding: 10px; border: 1px solid #005577;">
                    ${DB.logs.join('<br>')}
                </div>

                <h3>[ BARRAGE HISTORY ]</h3>
                <table>
                    <thead><tr><th>TIME</th><th>HASH</th><th>STATUS</th><th>PAYLOAD</th></tr></thead>
                    <tbody>
                        ${DB.history.map(h => `<tr><td>${h.ts}</td><td>${h.hash}</td><td class="${h.status==='SUCCESS'?'win':'miss'}">${h.status}</td><td>${h.detail}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
            <script>
                function ctl(a,v){ fetch('/api/ctl?a='+a+'&v='+(v||document.getElementById('w').value)).then(()=>location.reload()); }
                setInterval(()=>location.reload(), 3000);
            </script>
        </body>
        </html>`;
    }
}

new TitanV1000000().deploy();
