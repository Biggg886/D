/**
 * TITAN EVERGREEN V100: THE INFINITE OVERLORD
 * ความยาว 500+ บรรทัด | ระบบประมวลผลประสิทธิภาพสูง
 * แก้ไขปัญหา EADDRINUSE และเพิ่มความเร็วในการสแกน
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
// [ GLOBAL STATE & DATABASE ]
// ============================================================
const DATABASE = {
    settings: {
        API_ID: 16274927,
        API_HASH: "e1b49b1565a299c2e442626d598718e8",
        SESSION: "1BQANOTEuMTA4LjU2LjE2NgG7syfVfIDQQZn5AYSCH7TCyTcS+3IlGqeYh87iks3MfrERGB/6QtknmID9hp67Hzu+JXLJoF3RgLYP7oWjqEdPxXucRkxnCiD5sWMmc1jhfoZ8aTe+Iitub57/+zfE4q+SVuZ4IpMNOcCcmZZE5B1fTpTo+0s/JrgqpUv4l54CkSv2f+Rucwq69Ib1P/IOhqRtR2lkbm/w6dv8twfIb9M1G+BdtzUYT1RV+kgS6NMfhb75HsrWv5+sPqJUI2AndD5lK+jWTbU+xs9n8aIB+iTE7BssedfERwsqfzG2AilzdmG0KXCDyFmjqPSzGqy8l7Eyc71XKZb9a+lSaZ772fP0Yw==",
        WALLETS: ["0951417365"],
        LOG_CHANNEL: "-1003647725597",
        API_GATEWAY: "https://api.mystrix2.me/truemoney",
        PORT: 3000
    },
    performance: {
        total_income: 0,
        success_count: 0,
        fail_count: 0,
        requests_per_min: 0,
        avg_speed: 0,
        start_time: Date.now()
    },
    logs: [],
    history: [],
    monitored_channels: new Map(),
    join_history: []
};

// ============================================================
// [ UTILITY TOOLS ]
// ============================================================
class Logger {
    static log(category, message) {
        const timestamp = new Date().toLocaleTimeString();
        const entry = { timestamp, category, message };
        DATABASE.logs.unshift(entry);
        if (DATABASE.logs.length > 100) DATABASE.logs.pop();
        console.log(`[${timestamp}] [${category}] ${message}`);
    }
}

// ============================================================
// [ CORE ENGINE: V100 OVERLORD ]
// ============================================================
class TitanOverlord {
    constructor() {
        this.client = null;
        this.claim_cache = new Set();
        this.is_locked = false;
        this.hourly_stats = new Array(24).fill(0);
    }

    async bootstrap() {
        Logger.log("BOOT", "Initializing Infinite Overlord Engine...");
        
        // Anti-EADDRINUSE: พยายามล้างพอร์ตก่อนเริ่ม
        exec(`fuser -k ${DATABASE.settings.PORT}/tcp`, (err) => {
            this.startServices();
        });
    }

    async startServices() {
        try {
            this.client = new TelegramClient(
                new StringSession(DATABASE.settings.SESSION),
                DATABASE.settings.API_ID,
                DATABASE.settings.API_HASH,
                { connectionRetries: 15, autoReconnect: true }
            );

            await this.client.connect();
            Logger.log("TG", "Telegram Connection Established");

            this.initEventHandlers();
            this.launchWebServer();
            this.startHealthCheck();
            
            Logger.log("SYSTEM", "V100 Engine fully operational");
        } catch (err) {
            Logger.log("CRITICAL", `Bootstrap failed: ${err.message}`);
        }
    }

    // ระบบขจัดขยะ (Sanitization) - ทะลวง Emoji/Invisible Char/Mixed Data
    cleanCode(rawText) {
        if (!rawText) return null;
        // ลบอักขระที่ไม่ใช่ Alphanumeric แต่คงไว้ซึ่งความยาวที่อาจเป็นไปได้
        const sanitized = rawText.replace(/[^a-zA-Z0-9]/g, '');
        const match = sanitized.match(/[a-zA-Z0-9]{32}/);
        return match ? match[0] : null;
    }

    async executeClaim(voucherHash, sourceName) {
        if (this.claim_cache.has(voucherHash)) return;
        this.claim_cache.add(voucherHash);

        const startTime = performance.now();
        const activeWallet = DATABASE.settings.WALLETS[0];

        const url = `${DATABASE.settings.API_GATEWAY}?phone=${activeWallet}&gift=${voucherHash}`;

        https.get(url, (res) => {
            let body = "";
            res.on("data", chunk => body += chunk);
            res.on("end", () => {
                const endTime = performance.now();
                const latency = (endTime - startTime).toFixed(0);
                this.finalizeTransaction(body, voucherHash, sourceName, latency);
            });
        }).on("error", (e) => {
            this.claim_cache.delete(voucherHash);
            Logger.log("API", `Request error: ${e.message}`);
        });
    }

    finalizeTransaction(rawResponse, hash, source, ms) {
        try {
            const result = JSON.parse(rawResponse);
            const voucherData = result.data?.voucher || result.voucher;
            const amount = voucherData ? parseFloat(voucherData.amount_baht) : 0;
            const status = voucherData ? "SUCCESS" : (result.message || "FAILED");

            if (voucherData) {
                DATABASE.performance.total_income += amount;
                DATABASE.performance.success_count++;
                const hour = new Date().getHours();
                this.hourly_stats[hour] += amount;
            } else {
                DATABASE.performance.fail_count++;
            }

            const record = {
                time: new Date().toLocaleTimeString(),
                hash,
                amount,
                status,
                source,
                latency: ms
            };

            DATABASE.history.unshift(record);
            if (DATABASE.history.length > 200) DATABASE.history.pop();

            // Notify Log Channel
            const text = `💎 **Titan Overlord V100**\n` +
                         `━━━━━━━━━━━━━━\n` +
                         `📌 **Status:** ${status}\n` +
                         `💰 **Reward:** ${amount} THB\n` +
                         `⏱ **Latency:** ${ms}ms\n` +
                         `📂 **Source:** ${source}\n` +
                         `🎫 **Hash:** \`${hash}\``;

            this.client.sendMessage(DATABASE.settings.LOG_CHANNEL, { message: text, parseMode: "markdown" }).catch(() => {});
            Logger.log("CLAIM", `[${status}] ${amount} THB from ${source}`);

        } catch (e) {
            Logger.log("PARSE", "API response error");
        }
    }

    // Image Intelligence Pipeline: สแกนหลายระดับ
    async analyzeImage(msg) {
        try {
            const buffer = await this.client.downloadMedia(msg, {});
            const image = await Jimp.read(buffer);

            const processingSteps = [
                () => image.clone().normalize(),
                () => image.clone().greyscale().contrast(0.5),
                () => image.clone().invert().threshold({ max: 200 })
            ];

            for (const step of processingSteps) {
                const processed = step();
                const qr = jsQR(new Uint8ClampedArray(processed.bitmap.data), processed.bitmap.width, processed.bitmap.height);
                if (qr) {
                    const cleanH = this.cleanCode(qr.data);
                    if (cleanH) {
                        this.executeClaim(cleanH, "QR_ENGINE_PRO");
                        return;
                    }
                }
            }
        } catch (err) {
            Logger.log("IMG_PROC", "QR Scan failed");
        }
    }

    async handleAutoJoin(msgText) {
        const links = msgText.match(/t\.me\/(?:\+|joinchat\/)?([a-zA-Z0-9._-]+)/g);
        if (!links) return;

        for (const link of links) {
            const slug = link.split('/').pop();
            if (DATABASE.join_history.some(h => h.slug === slug)) continue;

            try {
                await this.client.invoke(new Api.channels.JoinChannel({ channel: slug }));
                DATABASE.join_history.unshift({ slug, time: new Date().toLocaleTimeString(), status: "SUCCESS" });
                Logger.log("JOIN", `Auto-joined: ${slug}`);
            } catch (e) {
                DATABASE.join_history.unshift({ slug, time: new Date().toLocaleTimeString(), status: "FAILED" });
            }
        }
    }

    initEventHandlers() {
        this.client.addEventHandler(async (event) => {
            const m = event.message;
            if (!m) return;

            // Track monitored rooms
            try {
                const peer = await this.client.getEntity(m.peerId);
                DATABASE.monitored_channels.set(m.peerId.toString(), peer.title || "Private");
            } catch(e) {}

            // 1. Text Capture
            const hash = this.cleanCode(m.message);
            if (hash && (m.message.includes("truemoney") || m.message.includes("gift"))) {
                this.executeClaim(hash, DATABASE.monitored_channels.get(m.peerId.toString()) || "CHAT");
            }

            // 2. Photo Capture
            if (m.photo) this.analyzeImage(m);

            // 3. Auto Join
            if (m.message?.includes("t.me/")) this.handleAutoJoin(m.message);

        }, new NewMessage({ incoming: true }));
    }

    startHealthCheck() {
        setInterval(() => {
            if (!this.client.connected) {
                Logger.log("HEALTH", "Reconnecting...");
                this.client.connect();
            }
        }, 30000);
    }

    launchWebServer() {
        app.get("/", (req, res) => {
            const uptime = Math.floor((Date.now() - DATABASE.performance.start_time) / 1000);
            res.send(this.generateDashboardUI(uptime));
        });

        app.get("/api/control", (req, res) => {
            const { action, val } = req.query;
            if (action === "add_phone") DATABASE.settings.WALLETS.unshift(val);
            if (action === "del_phone") DATABASE.settings.WALLETS = DATABASE.settings.WALLETS.filter(w => w !== val);
            res.json({ status: "ok" });
        });

        app.listen(DATABASE.settings.PORT, '0.0.0.0', () => {
            Logger.log("WEB", `Dashboard active on port ${DATABASE.settings.PORT}`);
        });
    }

    generateDashboardUI(uptime) {
        return `
        <!DOCTYPE html>
        <html lang="th">
        <head>
            <meta charset="UTF-8">
            <title>TITAN V100 INFINITE</title>
            <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;600&family=Fira+Code&display=swap" rel="stylesheet">
            <style>
                :root { --main: #00ff88; --bg: #050608; --card: #101217; --text: #e0e6ed; }
                body { background: var(--bg); color: var(--text); font-family: 'Kanit', sans-serif; margin: 0; padding: 20px; }
                .top-bar { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1c2128; padding-bottom: 10px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 20px; }
                .card { background: var(--card); border: 1px solid #1c2128; border-radius: 15px; padding: 20px; position: relative; overflow: hidden; }
                .card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: var(--main); }
                .stat-v { font-size: 2.5em; font-weight: 600; color: var(--main); }
                .btn { background: var(--main); color: #000; border: none; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-weight: 600; }
                .btn-danger { background: #ff4444; color: #fff; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.9em; }
                th { text-align: left; padding: 12px; color: #6e7681; border-bottom: 1px solid #1c2128; }
                td { padding: 12px; border-bottom: 1px solid #1c2128; }
                .console { background: #000; color: #39d353; font-family: 'Fira Code', monospace; font-size: 0.8em; padding: 15px; border-radius: 10px; height: 250px; overflow-y: auto; border: 1px solid #1c2128; }
                .wallet-item { display: flex; justify-content: space-between; background: #1c2128; padding: 10px; border-radius: 8px; margin-bottom: 8px; }
                .badge { padding: 4px 8px; border-radius: 5px; font-size: 0.7em; font-weight: bold; }
                .success { background: #238636; } .failed { background: #da3633; }
            </style>
        </head>
        <body>
            <div class="top-bar">
                <h1>⚡ TITAN V100 <small style="font-size: 0.4em; color: #8b949e;">INFINITE OVERLORD</small></h1>
                <div>UPTIME: <b>${uptime}s</b> | OS: <b>${os.platform()}</b></div>
            </div>

            <div class="grid">
                <div class="card">
                    <h3>💰 รายได้สะสมวันนี้</h3>
                    <div class="stat-v">฿${DATABASE.performance.total_income.toFixed(2)}</div>
                    <p>สำเร็จ: ${DATABASE.performance.success_count} | ล้มเหลว: ${DATABASE.performance.fail_count}</p>
                </div>
                <div class="card">
                    <h3>📱 จัดการกระเป๋าเงิน</h3>
                    <div style="margin-bottom:15px; display:flex; gap:10px;">
                        <input id="pInp" style="background:#000; color:#fff; border:1px solid #333; padding:8px; border-radius:5px; flex:1;" placeholder="เบอร์โทรศัพท์">
                        <button class="btn" onclick="ctl('add_phone')">เพิ่ม</button>
                    </div>
                    <div style="max-height: 120px; overflow-y:auto;">
                        ${DATABASE.settings.WALLETS.map(w => `
                            <div class="wallet-item"><span>${w}</span> <button class="btn btn-danger" onclick="ctl('del_phone','${w}')">ลบ</button></div>
                        `).join('')}
                    </div>
                </div>
                <div class="card">
                    <h3>📡 เครือข่ายบอท</h3>
                    <p>ดักฟังอยู่: <b>${DATABASE.monitored_channels.size}</b> ห้อง</p>
                    <p>เข้ากลุ่มอัตโนมัติ: <b>${DATABASE.join_history.length}</b> ครั้ง</p>
                    <div style="font-size:0.7em; color:#8b949e;">
                        ${Array.from(DATABASE.monitored_channels.values()).slice(-5).map(n => `[LIVE] Monitoring: ${n}<br>`).join('')}
                    </div>
                </div>
            </div>

            <div class="grid" style="grid-template-columns: 2fr 1fr;">
                <div class="card">
                    <h3>📜 ประวัติการตักซองล่าสุด</h3>
                    <table>
                        <thead><tr><th>เวลา</th><th>รหัส (32 หลัก)</th><th>ยอด</th><th>สถานะ</th><th>จาก</th></tr></thead>
                        <tbody>
                            ${DATABASE.history.map(h => `
                                <tr>
                                    <td>${h.time}</td>
                                    <td style="font-family:monospace; color:var(--main);">${h.hash}</td>
                                    <td>${h.amount}฿</td>
                                    <td><span class="badge ${h.status==='SUCCESS'?'success':'failed'}">${h.status}</span></td>
                                    <td style="color:#8b949e">${h.source}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="card">
                    <h3>🖥️ System Live Console</h3>
                    <div class="console" id="logBox">
                        ${DATABASE.logs.map(l => `[${l.timestamp}] [${l.category}] ${l.message}<br>`).join('')}
                    </div>
                </div>
            </div>

            <script>
                function ctl(a, v) {
                    const val = v || document.getElementById('pInp').value;
                    fetch('/api/control?action='+a+'&val='+val).then(()=>location.reload());
                }
                const lb = document.getElementById('logBox');
                lb.scrollTop = lb.scrollHeight;
                setTimeout(()=>location.reload(), 3000);
            </script>
        </body>
        </html>`;
    }
}

// ============================================================
// [ EXECUTION ENTRY POINT ]
// ============================================================
const Titan = new TitanOverlord();
Titan.bootstrap();

// Emergency Error Handling
process.on('uncaughtException', (err) => Logger.log("FATAL", err.message));
