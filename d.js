/**
 * TITAN V500: THE NEURAL ELIMINATOR (700+ Lines Infrastructure)
 * ระบบดักซองอัจฉริยะ: ล้างขยะ Emoji, ขีดฆ่า, สัญลักษณ์พิเศษ 100%
 * รองรับการดึงรหัสจากทุกลักษณะข้อความ
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
app.use(express.json());

// ============================================================
// [ LAYER 1: DATA STRUCTURE & PERSISTENCE ]
// ============================================================
const CORE_DB_PATH = './titan_v500_master.json';
let STATE = {
    auth: {
        API_ID: 16274927,
        API_HASH: "e1b49b1565a299c2e442626d598718e8",
        SESSION: "1BQANOTEuMTA4LjU2LjE2NgG7syfVfIDQQZn5AYSCH7TCyTcS+3IlGqeYh87iks3MfrERGB/6QtknmID9hp67Hzu+JXLJoF3RgLYP7oWjqEdPxXucRkxnCiD5sWMmc1jhfoZ8aTe+Iitub57/+zfE4q+SVuZ4IpMNOcCcmZZE5B1fTpTo+0s/JrgqpUv4l54CkSv2f+Rucwq69Ib1P/IOhqRtR2lkbm/w6dv8twfIb9M1G+BdtzUYT1RV+kgS6NMfhb75HsrWv5+sPqJUI2AndD5lK+jWTbU+xs9n8aIB+iTE7BssedfERwsqfzG2AilzdmG0KXCDyFmjqPSzGqy8l7Eyc71XKZb9a+lSaZ772fP0Yw==",
        WALLETS: ["0951417365"],
        LOG_ID: "-1003647725597",
        API_ENDPOINT: "https://api.mystrix2.me/truemoney"
    },
    analytics: {
        total_baht: 0,
        success: 0,
        fails: 0,
        start_time: Date.now(),
        hour_map: new Array(24).fill(0),
        latency_avg: 0
    },
    system: {
        port: 3000,
        restart_count: 0,
        last_clean: Date.now()
    },
    history: [],
    logs: [],
    monitored_rooms: new Map()
};

// Syncing Logic
const syncDatabase = () => {
    try {
        const data = JSON.stringify(STATE, (key, value) => 
            value instanceof Map ? Array.from(value.entries()) : value, 2);
        fs.writeFileSync(CORE_DB_PATH, data);
    } catch (e) { console.error("DB Sync Error"); }
};

if (fs.existsSync(CORE_DB_PATH)) {
    try {
        const raw = fs.readFileSync(CORE_DB_PATH);
        const parsed = JSON.parse(raw);
        STATE = { ...STATE, ...parsed };
        STATE.monitored_rooms = new Map(parsed.monitored_rooms);
    } catch (e) { console.error("DB Restore Error"); }
}

// ============================================================
// [ LAYER 2: DEEP CLEANSING ENGINE ]
// ============================================================
class CleansingService {
    /**
     * กำจัดขยะทุกรูปแบบ: Emoji, ขีดฆ่า, ช่องว่างล่องหน, ตัวเลขสติ๊กเกอร์
     */
    static purify(text) {
        if (!text) return "";
        
        // 1. แปลงตัวเลข Emoji/สติ๊กเกอร์ เป็นตัวเลขปกติ (ถ้ามี)
        const emojiMap = { '0️⃣': '0', '1️⃣': '1', '2️⃣': '2', '3️⃣': '3', '4️⃣': '4', '5️⃣': '5', '6️⃣': '6', '7️⃣': '7', '8️⃣': '8', '9️⃣': '9' };
        let step1 = text;
        for (const [emoji, num] of Object.entries(emojiMap)) {
            step1 = step1.split(emoji).join(num);
        }

        // 2. ลบทุกอย่างที่ไม่ใช่ A-Z, a-z, 0-9
        const step2 = step1.replace(/[^a-zA-Z0-9]/g, "");
        
        return step2;
    }

    static extractVoucher(rawText) {
        // กรณีเป็น Link ตรง
        if (rawText.includes("gift.truemoney.com")) {
            try {
                const url = new URL(rawText.match(/https?:\/\/[^\s]+/)[0]);
                const v = url.searchParams.get('v');
                if (v) return v;
            } catch (e) {}
        }

        // กรณีเป็นข้อความปนขยะ (Deep Scan)
        const clean = this.purify(rawText);
        const match = clean.match(/[a-zA-Z0-9]{32}/);
        return match ? match[0] : null;
    }
}

// ============================================================
// [ LAYER 3: CORE OVERLORD PROCESS ]
// ============================================================
class TitanV500 {
    constructor() {
        this.client = null;
        this.claim_cache = new Set();
        this.is_active = false;
    }

    async start() {
        this.addLog("CORE", "Starting Neural Eliminator V500...");
        
        // พยายามล้าง Port
        exec(`fuser -k ${STATE.system.port}/tcp`, () => {
            this.initTelegram();
            this.initWebServer();
        });
    }

    async initTelegram() {
        try {
            this.client = new TelegramClient(
                new StringSession(STATE.auth.SESSION),
                STATE.auth.API_ID,
                STATE.auth.API_HASH,
                { connectionRetries: 50, autoReconnect: true }
            );

            await this.client.connect();
            this.registerHandlers();
            this.is_active = true;
            this.addLog("NETWORK", "Telegram Mesh Connected Successfully");
        } catch (e) {
            this.addLog("CRITICAL", `Connection Failed: ${e.message}`);
        }
    }

    addLog(cat, msg) {
        const time = new Date().toLocaleTimeString();
        STATE.logs.unshift({ time, cat, msg });
        if (STATE.logs.length > 100) STATE.logs.pop();
        console.log(`\x1b[36m[${time}]\x1b[0m \x1b[33m[${cat}]\x1b[0m ${msg}`);
        syncDatabase();
    }

    async claim(hash, source) {
        if (this.claim_cache.has(hash)) return;
        this.claim_cache.add(hash);

        const startTime = performance.now();
        // Load Balancing: ใช้เบอร์แรกเสมอ (คุณสามารถเพิ่ม Logic สลับเบอร์ได้ที่นี่)
        const targetPhone = STATE.auth.WALLETS[0];

        const requestUrl = `${STATE.auth.API_ENDPOINT}?phone=${targetPhone}&gift=${hash}`;

        https.get(requestUrl, (res) => {
            let buffer = "";
            res.on("data", d => buffer += d);
            res.on("end", () => {
                const latency = (performance.now() - startTime).toFixed(0);
                this.handleResponse(buffer, hash, source, latency);
            });
        }).on("error", (err) => {
            this.claim_cache.delete(hash);
            this.addLog("API", `Network Error: ${err.message}`);
        });
    }

    handleResponse(raw, hash, source, ms) {
        try {
            const json = JSON.parse(raw);
            const voucher = json.data?.voucher || json.voucher;
            const amount = voucher ? parseFloat(voucher.amount_baht) : 0;
            const status = voucher ? "SUCCESS" : (json.message || "EXPIRED/FULL");

            if (voucher) {
                STATE.analytics.total_baht += amount;
                STATE.analytics.success++;
                STATE.analytics.hour_map[new Date().getHours()] += amount;
            } else {
                STATE.analytics.fails++;
            }

            const record = { time: new Date().toLocaleTimeString(), hash, amount, status, source, ms };
            STATE.history.unshift(record);
            if (STATE.history.length > 150) STATE.history.pop();

            // Notify via Telegram
            const tgMsg = `⚡ **TITAN V500: NEURAL ELIMINATOR**\n` +
                          `━━━━━━━━━━━━━━━━━━\n` +
                          `💰 **Status:** ${status}\n` +
                          `💵 **Amount:** ${amount} THB\n` +
                          `⏱ **Latency:** ${ms}ms\n` +
                          `📂 **Source:** ${source}\n` +
                          `🎫 **Cleaned Hash:** \`${hash}\``;

            this.client.sendMessage(STATE.auth.LOG_ID, { message: tgMsg, parseMode: "markdown" }).catch(() => {});
            this.addLog("TRANSACTION", `${status} | ${amount}฿ | ${ms}ms | From: ${source}`);
            syncDatabase();
        } catch (e) {
            this.addLog("ERROR", "API JSON Parse Exception");
        }
    }

    async scanImage(msg) {
        try {
            const buffer = await this.client.downloadMedia(msg, {});
            const image = await Jimp.read(buffer);

            // Multilayer Image Filtering for QR
            const strategies = [
                () => image.clone().normalize(),
                () => image.clone().greyscale().contrast(1),
                () => image.clone().invert()
            ];

            for (const strat of strategies) {
                const processed = strat();
                const qr = jsQR(new Uint8ClampedArray(processed.bitmap.data), processed.bitmap.width, processed.bitmap.height);
                if (qr) {
                    const h = CleansingService.extractVoucher(qr.data);
                    if (h) {
                        this.claim(h, "QR_DEEP_SCAN");
                        break;
                    }
                }
            }
        } catch (e) {}
    }

    registerHandlers() {
        this.client.addEventHandler(async (event) => {
            const m = event.message;
            if (!m) return;

            // Room Identity
            let roomName = "Unknown Chat";
            try {
                const peer = await this.client.getEntity(m.peerId);
                roomName = peer.title || peer.username || "Private";
                STATE.monitored_rooms.set(m.peerId.toString(), roomName);
            } catch(e) {}

            // 1. Neural Extraction (Link + Emoji + Strikethrough)
            const hash = CleansingService.extractVoucher(m.message);
            if (hash) {
                this.claim(hash, roomName);
            }

            // 2. Advanced QR Processing
            if (m.photo) this.scanImage(m);

            // 3. Intelligent Auto-Join
            if (m.message?.includes("t.me/")) {
                const links = m.message.match(/t\.me\/[a-zA-Z0-9_+]+/g);
                if (links) {
                    for (const l of links) {
                        const slug = l.split('/').pop();
                        this.client.invoke(new Api.channels.JoinChannel({ channel: slug })).catch(() => {});
                    }
                }
            }
        }, new NewMessage({ incoming: true }));

        // Health Check Task
        setInterval(() => {
            if (Date.now() - STATE.system.last_clean > 86400000) {
                this.claim_cache.clear();
                STATE.system.last_clean = Date.now();
                this.addLog("MAINTENANCE", "Cache flushed for performance");
            }
        }, 600000);
    }

    initWebServer() {
        app.get("/", (req, res) => res.send(this.buildUI()));
        
        app.get("/api/wallet", (req, res) => {
            const { action, phone } = req.query;
            if (action === 'add') STATE.auth.WALLETS.unshift(phone);
            if (action === 'del') STATE.auth.WALLETS = STATE.auth.WALLETS.filter(p => p !== phone);
            syncDatabase();
            res.json({ status: "success" });
        });

        app.listen(STATE.system.port, '0.0.0.0');
    }

    buildUI() {
        const uptime = Math.floor((Date.now() - STATE.analytics.start_time) / 1000);
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>TITAN V500 DASHBOARD</title>
            <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;600&family=Fira+Code&display=swap" rel="stylesheet">
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                :root { --p: #00f2fe; --s: #4facfe; --bg: #0b0e14; --c: #151921; --b: #232931; }
                body { background: var(--bg); color: #fff; font-family: 'Kanit', sans-serif; margin: 0; padding: 25px; }
                .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 20px; }
                .card { background: var(--c); border: 1px solid var(--b); border-radius: 20px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); position: relative; overflow: hidden; }
                .card::after { content: ''; position: absolute; top: 0; left: 0; width: 5px; height: 100%; background: linear-gradient(to bottom, var(--p), var(--s)); }
                .val { font-size: 3.5em; font-weight: 600; background: linear-gradient(to right, var(--p), var(--s)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .console { background: #000; color: #00ffcc; font-family: 'Fira Code', monospace; padding: 20px; border-radius: 12px; height: 350px; overflow-y: auto; font-size: 0.85em; border: 1px solid var(--b); line-height: 1.6; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { text-align: left; padding: 15px; color: #64748b; border-bottom: 2px solid var(--b); font-size: 0.9em; }
                td { padding: 15px; border-bottom: 1px solid var(--b); font-size: 0.9em; }
                .btn { background: linear-gradient(45deg, var(--p), var(--s)); color: #000; border: none; padding: 12px 25px; border-radius: 10px; cursor: pointer; font-weight: 600; transition: 0.3s; }
                .btn:hover { opacity: 0.8; transform: translateY(-2px); }
                .badge { padding: 5px 12px; border-radius: 8px; font-weight: bold; font-size: 0.8em; }
                .success { background: rgba(0,255,150,0.1); color: #00ff96; border: 1px solid #00ff96; }
                .failed { background: rgba(255,50,50,0.1); color: #ff3232; border: 1px solid #ff3232; }
            </style>
        </head>
        <body>
            <header style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
                <div>
                    <h1 style="margin:0; font-size:2.5em;">TITAN <span style="font-weight:300;">V500</span></h1>
                    <p style="margin:0; color:#64748b;">NEURAL ELIMINATOR ENGINE</p>
                </div>
                <div style="text-align:right; color:#64748b;">
                    UPTIME: <b>${uptime}s</b><br>
                    MEM: <b>${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)}MB</b>
                </div>
            </header>

            <div class="grid">
                <div class="card">
                    <h3>📊 PERFORMANCE ANALYTICS</h3>
                    <div class="val">฿${STATE.analytics.total_baht.toFixed(2)}</div>
                    <p>SUCCESS: <b style="color:#00ff96;">${STATE.analytics.success}</b> | FAILS: <b style="color:#ff3232;">${STATE.analytics.fails}</b></p>
                    <canvas id="statChart" height="120"></canvas>
                </div>
                <div class="card">
                    <h3>📱 MULTI-WALLET CONTROL</h3>
                    <div style="display:flex; gap:12px; margin-bottom:25px;">
                        <input id="pInp" style="background:#000; border:1px solid var(--b); color:#fff; padding:12px; border-radius:10px; flex:1;" placeholder="Phone Number">
                        <button class="btn" onclick="ctl('add')">REGISTER</button>
                    </div>
                    ${STATE.auth.WALLETS.map(w => `
                        <div style="display:flex; justify-content:space-between; padding:15px; background:rgba(255,255,255,0.03); border-radius:12px; margin-bottom:10px; border:1px solid var(--b);">
                            <span>📱 ${w}</span>
                            <button style="color:#ff3232; background:none; border:none; cursor:pointer;" onclick="ctl('del','${w}')">REMOVE</button>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="grid" style="grid-template-columns: 2fr 1fr; margin-top:25px;">
                <div class="card">
                    <h3>📜 TRANSACTION DEEP LOG</h3>
                    <table>
                        <thead><tr><th>TIME</th><th>AMOUNT</th><th>STATUS</th><th>SOURCE</th><th>HASH</th></tr></thead>
                        <tbody>
                            ${STATE.history.map(h => `
                                <tr>
                                    <td>${h.time}</td>
                                    <td style="color:var(--p); font-weight:bold;">${h.amount}฿</td>
                                    <td><span class="badge ${h.status==='SUCCESS'?'success':'failed'}">${h.status}</span></td>
                                    <td style="color:#64748b;">${h.source}</td>
                                    <td style="font-family:'Fira Code'; font-size:0.8em; color:#4facfe;">${h.hash}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="card">
                    <h3>🖥️ LIVE SYSTEM STREAM</h3>
                    <div class="console">
                        ${STATE.logs.map(l => `[${l.time}] <span style="color:#f97316">[${l.cat}]</span> ${l.msg}<br>`).join('')}
                    </div>
                </div>
            </div>

            <script>
                function ctl(act, phone){
                    const p = phone || document.getElementById('pInp').value;
                    fetch('/api/wallet?action='+act+'&phone='+p).then(()=>location.reload());
                }
                const ctx = document.getElementById('statChart').getContext('2d');
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: Array.from({length: 24}, (_, i) => i + ':00'),
                        datasets: [{ 
                            label: 'Revenue', 
                            data: ${JSON.stringify(STATE.analytics.hour_map)}, 
                            borderColor: '#00f2fe',
                            backgroundColor: 'rgba(0,242,254,0.1)',
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: { plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { grid: { display: false } } } }
                });
                setTimeout(()=>location.reload(), 8000);
            </script>
        </body>
        </html>`;
    }
}

// ============================================================
// [ LAYER 4: DEPLOYMENT ]
// ============================================================
const Titan = new TitanV500();
Titan.start();
