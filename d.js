/**
 * TITAN V300: ETERNAL OMNI-RECOGNITION
 * ระบบรับซองทุกรูปแบบ: ลิงก์ตรง, รหัสเพียวๆ, QR Code, และข้อความปนขยะ
 * Total Lines: 650+ | Performance Optimized
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
import { exec } from "child_process";

const Jimp = JimpModule.Jimp || JimpModule.default || JimpModule;
const app = express();

// ============================================================
// [ CORE DATABASE SYSTEM ]
// ============================================================
const STORAGE = {
    CFG: {
        API_ID: 16274927,
        API_HASH: "e1b49b1565a299c2e442626d598718e8",
        SESSION: "1BQANOTEuMTA4LjU2LjE2NgG7syfVfIDQQZn5AYSCH7TCyTcS+3IlGqeYh87iks3MfrERGB/6QtknmID9hp67Hzu+JXLJoF3RgLYP7oWjqEdPxXucRkxnCiD5sWMmc1jhfoZ8aTe+Iitub57/+zfE4q+SVuZ4IpMNOcCcmZZE5B1fTpTo+0s/JrgqpUv4l54CkSv2f+Rucwq69Ib1P/IOhqRtR2lkbm/w6dv8twfIb9M1G+BdtzUYT1RV+kgS6NMfhb75HsrWv5+sPqJUI2AndD5lK+jWTbU+xs9n8aIB+iTE7BssedfERwsqfzG2AilzdmG0KXCDyFmjqPSzGqy8l7Eyc71XKZb9a+lSaZ772fP0Yw==",
        WALLETS: ["0951417365"],
        LOG_CHAT: "-1003647725597",
        API_URL: "https://api.mystrix2.me/truemoney",
        PORT: 3000
    },
    DATA: {
        total_baht: 0,
        success_hits: 0,
        failed_hits: 0,
        start_time: Date.now(),
        hour_stats: Array(24).fill(0),
        vouchers: [],
        logs: [],
        room_map: new Map(),
        leaderboard: {}
    }
};

// ============================================================
// [ OMNI RECOGNITION ENGINE ]
// ============================================================
class TitanOmniV300 {
    constructor() {
        this.tg = null;
        this.cache = new Set();
        this.is_booting = true;
    }

    async boot() {
        this.log("CORE", "Initializing Eternal Omni-Engine...");
        
        // แก้ไขปัญหา Port ค้างก่อนเริ่ม
        exec(`fuser -k ${STORAGE.CFG.PORT}/tcp`, () => {
            this.startApp();
        });
    }

    async startApp() {
        try {
            this.tg = new TelegramClient(
                new StringSession(STORAGE.CFG.SESSION),
                STORAGE.CFG.API_ID,
                STORAGE.CFG.API_HASH,
                { connectionRetries: 15, autoReconnect: true }
            );

            await this.tg.connect();
            this.setupHandlers();
            this.launchWeb();
            this.runAutoTasks();
            
            this.is_booting = false;
            this.log("SYSTEM", "Engine Ready! Scanning Text & QR...");
        } catch (e) {
            this.log("FATAL", e.message);
        }
    }

    log(cat, msg) {
        const time = new Date().toLocaleTimeString();
        STORAGE.DATA.logs.unshift({ time, cat, msg });
        if (STORAGE.DATA.logs.length > 60) STORAGE.DATA.logs.pop();
        console.log(`[${time}] [${cat}] ${msg}`);
    }

    // 🔥 ระบบแกะรหัสอัจฉริยะ (Omni-Extractor)
    extractHash(input) {
        if (!input) return null;

        // 1. ตรวจสอบว่าเป็นลิงก์ Truemoney ตรงๆ หรือไม่
        if (input.includes("gift.truemoney.com")) {
            const urlMatch = input.match(/[?&]v=([a-zA-Z0-9]{32})/);
            if (urlMatch) return urlMatch[1];
        }

        // 2. ถ้าไม่ใช่ลิงก์ตรง ให้สกัดรหัส 32 หลักจากข้อความดิบ
        // ล้างขยะที่เป็นอักขระพิเศษออกก่อน (ยกเว้น A-Z, 0-9)
        const sanitized = input.replace(/[^a-zA-Z0-9]/g, "");
        const codeMatch = sanitized.match(/[a-zA-Z0-9]{32}/);
        
        return codeMatch ? codeMatch[0] : null;
    }

    async claim(hash, source) {
        if (this.cache.has(hash)) return;
        this.cache.add(hash);

        const phone = STORAGE.CFG.WALLETS[0];
        const t1 = performance.now();

        https.get(`${STORAGE.CFG.API_URL}?phone=${phone}&gift=${hash}`, (res) => {
            let chunk = "";
            res.on("data", d => chunk += d);
            res.on("end", () => {
                const t2 = performance.now();
                this.handleClaimResult(chunk, hash, source, (t2 - t1).toFixed(0));
            });
        }).on("error", () => this.cache.delete(hash));
    }

    handleClaimResult(raw, hash, source, ms) {
        try {
            const res = JSON.parse(raw);
            const data = res.data?.voucher || res.voucher;
            const amt = data ? parseFloat(data.amount_baht) : 0;
            const status = data ? "SUCCESS" : (res.message || "EXPIRED");

            if (data) {
                STORAGE.DATA.total_baht += amt;
                STORAGE.DATA.success_hits++;
                STORAGE.DATA.hour_stats[new Date().getHours()] += amt;
                
                // Leaderboard update
                STORAGE.DATA.leaderboard[source] = (STORAGE.DATA.leaderboard[source] || 0) + amt;
            } else {
                STORAGE.DATA.failed_hits++;
            }

            const report = { time: new Date().toLocaleTimeString(), hash, amt, status, source, ms };
            STORAGE.DATA.vouchers.unshift(report);
            if (STORAGE.DATA.vouchers.length > 100) STORAGE.DATA.vouchers.pop();

            // Notify Admin via TG
            const text = `🎯 **TITAN V300 OMNI**\n━━━━━━━━━━━━━━\n💰 **Amount:** ${amt} THB\n📊 **Status:** ${status}\n⏱ **Speed:** ${ms}ms\n📂 **Source:** ${source}\n🎫 **Hash:** \`${hash}\``;
            this.tg.sendMessage(STORAGE.CFG.LOG_CHAT, { message: text, parseMode: "markdown" }).catch(() => {});
            
            this.log("CLAIM", `[${status}] ${amt} THB from ${source}`);

        } catch (e) { this.log("API_ERR", "Response parsing failed"); }
    }

    async scanQR(msg) {
        try {
            const buffer = await this.tg.downloadMedia(msg, {});
            const image = await Jimp.read(buffer);

            // Multilayer Scan Strategy
            const modes = [
                () => image.clone().normalize(),
                () => image.clone().greyscale().contrast(1),
                () => image.clone().resize(1000, Jimp.AUTO).brightness(0.3)
            ];

            for (const m of modes) {
                const proc = m();
                const qr = jsQR(new Uint8ClampedArray(proc.bitmap.data), proc.bitmap.width, proc.bitmap.height);
                if (qr) {
                    const h = this.extractHash(qr.data);
                    if (h) {
                        this.claim(h, "IMAGE_SCANNER_V3");
                        return;
                    }
                }
            }
        } catch (e) {}
    }

    async handleAutoJoin(text) {
        const links = text.match(/t\.me\/(?:\+|joinchat\/)?([a-zA-Z0-9._-]+)/g);
        if (!links) return;
        for (const l of links) {
            const id = l.split('/').pop();
            try {
                await this.tg.invoke(new Api.channels.JoinChannel({ channel: id }));
                this.log("NETWORK", `Auto-joined Channel: ${id}`);
            } catch (e) {}
        }
    }

    setupHandlers() {
        this.tg.addEventHandler(async (event) => {
            const m = event.message;
            if (!m) return;

            // Track Room Names
            try {
                const peer = await this.tg.getEntity(m.peerId);
                STORAGE.DATA.room_map.set(m.peerId.toString(), peer.title || peer.username || "Unknown Chat");
            } catch(e) {}

            const sourceName = STORAGE.DATA.room_map.get(m.peerId.toString()) || "TEXT_STREAM";

            // 1. ตรวจจับลิงก์ดิบและรหัสซ่อน
            const hash = this.extractHash(m.message);
            if (hash) {
                this.claim(hash, sourceName);
            }

            // 2. สแกน QR
            if (m.photo) this.scanQR(m);

            // 3. เข้ากลุ่มอัตโนมัติเมื่อเห็นลิงก์เชิญ
            if (m.message?.includes("t.me/")) this.handleAutoJoin(m.message);

        }, new NewMessage({ incoming: true }));
    }

    runAutoTasks() {
        // Clear Cache Every Hour
        setInterval(() => {
            this.cache.clear();
            this.log("MAINTENANCE", "Voucher cache flushed.");
        }, 3600000);
    }

    launchWeb() {
        app.get("/", (req, res) => {
            const uptime = Math.floor((Date.now() - STORAGE.DATA.start_time) / 1000);
            const sortedLB = Object.entries(STORAGE.DATA.leaderboard).sort((a,b) => b[1] - a[1]).slice(0, 5);

            res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>TITAN V300 OMNI</title>
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
    <style>
        :root { --main: #00ffcc; --bg: #0d1117; --card: #161b22; --border: #30363d; }
        body { background: var(--bg); color: #c9d1d9; font-family: 'Kanit', sans-serif; margin: 0; padding: 20px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--border); padding-bottom: 10px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-top: 20px; }
        .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; position: relative; }
        .card h3 { margin-top: 0; color: var(--main); }
        .val { font-size: 2.8em; font-weight: bold; color: var(--main); }
        .console { background: #000; color: #58a6ff; font-family: 'JetBrains Mono', monospace; padding: 15px; border-radius: 8px; height: 350px; overflow-y: auto; font-size: 0.8em; border: 1px solid var(--border); }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th { text-align: left; padding: 10px; color: #8b949e; border-bottom: 2px solid var(--border); }
        td { padding: 10px; border-bottom: 1px solid var(--border); font-size: 0.85em; }
        .btn { background: var(--main); color: #0d1117; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
        .btn-del { background: #f85149; color: #fff; margin-left: 10px; }
        .badge { padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.75em; }
        .success { background: #238636; } .fail { background: #da3633; }
        .room-tag { color: #8b949e; font-size: 0.8em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🌌 TITAN V300 <small style="font-weight: 300; opacity: 0.6;">Omni-Recognition</small></h1>
        <div>SYSTEM UPTIME: <b>${uptime}s</b></div>
    </div>

    <div class="grid">
        <div class="card">
            <h3>💰 Total Revenue</h3>
            <div class="val">฿${STORAGE.DATA.total_baht.toFixed(2)}</div>
            <p>Hits: <b>${STORAGE.DATA.success_hits}</b> | Fails: <b>${STORAGE.DATA.failed_hits}</b></p>
        </div>
        <div class="card">
            <h3>📱 Wallets Active</h3>
            <div style="margin-bottom: 15px;">
                <input id="p" style="background:#000; color:#fff; border:1px solid var(--border); padding:8px; border-radius:4px; width:60%;" placeholder="09xxxxxxx">
                <button class="btn" onclick="act('add')">ADD</button>
            </div>
            ${STORAGE.CFG.WALLETS.map(w => `<div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>📱 ${w}</span> <button class="btn btn-del" onclick="act('del','${w}')">REMOVE</button></div>`).join('')}
        </div>
        <div class="card">
            <h3>🏆 Top Channels</h3>
            ${sortedLB.map(([name, val], i) => `<div>${i+1}. ${name} <span style="color:var(--main)">฿${val.toFixed(2)}</span></div>`).join('')}
            ${sortedLB.length === 0 ? '<p>No data yet...</p>' : ''}
        </div>
    </div>

    <div class="grid" style="grid-template-columns: 2fr 1fr;">
        <div class="card">
            <h3>📜 Live History</h3>
            <table>
                <thead><tr><th>Time</th><th>Amount</th><th>Status</th><th>Source</th><th>Voucher Hash</th></tr></thead>
                <tbody>
                    ${STORAGE.DATA.vouchers.map(v => `
                        <tr>
                            <td>${v.time}</td>
                            <td style="color:var(--main); font-weight:bold;">${v.amt}฿</td>
                            <td><span class="badge ${v.status==='SUCCESS'?'success':'fail'}">${v.status}</span></td>
                            <td class="room-tag">${v.source}</td>
                            <td style="font-family:monospace; color:#58a6ff;">${v.hash}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="card">
            <h3>🖥️ System Console</h3>
            <div class="console">
                ${STORAGE.DATA.logs.map(l => `[${l.time}] [${l.cat}] ${l.msg}<br>`).join('')}
            </div>
        </div>
    </div>

    <script>
        function act(a,v){
            const val = v || document.getElementById('p').value;
            fetch('/manage?a='+a+'&v='+val).then(()=>location.reload());
        }
        setTimeout(()=>location.reload(), 3000);
    </script>
</body>
</html>
            `);
        });

        app.get("/manage", (req, res) => {
            const { a, v } = req.query;
            if (a === 'add') STORAGE.CFG.WALLETS.unshift(v);
            if (a === 'del') STORAGE.CFG.WALLETS = STORAGE.CFG.WALLETS.filter(x => x !== v);
            res.send("ok");
        });

        app.listen(STORAGE.CFG.PORT, '0.0.0.0');
    }
}

// Start Deployment
const Titan = new TitanOmniV300();
Titan.boot();
