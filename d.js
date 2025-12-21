/**
 * TITAN V700: HYPER-SONIC VELOCITY (850+ Lines)
 * Focus: High Speed Execution | Auto-Join Fixed | Emoji Stripper
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
// [ LAYER 1: ULTRA-SPEED DATA STORAGE ]
// ============================================================
const STORE_PATH = './titan_v700_core.json';
let CORE = {
    auth: {
        API_ID: 16274927,
        API_HASH: "e1b49b1565a299c2e442626d598718e8",
        SESSION: "1BQANOTEuMTA4LjU2LjE2NgG7syfVfIDQQZn5AYSCH7TCyTcS+3IlGqeYh87iks3MfrERGB/6QtknmID9hp67Hzu+JXLJoF3RgLYP7oWjqEdPxXucRkxnCiD5sWMmc1jhfoZ8aTe+Iitub57/+zfE4q+SVuZ4IpMNOcCcmZZE5B1fTpTo+0s/JrgqpUv4l54CkSv2f+Rucwq69Ib1P/IOhqRtR2lkbm/w6dv8twfIb9M1G+BdtzUYT1RV+kgS6NMfhb75HsrWv5+sPqJUI2AndD5lK+jWTbU+xs9n8aIB+iTE7BssedfERwsqfzG2AilzdmG0KXCDyFmjqPSzGqy8l7Eyc71XKZb9a+lSaZ772fP0Yw==",
        WALLETS: ["0951417365"],
        LOG_CHAT: "-1003647725597",
        API_URL: "https://api.mystrix2.me/truemoney",
        WEB_PORT: 3000
    },
    performance: {
        total_income: 0,
        success: 0,
        fail: 0,
        avg_speed: 0,
        hourly: new Array(24).fill(0)
    },
    history: [],
    logs: [],
    network_nodes: new Set()
};

const saveSystem = () => {
    try {
        const data = { ...CORE, network_nodes: Array.from(CORE.network_nodes) };
        fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
    } catch (e) {}
};

if (fs.existsSync(STORE_PATH)) {
    try {
        const raw = JSON.parse(fs.readFileSync(STORE_PATH));
        CORE = { ...CORE, ...raw, network_nodes: new Set(raw.network_nodes) };
    } catch (e) {}
}

// ============================================================
// [ LAYER 2: HYPER-SPEED RECOGNITION ENGINE ]
// ============================================================
class SpeedEngine {
    /**
     * ดึงรหัสจากลิงก์ซองด้วยความเร็วสูง (String Manipulation)
     * รองรับการกำจัด Emoji และสัญลักษณ์แปลกปลอม
     */
    static fastExtract(text) {
        if (!text || !text.includes("gift.truemoney.com")) return null;

        // 1. ค้นหาตำแหน่งพารามิเตอร์ v=
        const vIndex = text.indexOf("v=");
        if (vIndex === -1) return null;

        // 2. ตัดข้อความตั้งแต่หลัง v= จนถึงช่องว่างถัดไป หรือจบข้อความ
        let rawCode = text.substring(vIndex + 2).split(/\s/)[0];

        // 3. Ultra Cleansing: ลบ Emoji, สติ๊กเกอร์ตัวเลข และขีดฆ่าในระดับบิต
        // 2️⃣ -> 2, ➖ -> ลบออก
        const emojiMap = {'0️⃣':'0','1️⃣':'1','2️⃣':'2','3️⃣':'3','4️⃣':'4','5️⃣':'5','6️⃣':'6','7️⃣':'7','8️⃣':'8','9️⃣':'9'};
        for (const [e, n] of Object.entries(emojiMap)) {
            rawCode = rawCode.split(e).join(n);
        }

        // คงเหลือเฉพาะตัวอักษรและตัวเลขบริสุทธิ์
        return rawCode.replace(/[^a-zA-Z0-9]/g, "");
    }
}

// ============================================================
// [ LAYER 3: CORE APPLICATION ]
// ============================================================
class TitanV700 {
    constructor() {
        this.client = null;
        this.duplicates = new Set();
        this.is_init = false;
    }

    async boot() {
        this.addLog("SYSTEM", "V700 HYPER-SONIC ENGINE DEPLOYING...");
        exec(`fuser -k ${CORE.auth.WEB_PORT}/tcp`, () => {
            this.initTelegram();
            this.initWeb();
        });
    }

    async initTelegram() {
        try {
            this.client = new TelegramClient(
                new StringSession(CORE.auth.SESSION),
                CORE.auth.API_ID,
                CORE.auth.API_HASH,
                { connectionRetries: 50, autoReconnect: true, floodSleepThreshold: 60 }
            );

            await this.client.connect();
            this.setupListeners();
            this.is_init = true;
            this.addLog("NETWORK", "Telegram Mesh Ready (Hyper-Sonic Mode)");
        } catch (e) {
            this.addLog("CRITICAL", e.message);
        }
    }

    addLog(cat, msg) {
        const time = new Date().toLocaleTimeString();
        CORE.logs.unshift({ time, cat, msg });
        if (CORE.logs.length > 80) CORE.logs.pop();
        console.log(`[${time}] [${cat}] ${msg}`);
        saveSystem();
    }

    async fastClaim(hash, source) {
        if (this.duplicates.has(hash)) return;
        this.duplicates.add(hash);

        const start = performance.now();
        const phone = CORE.auth.WALLETS[0];
        const api = `${CORE.auth.API_URL}?phone=${phone}&gift=${hash}`;

        https.get(api, (res) => {
            let buffer = "";
            res.on("data", d => buffer += d);
            res.on("end", () => {
                const ms = (performance.now() - start).toFixed(0);
                this.recordClaim(buffer, hash, source, ms);
            });
        }).on("error", () => this.duplicates.delete(hash));
    }

    recordClaim(raw, hash, source, ms) {
        try {
            const res = JSON.parse(raw);
            const data = res.data?.voucher || res.voucher;
            const amount = data ? parseFloat(data.amount_baht) : 0;
            const status = data ? "SUCCESS" : (res.message || "EXPIRED/FULL");

            if (data) {
                CORE.performance.total_income += amount;
                CORE.performance.success++;
                CORE.performance.hourly[new Date().getHours()] += amount;
            } else {
                CORE.performance.fail++;
            }

            CORE.history.unshift({ time: new Date().toLocaleTimeString(), hash, amount, status, source, ms });
            if (CORE.history.length > 150) CORE.history.pop();

            // Notify Log
            const msg = `⚡ **V700 HYPER-CLAIM**\n━━━━━━━━━━━━━━\n💰 **Amt:** ${amount} THB\n📊 **Stat:** ${status}\n📂 **Src:** ${source}\n🎫 **ID:** \`${hash}\`\n⏱ **Spd:** ${ms}ms`;
            this.client.sendMessage(CORE.auth.LOG_CHAT, { message: msg, parseMode: "markdown" }).catch(() => {});
            
            this.addLog("CLAIM", `${status} | ${amount}฿ | ${ms}ms`);
            saveSystem();
        } catch (e) { this.addLog("API", "JSON ERROR"); }
    }

    setupListeners() {
        this.client.addEventHandler(async (event) => {
            const m = event.message;
            if (!m) return;

            const text = m.message || "";

            // 1. FAST PATH: ตรวจสอบลิงก์ซอง (รับเฉพาะลิงก์ซองเท่านั้น)
            if (text.includes("gift.truemoney.com")) {
                const hash = SpeedEngine.fastExtract(text);
                if (hash) {
                    this.fastClaim(hash, "CHANNEL_TEXT");
                }
            }

            // 2. AUTO-JOIN PATH (ระบบเข้ากลุ่มอัตโนมัติ)
            if (text.includes("t.me/") && (text.includes("/+") || text.includes("/joinchat/"))) {
                this.handleAutoJoin(text);
            }

            // 3. QR PATH
            if (m.photo) {
                this.handleQR(m);
            }

        }, new NewMessage({ incoming: true }));
    }

    async handleAutoJoin(text) {
        const matches = text.match(/t\.me\/(\+|joinchat\/)[a-zA-Z0-9_-]+/g);
        if (matches) {
            for (const link of matches) {
                const hash = link.split('/').pop().replace('+', '');
                if (!CORE.network_nodes.has(hash)) {
                    CORE.network_nodes.add(hash);
                    this.client.invoke(new Api.messages.ImportChatInvite({ hash }))
                        .then(() => this.addLog("JOIN", `Joined: ${hash}`))
                        .catch(() => {});
                }
            }
        }
    }

    async handleQR(msg) {
        try {
            const buffer = await this.client.downloadMedia(msg, {});
            const img = await Jimp.read(buffer);
            const qr = jsQR(new Uint8ClampedArray(img.bitmap.data), img.bitmap.width, img.bitmap.height);
            if (qr && qr.data.includes("gift.truemoney.com")) {
                const hash = SpeedEngine.fastExtract(qr.data);
                if (hash) this.fastClaim(hash, "QR_ENGINE");
            }
        } catch (e) {}
    }

    initWeb() {
        app.get("/", (req, res) => res.send(this.renderUI()));
        app.get("/api/ctl", (req, res) => {
            const { a, v } = req.query;
            if (a === 'add') CORE.auth.WALLETS.unshift(v);
            if (a === 'del') CORE.auth.WALLETS = CORE.auth.WALLETS.filter(x => x !== v);
            saveSystem();
            res.send("ok");
        });
        app.listen(CORE.auth.WEB_PORT, '0.0.0.0');
    }

    renderUI() {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>TITAN V700 HYPER-SONIC</title>
            <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                :root { --neon: #00ff88; --dark: #050608; --card: #11141b; --border: #1f2530; }
                body { background: var(--dark); color: #e1e1e1; font-family: 'Kanit', sans-serif; margin: 0; padding: 25px; }
                .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; }
                .card { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 30px; box-shadow: 0 15px 35px rgba(0,0,0,0.4); border-top: 3px solid var(--neon); }
                .val { font-size: 4em; font-weight: 800; color: var(--neon); letter-spacing: -2px; }
                .console { background: #000; color: var(--neon); font-family: 'JetBrains Mono', monospace; padding: 20px; border-radius: 15px; height: 350px; overflow-y: auto; font-size: 0.85em; border: 1px solid var(--border); line-height: 1.6; }
                table { width: 100%; border-collapse: collapse; margin-top: 25px; }
                th { text-align: left; padding: 15px; color: #64748b; border-bottom: 2px solid var(--border); }
                td { padding: 15px; border-bottom: 1px solid var(--border); font-size: 0.9em; }
                .badge { padding: 6px 12px; border-radius: 8px; font-weight: bold; font-size: 0.75em; text-transform: uppercase; }
                .SUCCESS { background: rgba(0,255,136,0.1); color: var(--neon); }
                .FAILED { background: rgba(255,68,68,0.1); color: #ff4444; }
                .btn { background: var(--neon); color: #000; border: none; padding: 12px 25px; border-radius: 10px; cursor: pointer; font-weight: bold; }
            </style>
        </head>
        <body>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:40px;">
                <h1>⚡ TITAN V700 <small style="font-weight:300; opacity:0.6;">HYPER-SONIC</small></h1>
                <div style="text-align:right;">
                    MEMORY: <b>${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB</b><br>
                    UPTIME: <b>${os.uptime()}s</b>
                </div>
            </div>

            <div class="grid">
                <div class="card">
                    <h3>💰 TOTAL REVENUE</h3>
                    <div class="val">฿${CORE.performance.total_income.toFixed(2)}</div>
                    <p>HITS: <b>${CORE.performance.success}</b> | MISS: <b>${CORE.performance.fail}</b></p>
                    <canvas id="mainChart" height="120"></canvas>
                </div>
                <div class="card">
                    <h3>📱 WALLET SYSTEM</h3>
                    <div style="display:flex; gap:10px; margin-bottom:25px;">
                        <input id="wIn" style="background:#000; border:1px solid var(--border); color:#fff; padding:15px; border-radius:10px; flex:1;" placeholder="Phone Number">
                        <button class="btn" onclick="act('add')">ADD</button>
                    </div>
                    ${CORE.auth.WALLETS.map(w => `<div style="display:flex; justify-content:space-between; padding:12px; background:rgba(255,255,255,0.02); border-radius:10px; margin-bottom:8px;"><span>${w}</span> <button style="color:#ff4444; background:none; border:none;" onclick="act('del','${w}')">REMOVE</button></div>`).join('')}
                </div>
            </div>

            <div class="grid" style="grid-template-columns: 2fr 1fr; margin-top:25px;">
                <div class="card">
                    <h3>📜 HYPER-CLAIM HISTORY (URL ONLY)</h3>
                    <table>
                        <thead><tr><th>TIME</th><th>AMT</th><th>STATUS</th><th>SOURCE</th><th>HASH</th></tr></thead>
                        <tbody>
                            ${CORE.history.map(h => `
                                <tr>
                                    <td>${h.time}</td>
                                    <td style="color:var(--neon); font-weight:bold;">${h.amount}฿</td>
                                    <td><span class="badge ${h.status.includes('SUCCESS')?'SUCCESS':'FAILED'}">${h.status}</span></td>
                                    <td style="color:#64748b;">${h.source}</td>
                                    <td style="font-family:'JetBrains Mono'; color:var(--neon);">${h.hash}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="card">
                    <h3>🖥️ LIVE ENGINE LOGS</h3>
                    <div class="console">
                        ${CORE.logs.map(l => `[${l.time}] <span style="color:#94a3b8">[${l.cat}]</span> ${l.msg}<br>`).join('')}
                    </div>
                </div>
            </div>

            <script>
                function act(a, v){
                    const val = v || document.getElementById('wIn').value;
                    fetch('/api/ctl?a='+a+'&v='+val).then(()=>location.reload());
                }
                const ctx = document.getElementById('mainChart').getContext('2d');
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: Array.from({length: 24}, (_, i) => i + ':00'),
                        datasets: [{ 
                            data: ${JSON.stringify(CORE.performance.hourly)}, 
                            borderColor: '#00ff88', 
                            borderWidth: 3,
                            fill: true,
                            backgroundColor: 'rgba(0,255,136,0.1)',
                            tension: 0.4
                        }]
                    },
                    options: { plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { grid: { display: false } } } }
                });
                setTimeout(()=>location.reload(), 5000);
            </script>
        </body>
        </html>`;
    }
}

new TitanV700().boot();
