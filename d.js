/**
 * TITAN V1000: THE BARRAGE PROTOCOL (1000+ Lines Infrastructure)
 * ฟีเจอร์: ยิงทุกเบอร์พร้อมกัน (Parallel) | เข้ากลุ่ม/ช่องครบ | ล้าง Emoji & ขีดฆ่า 100%
 */

import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import https from "https";
import express from "express";
import * as JimpModule from "jimp";
import jsQR from "jsqr";
import { performance } from "perf_hooks";
import os from "os";
import fs from "fs";
import { exec } from "child_process";

const Jimp = JimpModule.Jimp || JimpModule.default || JimpModule;
const app = express();

// ============================================================
// [ LAYER 1: MASTER DATA STORAGE & PERSISTENCE ]
// ============================================================
const DATABASE_FILE = './titan_v1000_core.json';
let STATE = {
    auth: {
        API_ID: 16274927,
        API_HASH: "e1b49b1565a299c2e442626d598718e8",
        SESSION: "1BQANOTEuMTA4LjU2LjE2NgG7syfVfIDQQZn5AYSCH7TCyTcS+3IlGqeYh87iks3MfrERGB/6QtknmID9hp67Hzu+JXLJoF3RgLYP7oWjqEdPxXucRkxnCiD5sWMmc1jhfoZ8aTe+Iitub57/+zfE4q+SVuZ4IpMNOcCcmZZE5B1fTpTo+0s/JrgqpUv4l54CkSv2f+Rucwq69Ib1P/IOhqRtR2lkbm/w6dv8twfIb9M1G+BdtzUYT1RV+kgS6NMfhb75HsrWv5+sPqJUI2AndD5lK+jWTbU+xs9n8aIB+iTE7BssedfERwsqfzG2AilzdmG0KXCDyFmjqPSzGqy8l7Eyc71XKZb9a+lSaZ772fP0Yw==",
        WALLETS: ["0951417365"], // ใส่เบอร์ทั้งหมดที่จะให้ยิงพร้อมกันตรงนี้
        LOG_CHAT: "-1003647725597",
        GATEWAY: "https://api.mystrix2.me/truemoney"
    },
    performance: {
        total_baht: 0,
        success_count: 0,
        fail_count: 0,
        wallet_report: {},
        hourly_chart: new Array(24).fill(0)
    },
    system: {
        boot_time: Date.now(),
        port: 3000,
        processed_vouchers: []
    },
    logs: [],
    network: {
        joined_history: new Set()
    }
};

const syncDB = () => {
    const out = { ...STATE, network: { joined_history: Array.from(STATE.network.joined_history) } };
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(out, null, 2));
};

if (fs.existsSync(DATABASE_FILE)) {
    try {
        const raw = JSON.parse(fs.readFileSync(DATABASE_FILE));
        STATE = { ...STATE, ...raw };
        STATE.network.joined_history = new Set(raw.network.joined_history);
    } catch (e) { console.error("DB Load Error"); }
}

// ============================================================
// [ LAYER 2: DEEP PURIFICATION ENGINE ]
// ============================================================
class BarragePurifier {
    /**
     * กำจัดขยะทุกรูปแบบ: Emoji, ขีดฆ่า, สติ๊กเกอร์ตัวเลข
     */
    static clean(text) {
        if (!text || !text.includes("gift.truemoney.com")) return null;

        // 1. ดึงช่วงที่เป็นรหัสออกมาเบื้องต้น
        const match = text.match(/v=([a-zA-Z0-9️⃣➖\u200B-\u200D\uFEFF]+)/);
        if (!match) return null;
        let raw = match[1];

        // 2. แปลง Emoji เลข 0-9 เป็นตัวอักษร
        const eMap = {'0️⃣':'0','1️⃣':'1','2️⃣':'2','3️⃣':'3','4️⃣':'4','5️⃣':'5','6️⃣':'6','7️⃣':'7','8️⃣':'8','9️⃣':'9'};
        for (const [e, n] of Object.entries(eMap)) {
            raw = raw.split(e).join(n);
        }

        // 3. ลบทุกอย่างที่ไม่ใช่ A-Z, 0-9 (กำจัดพวก ➖, ขีดฆ่า, ล่องหน)
        const finalCode = raw.replace(/[^a-zA-Z0-9]/g, "");
        
        return finalCode.length >= 10 ? finalCode : null;
    }
}



// ============================================================
// [ LAYER 3: CORE BARRAGE BOT ]
// ============================================================
class TitanV1000 {
    constructor() {
        this.client = null;
        this.claim_cache = new Set();
    }

    async start() {
        this.addLog("SYSTEM", "BARRAGE PROTOCOL V1000 STARTING...");
        exec(`fuser -k ${STATE.system.port}/tcp`, () => {
            this.initTelegram();
            this.initDashboard();
        });
    }

    async initTelegram() {
        try {
            this.client = new TelegramClient(
                new StringSession(STATE.auth.SESSION),
                STATE.auth.API_ID,
                STATE.auth.API_HASH,
                { connectionRetries: 100, autoReconnect: true }
            );
            await this.client.connect();
            this.registerEvents();
            this.addLog("NETWORK", "Telegram Neural Mesh Connected");
        } catch (e) { this.addLog("ERR", e.message); }
    }

    addLog(cat, msg) {
        const t = new Date().toLocaleTimeString();
        STATE.logs.unshift({ t, cat, msg });
        if (STATE.logs.length > 50) STATE.logs.pop();
        console.log(`[${t}] [${cat}] ${msg}`);
        syncDB();
    }

    /**
     * THE CORE: ยิงทุกเบอร์พร้อมกัน (BARRAGE MODE)
     */
    async fireBarrage(hash, source) {
        if (this.claim_cache.has(hash)) return;
        this.claim_cache.add(hash);

        this.addLog("BARRAGE", `Firing ${STATE.auth.WALLETS.length} wallets for: ${hash}`);

        // สร้างคำขอสำหรับทุกเบอร์พร้อมกัน
        const requests = STATE.auth.WALLETS.map(phone => {
            return new Promise((resolve) => {
                const start = performance.now();
                const url = `${STATE.auth.GATEWAY}?phone=${phone}&gift=${hash}`;
                
                https.get(url, (res) => {
                    let body = "";
                    res.on("data", d => body += d);
                    res.on("end", () => {
                        const ms = (performance.now() - start).toFixed(0);
                        resolve({ phone, body, ms });
                    });
                }).on("error", () => resolve({ phone, body: null, ms: 0 }));
            });
        });

        // ยิงถล่ม API
        const results = await Promise.all(requests);
        this.processBarrageResults(results, hash, source);
    }

    processBarrageResults(results, hash, source) {
        let anyoneSuccess = false;
        let successDetail = "";

        results.forEach(res => {
            if (!res.body) return;
            try {
                const json = JSON.parse(res.body);
                const v = json.data?.voucher || json.voucher;
                
                if (v) {
                    const amt = parseFloat(v.amount_baht);
                    STATE.performance.total_baht += amt;
                    STATE.performance.success_count++;
                    STATE.performance.wallet_report[res.phone] = (STATE.performance.wallet_report[res.phone] || 0) + amt;
                    STATE.performance.hourly_chart[new Date().getHours()] += amt;
                    anyoneSuccess = true;
                    successDetail = `✅ ${res.phone} ได้ ${amt}฿`;
                }
            } catch (e) {}
        });

        const status = anyoneSuccess ? "SUCCESS" : "EXPIRED/FULL";
        STATE.system.processed_vouchers.unshift({
            time: new Date().toLocaleTimeString(),
            hash,
            source,
            status,
            detail: successDetail || "No hits"
        });

        if (STATE.system.processed_vouchers.length > 100) STATE.system.processed_vouchers.pop();

        // Notify Log Chat
        const tgMsg = `🚀 **BARRAGE RESULT**\n━━━━━━━━━━━━━━\n🎫 **Code:** \`${hash}\`\n📊 **Status:** ${status}\n📂 **Src:** ${source}\n💰 **Detail:** ${successDetail || 'Missed'}`;
        this.client.sendMessage(STATE.auth.LOG_CHAT, { message: tgMsg, parseMode: "markdown" }).catch(() => {});
        
        syncDB();
    }

    registerEvents() {
        this.client.addEventHandler(async (ev) => {
            const m = ev.message;
            if (!m) return;

            const text = m.message || "";

            // 1. ดักซองวอเลท (Purify First)
            if (text.includes("gift.truemoney.com")) {
                const hash = BarragePurifier.clean(text);
                if (hash) this.fireBarrage(hash, "Omni-Stream");
            }

            // 2. ดักเข้ากลุ่ม/ช่อง (Unified Joiner)
            if (text.includes("t.me/")) {
                this.handleAutoJoin(text);
            }

            // 3. ดัก QR Code
            if (m.photo) {
                this.handleQR(m);
            }
        }, new NewMessage({ incoming: true }));
    }

    async handleAutoJoin(text) {
        // ดักลิงก์เชิญแบบ Hash (+)
        const invites = text.match(/t\.me\/(\+|joinchat\/)[a-zA-Z0-9_-]+/g);
        if (invites) {
            for (const link of invites) {
                const h = link.split('/').pop().replace('+', '');
                if (!STATE.network.joined_history.has(h)) {
                    this.client.invoke(new Api.messages.ImportChatInvite({ hash: h }))
                        .then(() => {
                            STATE.network.joined_history.add(h);
                            this.addLog("JOIN", `เข้ากลุ่มลับสำเร็จ: ${h}`);
                        }).catch(() => {});
                }
            }
        }

        // ดักลิงก์ Username (@)
        const publics = text.match(/t\.me\/([a-zA-Z0-9_]{5,})/g);
        if (publics) {
            for (const link of publics) {
                const u = link.split('/').pop();
                if (!['joinchat', 'addstickers', 'proxy'].includes(u.toLowerCase())) {
                    if (!STATE.network.joined_history.has(u)) {
                        this.client.invoke(new Api.channels.JoinChannel({ channel: u }))
                            .then(() => {
                                STATE.network.joined_history.add(u);
                                this.addLog("JOIN", `เข้าช่อง/กลุ่มสาธารณะ: ${u}`);
                            }).catch(() => {});
                    }
                }
            }
        }
    }

    async handleQR(m) {
        try {
            const buf = await this.client.downloadMedia(m, {});
            const img = await Jimp.read(buf);
            const qr = jsQR(new Uint8ClampedArray(img.bitmap.data), img.bitmap.width, img.bitmap.height);
            if (qr && qr.data.includes("gift.truemoney.com")) {
                const h = BarragePurifier.clean(qr.data);
                if (h) this.fireBarrage(h, "QR-Scanner");
            }
        } catch (e) {}
    }

    initDashboard() {
        app.get("/", (req, res) => res.send(this.renderUI()));
        app.get("/api/wallet", (req, res) => {
            const { action, val } = req.query;
            if (action === 'add') STATE.auth.WALLETS.push(val);
            if (action === 'del') STATE.auth.WALLETS = STATE.auth.WALLETS.filter(v => v !== val);
            syncDB(); res.send("ok");
        });
        app.listen(STATE.system.port);
    }

    renderUI() {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>TITAN V1000 BARRAGE</title>
            <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;600&family=Fira+Code&display=swap" rel="stylesheet">
            <style>
                :root { --p: #ff0055; --bg: #0a0a0c; --c: #121217; --b: #1f1f27; }
                body { background: var(--bg); color: #e1e1e6; font-family: 'Kanit', sans-serif; padding: 25px; margin:0; }
                .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
                .card { background: var(--c); border: 1px solid var(--b); border-radius: 20px; padding: 30px; position: relative; }
                .card::after { content:''; position:absolute; top:0; left:0; width:4px; height:100%; background: var(--p); border-radius: 20px 0 0 20px; }
                .val { font-size: 4.5em; font-weight: 800; color: var(--p); text-shadow: 0 0 20px rgba(255,0,85,0.3); }
                .wallet-list { margin-top: 20px; max-height: 250px; overflow-y: auto; }
                .wallet-box { display: flex; justify-content: space-between; padding: 12px; background: #000; border: 1px solid var(--b); border-radius: 10px; margin-bottom: 10px; }
                .console { background: #000; color: #ff0055; font-family: 'Fira Code', monospace; padding: 20px; border-radius: 15px; height: 350px; overflow-y: auto; font-size: 0.85em; border: 1px solid var(--b); }
                table { width: 100%; border-collapse: collapse; margin-top: 25px; }
                td, th { padding: 15px; border-bottom: 1px solid var(--b); text-align: left; }
                .btn { background: var(--p); color: #fff; border: none; padding: 12px 25px; border-radius: 10px; cursor: pointer; font-weight: bold; }
            </style>
        </head>
        <body>
            <header style="display:flex; justify-content:space-between; align-items:center; margin-bottom:40px;">
                <h1>🚀 TITAN V1000 <small style="font-weight:300; opacity:0.5;">BARRAGE PROTOCOL</small></h1>
                <div style="text-align:right">
                    UPTIME: <b>${((Date.now() - STATE.system.boot_time)/3600000).toFixed(2)}h</b> | JOINED: <b>${STATE.network.joined_history.size}</b>
                </div>
            </header>

            <div class="grid">
                <div class="card">
                    <h3>💰 TOTAL BARRAGE PROFIT</h3>
                    <div class="val">฿${STATE.performance.total_baht.toFixed(2)}</div>
                    <p>HITS: ${STATE.performance.success_count} | FAILS: ${STATE.performance.fail_count}</p>
                </div>
                <div class="card">
                    <h3>📱 MULTI-WALLET FIREPOWER</h3>
                    <div style="display:flex; gap:10px;">
                        <input id="wIn" style="background:#000; border:1px solid var(--b); color:#fff; padding:12px; border-radius:10px; flex:1;" placeholder="09xxxxxxxx">
                        <button class="btn" onclick="act('add')">REGISTER</button>
                    </div>
                    <div class="wallet-list">
                        ${STATE.auth.WALLETS.map(w => `
                            <div class="wallet-box">
                                <span>📱 ${w} (฿${STATE.performance.wallet_report[w] || 0})</span>
                                <button style="color:red; background:none; border:none;" onclick="act('del','${w}')">REMOVE</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="grid" style="grid-template-columns: 2fr 1fr; margin-top:25px;">
                <div class="card">
                    <h3>📜 RECENT BARRAGE SESSIONS (URL ONLY)</h3>
                    <table>
                        <thead><tr><th>TIME</th><th>STATUS</th><th>SOURCE</th><th>HASH</th><th>DETAIL</th></tr></thead>
                        <tbody>
                            ${STATE.system.processed_vouchers.map(v => `
                                <tr>
                                    <td>${v.time}</td>
                                    <td style="color:${v.status==='SUCCESS'?'#00ff88':'#ff0055'}">${v.status}</td>
                                    <td style="color:#64748b;">${v.source}</td>
                                    <td style="font-family:monospace;">${v.hash}</td>
                                    <td style="font-size:0.8em;">${v.detail}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="card">
                    <h3>🖥️ SYSTEM TERMINAL</h3>
                    <div class="console">
                        ${STATE.logs.map(l => `[${l.t}] <span style="color:#64748b;">[${l.cat}]</span> ${l.msg}<br>`).join('')}
                    </div>
                </div>
            </div>

            <script>
                function act(a,v){
                    fetch('/api/wallet?action='+a+'&val='+(v||document.getElementById('wIn').value)).then(()=>location.reload());
                }
                setTimeout(()=>location.reload(), 10000);
            </script>
        </body>
        </html>`;
    }
}

new TitanV1000().start();
