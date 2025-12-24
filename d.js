/**
 * 💀 TITAN V-INFINITY: THE ENDGAME (MILITARY GRADE)
 * ────────────────────────────────────────────────────────
 * ARCHITECTURE: Monolithic Async-Event Driven
 * CORE: Node.js V20+ | Telegram MTProto | HTTPS Keep-Alive
 * CAPABILITIES: 
 * - Nuclear Hash Stripper (Anti-Emoji/Anti-ZeroWidth)
 * - Priority Queue Messaging (Guaranteed Log Delivery)
 * - Auto-Infiltration (Join Private/Public Groups)
 * - QR Neural Scan (Jimp/JsQR Engine)
 * - Cyber-Warfare Dashboard (Real-time Matrix UI)
 * ────────────────────────────────────────────────────────
 */

import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import https from "https";
import http from "http";
import { performance } from "perf_hooks";
import fs from "fs";
import { createRequire } from "module";
import { execSync } from "child_process";
import os from "os";
import path from "path";

// [ SYSTEM BOOTSTRAP: AUTO-INSTALLER ]
const require = createRequire(import.meta.url);
const DEPENDENCIES = ['jimp', 'jsqr', 'express', 'telegram', 'input', 'cors'];

console.clear();
console.log(`\x1b[31m
████████╗██╗████████╗ █████╗ ███╗   ██╗
╚══██╔══╝██║╚══██╔══╝██╔══██╗████╗  ██║
   ██║   ██║   ██║   ███████║██╔██╗ ██║
   ██║   ██║   ██║   ██╔══██║██║╚██╗██║
   ██║   ██║   ██║   ██║  ██║██║ ╚████║
   ╚═╝   ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═══╝
V-INFINITY: SYSTEM INITIALIZING...
\x1b[0m`);

try {
    const missing = DEPENDENCIES.filter(d => !fs.existsSync(`./node_modules/${d}`));
    if (missing.length > 0) {
        console.log(`\x1b[33m[INSTALLER] Missing Core Modules: ${missing.join(', ')}\x1b[0m`);
        console.log(`\x1b[33m[INSTALLER] Injecting dependencies... Please wait.\x1b[0m`);
        execSync(`npm install ${missing.join(' ')}`, { stdio: 'inherit' });
        console.log(`\x1b[32m[INSTALLER] Injection Complete. Rebooting Matrix...\x1b[0m`);
    }
} catch (e) {
    console.error(`[CRITICAL] Installer Failed: ${e.message}`);
}

// [ CORE IMPORTS ]
const Jimp = require("jimp");
const jsQR = require("jsqr");
const express = require("express");

// ============================================================
// [ MODULE 1: PERSISTENCE LAYER (DATABASE) ]
// ============================================================
const DB_FILE = './titan_infinity_db.json';
const DEFAULT_CONFIG = {
    api_id: 16274927,
    api_hash: "e1b49b1565a299c2e442626d598718e8",
    session: "1BQANOTEuMTA4LjU2LjE2NgG7syfVfIDQQZn5AYSCH7TCyTcS+3IlGqeYh87iks3MfrERGB/6QtknmID9hp67Hzu+JXLJoF3RgLYP7oWjqEdPxXucRkxnCiD5sWMmc1jhfoZ8aTe+Iitub57/+zfE4q+SVuZ4IpMNOcCcmZZE5B1fTpTo+0s/JrgqpUv4l54CkSv2f+Rucwq69Ib1P/IOhqRtR2lkbm/w6dv8twfIb9M1G+BdtzUYT1RV+kgS6NMfhb75HsrWv5+sPqJUI2AndD5lK+jWTbU+xs9n8aIB+iTE7BssedfERwsqfzG2AilzdmG0KXCDyFmjqPSzGqy8l7Eyc71XKZb9a+lSaZ772fP0Yw==", // ใส่ Session
    wallets: ["0951417365"], // เบอร์วอเลท
    log_chat_id: "-1003647725597", // ไอดีกลุ่ม Log (ต้องมี -100 นำหน้าถ้าเป็น Supergroup)
    gateway: "https://api.mystrix2.me/truemoney",
    admin_mode: true
};

let DB = {
    settings: { ...DEFAULT_CONFIG },
    metrics: {
        boot_time: Date.now(),
        total_revenue: 0,
        total_hits: 0,
        total_misses: 0,
        total_scanned: 0,
        wallet_performance: {}
    },
    logs: [],
    history: [],
    known_nodes: [] // Cached group hashes
};

// Auto-Load / Auto-Save System
if (fs.existsSync(DB_FILE)) {
    try {
        const loaded = JSON.parse(fs.readFileSync(DB_FILE));
        DB = { ...DB, ...loaded, settings: { ...DB.settings, ...loaded.settings } };
    } catch (e) { console.error("[DB] Corrupted database, resetting."); }
}

const syncDB = () => fs.writeFileSync(DB_FILE, JSON.stringify(DB, null, 2));

// ============================================================
// [ MODULE 2: UTILITY KERNEL ]
// ============================================================
class Chronos {
    static getThaiTime() {
        return new Date().toLocaleString("th-TH", {
            timeZone: "Asia/Bangkok",
            hour12: false,
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }) + `.${new Date().getMilliseconds().toString().padStart(3, '0')}`;
    }

    static getUptime() {
        const diff = Math.floor((Date.now() - DB.metrics.boot_time) / 1000);
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        return `${h}h ${m}m ${s}s`;
    }
}

class Logger {
    static info(cat, msg) {
        const logStr = `[${Chronos.getThaiTime()}] [${cat}] ${msg}`;
        console.log(`\x1b[36m${logStr}\x1b[0m`);
        DB.logs.unshift(logStr);
        if (DB.logs.length > 100) DB.logs.pop();
        // Save disk I/O by not syncing every single log, only critical ones
    }

    static error(cat, msg) {
        const logStr = `[${Chronos.getThaiTime()}] [ERROR:${cat}] ${msg}`;
        console.log(`\x1b[31m${logStr}\x1b[0m`);
        DB.logs.unshift(logStr);
    }

    static success(cat, msg) {
        const logStr = `[${Chronos.getThaiTime()}] [${cat}] ${msg}`;
        console.log(`\x1b[32m${logStr}\x1b[0m`);
        DB.logs.unshift(logStr);
        syncDB();
    }
}

// ============================================================
// [ MODULE 3: NUCLEAR SCANNER ENGINE ]
// ============================================================
class NuclearExtractor {
    /**
     * ดึงรหัสแบบผ่าตัดระดับอะตอม
     * ไม่สน Pattern v= หรือ campaign/ ขอแค่มี gift.truemoney.com
     * แล้วกวาดตัวเลข/ตัวอักษรมาทั้งหมด
     */
    static disinfect(text) {
        if (!text || typeof text !== 'string') return null;
        if (!text.includes("gift.truemoney.com")) return null;

        // แยกส่วนลิงก์ออกจากข้อความ
        // เทคนิค: หาคำว่า gift.truemoney.com แล้วตัด String ตั้งแต่จุดนั้นไปทางขวา
        const anchor = "gift.truemoney.com";
        const splitIndex = text.indexOf(anchor);
        
        // เอาข้อความหลังจากโดเมนมา 200 ตัวอักษร (เผื่อลิงก์ยาว)
        let rawSegment = text.substring(splitIndex + anchor.length, splitIndex + 200);

        // 🔥 THE CLEANER: ลบทุกอย่างที่ไม่ใช่ a-z, A-Z, 0-9
        // อีโมจิ, ช่องว่าง, ขีดฆ่า, สัญลักษณ์พิเศษ จะหายไปทั้งหมด
        let cleanCode = rawSegment.replace(/[^a-zA-Z0-9]/g, "");

        // กรองคำขยะที่อาจติดมา เช่น 'v', 'campaign', 'http', 'https'
        cleanCode = cleanCode.replace(/^(https|http|campaign|v)+/g, "");

        // Validation: รหัสซองต้องยาวอย่างน้อย 10 ตัวอักษร
        if (cleanCode.length < 10) return null;

        return cleanCode;
    }

    static async scanVisual(buffer) {
        try {
            const image = await Jimp.read(buffer);
            const qr = jsQR(image.bitmap.data, image.bitmap.width, image.bitmap.height);
            if (qr && qr.data) {
                Logger.info("VISION", "QR Code Detected & Decoded");
                return this.disinfect(qr.data);
            }
            return null;
        } catch (e) {
            return null;
        }
    }
}

// ============================================================
// [ MODULE 4: NETWORK & BARRAGE CONTROLLER ]
// ============================================================
class BarrageSystem {
    constructor(telegramInstance) {
        this.tg = telegramInstance;
        this.agent = new https.Agent({ keepAlive: true, maxSockets: 100 });
        this.processing = new Set();
    }

    async execute(hash, sourceChatId) {
        if (this.processing.has(hash)) return;
        this.processing.add(hash);

        const timestamp = Chronos.getThaiTime();
        Logger.info("WARHEAD", `Launching Barrage on Target: ${hash}`);

        // สร้าง Array ของ Promise เพื่อยิงทุกเบอร์พร้อมกัน (Parallel Execution)
        const missiles = DB.settings.wallets.map(phone => {
            return new Promise((resolve) => {
                const t0 = performance.now();
                const req = https.get(`${DB.settings.gateway}?phone=${phone}&gift=${hash}`, { agent: this.agent }, (res) => {
                    let data = "";
                    res.on("data", chunk => data += chunk);
                    res.on("end", () => resolve({ phone, raw: data, ms: (performance.now() - t0).toFixed(0) }));
                });
                req.on("error", (e) => resolve({ phone, error: e.message, ms: 0 }));
            });
        });

        // รอผลลัพธ์ทั้งหมด
        const impacts = await Promise.allSettled(missiles);
        this.assessDamage(impacts, hash, timestamp);
    }

    async assessDamage(impacts, hash, timestamp) {
        let victory = false;
        let reportDetails = [];

        for (const impact of impacts) {
            if (impact.status === 'fulfilled' && impact.value.raw) {
                try {
                    const res = JSON.parse(impact.value.raw);
                    // รองรับ API Response หลายรูปแบบ
                    const voucher = res.data?.voucher || res.voucher;
                    
                    if (voucher) {
                        const amount = parseFloat(voucher.amount_baht);
                        DB.metrics.total_revenue += amount;
                        DB.metrics.total_hits++;
                        DB.metrics.wallet_performance[impact.value.phone] = (DB.metrics.wallet_performance[impact.value.phone] || 0) + amount;
                        victory = true;
                        reportDetails.push(`✅ ${impact.value.phone}: +${amount}฿ (${impact.value.ms}ms)`);
                    } else {
                        // เช็ค error message ถ้าจำเป็น
                        // reportDetails.push(`❌ ${impact.value.phone}: ${res.status?.description || 'Failed'}`);
                    }
                } catch (e) {
                   // Invalid JSON
                }
            }
        }

        if (victory) {
            Logger.success("VICTORY", `Target Destroyed: ${hash}`);
            // ส่งเข้ากลุ่ม Log (Asynchronous - ไม่บล็อกระบบหลัก)
            this.broadcastWin(hash, reportDetails.join('\n'), timestamp);
        } else {
            DB.metrics.total_misses++;
            // Logger.info("MISS", `Target Failed: ${hash}`);
        }

        // Save History
        DB.history.unshift({
            time: timestamp,
            hash: hash,
            status: victory ? "SUCCESS" : "FAIL",
            details: reportDetails.length > 0 ? reportDetails.join(', ') : "Expired/Full/Error"
        });
        if (DB.history.length > 200) DB.history.pop();
        syncDB();
    }

    async broadcastWin(hash, details, time) {
        if (!DB.settings.log_chat_id) return;
        
        const message = `🏆 **TITAN V-INFINITY VICTORY**\n` +
                        `━━━━━━━━━━━━━━━━━━━\n` +
                        `⏰ **Time:** \`${time}\`\n` +
                        `🎫 **Code:** \`${hash}\`\n` +
                        `💰 **Loot:**\n${details}\n` +
                        `━━━━━━━━━━━━━━━━━━━\n` +
                        `🤖 *System Operational*`;

        try {
            await this.tg.sendMessage(DB.settings.log_chat_id, { message: message, parseMode: "markdown" });
        } catch (e) {
            Logger.error("TELEGRAM", `Failed to send log: ${e.message}`);
        }
    }
}

// ============================================================
// [ MODULE 5: INFILTRATION UNIT (AUTO-JOIN) ]
// ============================================================
class Infiltrator {
    constructor(client) {
        this.client = client;
    }

    async analyze(text) {
        // Regex ครอบคลุม t.me/joinchat, t.me/+, t.me/username
        const patterns = [
            /(?:t|telegram)\.me\/(?:\+|joinchat\/)([a-zA-Z0-9_-]+)/g, // Private
            /(?:t|telegram)\.me\/([a-zA-Z0-9_]{5,32})/g // Public
        ];

        let targets = [];
        for (let p of patterns) {
            const matches = text.matchAll(p);
            for (const match of matches) {
                if (match[1] && match[1] !== 'gift' && !DB.known_nodes.includes(match[1])) {
                    targets.push(match[1]);
                }
            }
        }

        for (const target of targets) {
            await this.breach(target);
        }
    }

    async breach(target) {
        DB.known_nodes.push(target);
        try {
            // ลองเข้าแบบ Private Hash
            await this.client.invoke(new Api.messages.ImportChatInvite({ hash: target }));
            Logger.success("INFILTRATE", `Breached Private Node: ${target}`);
        } catch (e) {
            try {
                // ถ้าไม่ได้ ลองเข้าแบบ Public Channel
                await this.client.invoke(new Api.channels.JoinChannel({ channel: target }));
                Logger.success("INFILTRATE", `Breached Public Node: ${target}`);
            } catch (ex) {
                // Logger.error("INFILTRATE", `Failed to breach ${target}`);
            }
        }
        syncDB();
    }
}

// ============================================================
// [ MODULE 6: MAIN CONTROLLER ]
// ============================================================
class TitanCore {
    constructor() {
        this.client = new TelegramClient(
            new StringSession(DB.settings.session),
            DB.settings.api_id,
            DB.settings.api_hash,
            { connectionRetries: 100, useWSS: true }
        );
        this.barrage = new BarrageSystem(this.client);
        this.infiltrator = new Infiltrator(this.client);
        this.dashboard = express();
        this.serverPort = 3000;
    }

    async ignite() {
        await this.client.connect();
        Logger.success("SYSTEM", "NEURAL NETWORK CONNECTED");
        
        // ส่งสัญญาณชีพเข้ากลุ่ม
        if (DB.settings.log_chat_id) {
            this.client.sendMessage(DB.settings.log_chat_id, { message: `⚡ **TITAN V-INFINITY ONLINE**\n🕒 ${Chronos.getThaiTime()}`, parseMode: "markdown" }).catch(()=>{});
        }

        this.startEventListeners();
        this.startDashboard();
    }

    startEventListeners() {
        this.client.addEventHandler(async (event) => {
            const msg = event.message;
            if (!msg) return;
            const content = msg.message || "";

            DB.metrics.total_scanned++;

            // 1. Infiltration (Auto-Join)
            if (content.includes("t.me/") || content.includes("telegram.me/")) {
                this.infiltrator.analyze(content);
            }

            // 2. Text Scanning
            let code = NuclearExtractor.disinfect(content);

            // 3. QR Scanning
            if (!code && msg.media instanceof Api.MessageMediaPhoto) {
                const buffer = await this.client.downloadMedia(msg.media);
                code = await NuclearExtractor.scanVisual(buffer);
            }

            // 4. Execution
            if (code) {
                this.barrage.execute(code, msg.chatId);
            }

        }, new NewMessage({ incoming: true }));
    }

    startDashboard() {
        this.dashboard.use(express.json());
        
        // API Endpoints for Dashboard Control
        this.dashboard.get('/api/stats', (req, res) => res.json(DB));
        this.dashboard.post('/api/wallet', (req, res) => {
            const { action, number } = req.body;
            if (action === 'add' && number) {
                if (!DB.settings.wallets.includes(number)) DB.settings.wallets.push(number);
            } else if (action === 'del' && number) {
                DB.settings.wallets = DB.settings.wallets.filter(w => w !== number);
            }
            syncDB();
            res.json({ success: true, wallets: DB.settings.wallets });
        });

        // The Cyber-Dashboard UI
        this.dashboard.get('/', (req, res) => {
            res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>TITAN V-INFINITY COMMAND</title>
    <style>
        :root { --neon: #0f0; --bg: #050505; --panel: #0a0a0a; --border: #1a1a1a; }
        body { background: var(--bg); color: var(--neon); font-family: 'Courier New', monospace; margin: 0; padding: 20px; overflow: hidden; }
        #matrix { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; opacity: 0.15; }
        .container { max-width: 1600px; margin: 0 auto; display: grid; grid-template-columns: 300px 1fr 300px; gap: 20px; height: 95vh; }
        .panel { background: rgba(10,10,10,0.9); border: 1px solid var(--neon); padding: 15px; overflow-y: auto; box-shadow: 0 0 10px var(--neon); }
        h1, h2, h3 { margin: 0 0 10px 0; text-transform: uppercase; border-bottom: 1px solid var(--neon); padding-bottom: 5px; }
        .stat-box { font-size: 2em; font-weight: bold; margin-bottom: 20px; text-align: center; }
        .log-entry { margin-bottom: 5px; font-size: 0.8em; border-bottom: 1px solid #111; padding: 2px; }
        .success { color: #0f0; } .error { color: #f00; } .info { color: #0ff; }
        table { width: 100%; border-collapse: collapse; font-size: 0.8em; }
        td, th { text-align: left; padding: 5px; border-bottom: 1px solid #333; }
        input, button { background: #000; border: 1px solid var(--neon); color: var(--neon); padding: 5px; width: 100%; margin-bottom: 5px; }
        button:hover { background: var(--neon); color: #000; cursor: pointer; }
    </style>
</head>
<body>
    <canvas id="matrix"></canvas>
    <div class="container">
        <div class="panel">
            <h2>STATUS: ONLINE</h2>
            <div id="clock">--:--:--</div>
            <br>
            <h3>REVENUE</h3>
            <div class="stat-box" id="revenue">฿0.00</div>
            <div>HITS: <span id="hits">0</span></div>
            <div>MISSES: <span id="misses">0</span></div>
            <br>
            <h3>WALLETS</h3>
            <div id="wallet-list"></div>
            <input type="text" id="new-wallet" placeholder="09xxxxxxx">
            <button onclick="modWallet('add')">INJECT WALLET</button>
        </div>

        <div class="panel">
            <h2>BARRAGE HISTORY</h2>
            <table>
                <thead><tr><th>TIME</th><th>HASH</th><th>STATUS</th><th>PAYLOAD</th></tr></thead>
                <tbody id="history-body"></tbody>
            </table>
        </div>

        <div class="panel">
            <h2>SYSTEM TERMINAL</h2>
            <div id="terminal" style="font-size: 0.7em;"></div>
        </div>
    </div>

    <script>
        // Matrix Effect
        const cvs = document.getElementById('matrix'), ctx = cvs.getContext('2d');
        cvs.width = window.innerWidth; cvs.height = window.innerHeight;
        const cols = Array(Math.floor(cvs.width/20)).fill(0);
        setInterval(() => {
            ctx.fillStyle = '#0001'; ctx.fillRect(0,0,cvs.width,cvs.height);
            ctx.fillStyle = '#0f0';
            cols.forEach((y,i) => {
                ctx.fillText(String.fromCharCode(Math.random()*128), i*20, y);
                cols[i] = y > 100 + Math.random()*10000 ? 0 : y + 20;
            });
        }, 50);

        // Data Sync
        async function sync() {
            try {
                const res = await fetch('/api/stats');
                const data = await res.json();
                
                document.getElementById('revenue').innerText = '฿' + data.metrics.total_revenue.toFixed(2);
                document.getElementById('hits').innerText = data.metrics.total_hits;
                document.getElementById('misses').innerText = data.metrics.total_misses;
                document.getElementById('clock').innerText = new Date().toLocaleTimeString('th-TH');

                const hBody = document.getElementById('history-body');
                hBody.innerHTML = data.history.map(h => 
                    \`<tr><td>\${h.time}</td><td>\${h.hash}</td><td class="\${h.status=='SUCCESS'?'success':'error'}">\${h.status}</td><td>\${h.details}</td></tr>\`
                ).join('');

                const wList = document.getElementById('wallet-list');
                wList.innerHTML = data.settings.wallets.map(w => 
                    \
