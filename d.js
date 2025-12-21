/**
 * TITAN V800: OMNI-RECOGNITION & VELOCITY (900+ Lines)
 * ฟีเจอร์: เข้ากลุ่ม/ช่องทุกรูปแบบ | ล้างขยะในลิงก์ 100% | ความเร็วระดับมิลลิวินาที
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
// [ LAYER 1: ADVANCED PERSISTENCE DATABASE ]
// ============================================================
const DB_PATH = './titan_v800_master.json';
let DATA = {
    config: {
        API_ID: 16274927,
        API_HASH: "e1b49b1565a299c2e442626d598718e8",
        SESSION: "1BQANOTEuMTA4LjU2LjE2NgG7syfVfIDQQZn5AYSCH7TCyTcS+3IlGqeYh87iks3MfrERGB/6QtknmID9hp67Hzu+JXLJoF3RgLYP7oWjqEdPxXucRkxnCiD5sWMmc1jhfoZ8aTe+Iitub57/+zfE4q+SVuZ4IpMNOcCcmZZE5B1fTpTo+0s/JrgqpUv4l54CkSv2f+Rucwq69Ib1P/IOhqRtR2lkbm/w6dv8twfIb9M1G+BdtzUYT1RV+kgS6NMfhb75HsrWv5+sPqJUI2AndD5lK+jWTbU+xs9n8aIB+iTE7BssedfERwsqfzG2AilzdmG0KXCDyFmjqPSzGqy8l7Eyc71XKZb9a+lSaZ772fP0Yw==",
        WALLETS: ["0951417365"],
        LOG_CHAT: "-1003647725597",
        API_GATEWAY: "https://api.mystrix2.me/truemoney",
        PORT: 3000
    },
    stats: {
        income: 0,
        success_hits: 0,
        fail_hits: 0,
        hourly: new Array(24).fill(0),
        joined_count: 0
    },
    history: [],
    logs: [],
    known_entities: [] // เก็บรายชื่อกลุ่มที่เคยเข้าแล้ว
};

const persist = () => {
    try { fs.writeFileSync(DB_PATH, JSON.stringify(DATA, null, 2)); } catch (e) {}
};

if (fs.existsSync(DB_PATH)) {
    try {
        const raw = JSON.parse(fs.readFileSync(DB_PATH));
        DATA = { ...DATA, ...raw };
    } catch (e) {}
}

// ============================================================
// [ LAYER 2: HYPER-PURIFICATION & JOIN LOGIC ]
// ============================================================
class OmniEngine {
    /**
     * ดึงรหัสซองและล้างขยะในขั้นตอนเดียว
     */
    static extractVoucher(text) {
        if (!text || !text.includes("gift.truemoney.com")) return null;

        const vIdx = text.indexOf("v=");
        if (vIdx === -1) return null;

        let raw = text.substring(vIdx + 2).split(/\s/)[0];
        
        // Emoji & Symbols Mapping (ลบสติ๊กเกอร์ตัวเลขและสัญลักษณ์)
        const eMap = {'0️⃣':'0','1️⃣':'1','2️⃣':'2','3️⃣':'3','4️⃣':'4','5️⃣':'5','6️⃣':'6','7️⃣':'7','8️⃣':'8','9️⃣':'9'};
        for (const [e, n] of Object.entries(eMap)) {
            raw = raw.split(e).join(n);
        }

        // ลบอักขระแปลกปลอม ➖, |, *, _, ฯลฯ
        return raw.replace(/[^a-zA-Z0-9]/g, "");
    }

    /**
     * ตรวจจับทุกลิงก์ Telegram สำหรับการเข้ากลุ่มอัตโนมัติ
     */
    static parseTelegramLinks(text) {
        const links = { invite: [], public: [] };
        if (!text.includes("t.me/")) return links;

        // ดักลิงก์เชิญ (Private Invite)
        const inviteMatches = text.match(/t\.me\/(\+|joinchat\/)([a-zA-Z0-9_-]+)/g);
        if (inviteMatches) {
            inviteMatches.forEach(l => {
                const hash = l.split('/').pop().replace('+', '');
                links.invite.push(hash);
            });
        }

        // ดักลิงก์ช่อง/กลุ่ม (Public Username)
        const publicMatches = text.match(/t\.me\/([a-zA-Z0-9_]{5,})/g);
        if (publicMatches) {
            publicMatches.forEach(l => {
                const username = l.split('/').pop();
                // กรองคำที่ไม่ใช่ชื่อกลุ่มออก
                if (!['joinchat', 'addstickers', 'proxy'].includes(username.toLowerCase())) {
                    links.public.push(username);
                }
            });
        }
        return links;
    }
}

// ============================================================
// [ LAYER 3: CORE APPLICATION ]
// ============================================================
class TitanV800 {
    constructor() {
        this.tg = null;
        this.cache = new Set();
    }

    async boot() {
        this.log("CORE", "V800 Omni-Velocity Initializing...");
        exec(`fuser -k ${DATA.config.PORT}/tcp`, () => {
            this.startTG();
            this.startWeb();
        });
    }

    async startTG() {
        try {
            this.tg = new TelegramClient(
                new StringSession(DATA.config.SESSION),
                DATA.config.API_ID,
                DATA.config.API_HASH,
                { connectionRetries: 100, autoReconnect: true }
            );
            await this.tg.connect();
            this.setupHandlers();
            this.log("NETWORK", "Titan Cluster: Online and Synchronized");
        } catch (e) { this.log("FATAL", e.message); }
    }

    log(cat, msg) {
        const time = new Date().toLocaleTimeString();
        DATA.logs.unshift({ time, cat, msg });
        if (DATA.logs.length > 100) DATA.logs.pop();
        console.log(`[${time}] [${cat}] ${msg}`);
        persist();
    }

    async claim(hash, source) {
        if (this.cache.has(hash)) return;
        this.cache.add(hash);

        const start = performance.now();
        const api = `${DATA.config.API_GATEWAY}?phone=${DATA.config.WALLETS[0]}&gift=${hash}`;

        https.get(api, (res) => {
            let body = "";
            res.on("data", d => body += d);
            res.on("end", () => {
                const ms = (performance.now() - start).toFixed(0);
                this.handleResult(body, hash, source, ms);
            });
        }).on("error", () => this.cache.delete(hash));
    }

    handleResult(raw, hash, source, ms) {
        try {
            const res = JSON.parse(raw);
            const v = res.data?.voucher || res.voucher;
            const amt = v ? parseFloat(v.amount_baht) : 0;
            const stat = v ? "SUCCESS" : (res.message || "EXPIRED");

            if (v) {
                DATA.stats.income += amt;
                DATA.stats.success_hits++;
                DATA.stats.hourly[new Date().getHours()] += amt;
            } else {
                DATA.stats.fail_hits++;
            }

            DATA.history.unshift({ time: new Date().toLocaleTimeString(), hash, amt, stat, source, ms });
            if (DATA.history.length > 150) DATA.history.pop();

            const alert = `💎 **TITAN V800 OMNI**\n━━━━━━━━━━━━━━\n💰 **Amt:** ${amt} THB\n📊 **Status:** ${stat}\n📂 **Source:** ${source}\n🎫 **ID:** \`${hash}\`\n⏱ **Speed:** ${ms}ms`;
            this.tg.sendMessage(DATA.config.LOG_CHAT, { message: alert, parseMode: "markdown" }).catch(() => {});
            this.log("CLAIM", `${stat} | ${amt}฿ | ${ms}ms`);
        } catch (e) { this.log("API", "Parsing error"); }
    }

    setupHandlers() {
        this.tg.addEventHandler(async (ev) => {
            const m = ev.message;
            if (!m) return;

            const text = m.message || "";

            // 1. VOUCHER RECOGNITION (รับเฉพาะลิงก์ซอง)
            if (text.includes("gift.truemoney.com")) {
                const hash = OmniEngine.extractVoucher(text);
                if (hash) this.claim(hash, "Omni-Stream");
            }

            // 2. UNIFIED AUTO-JOIN (เข้ากลุ่ม/ช่องอัตโนมัติ)
            if (text.includes("t.me/")) {
                const tgLinks = OmniEngine.parseTelegramLinks(text);
                
                // เข้าลิงก์เชิญ (+)
                for (const h of tgLinks.invite) {
                    if (!DATA.known_entities.includes(h)) {
                        this.tg.invoke(new Api.messages.ImportChatInvite({ hash: h }))
                            .then(() => {
                                DATA.known_entities.push(h);
                                DATA.stats.joined_count++;
                                this.log("JOIN", `Joined Private: ${h}`);
                            }).catch(() => {});
                    }
                }

                // เข้าชื่อกลุ่มสาธารณะ (@)
                for (const u of tgLinks.public) {
                    if (!DATA.known_entities.includes(u)) {
                        this.tg.invoke(new Api.channels.JoinChannel({ channel: u }))
                            .then(() => {
                                DATA.known_entities.push(u);
                                DATA.stats.joined_count++;
                                this.log("JOIN", `Joined Public: ${u}`);
                            }).catch(() => {});
                    }
                }
            }

            // 3. IMAGE QR RECOGNITION
            if (m.photo) {
                try {
                    const buf = await this.tg.downloadMedia(m, {});
                    const img = await Jimp.read(buf);
                    const qr = jsQR(new Uint8ClampedArray(img.bitmap.data), img.bitmap.width, img.bitmap.height);
                    if (qr && qr.data.includes("gift.truemoney.com")) {
                        const h = OmniEngine.extractVoucher(qr.data);
                        if (h) this.claim(h, "QR-Detection");
                    }
                } catch (e) {}
            }

        }, new NewMessage({ incoming: true }));
    }

    startWeb() {
        app.get("/", (req, res) => res.send(this.ui()));
        app.get("/api/wallet", (req, res) => {
            const { action, phone } = req.query;
            if (action === 'add') DATA.config.WALLETS.unshift(phone);
            if (action === 'del') DATA.config.WALLETS = DATA.config.WALLETS.filter(p => p !== phone);
            persist();
            res.json({ status: "ok" });
        });
        app.listen(DATA.config.PORT, '0.0.0.0');
    }

    ui() {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>TITAN V800 DASHBOARD</title>
            <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                :root { --p: #00d2ff; --s: #3a7bd5; --bg: #0f172a; --card: #1e293b; --border: #334155; }
                body { background: var(--bg); color: #f8fafc; font-family: 'Kanit', sans-serif; margin: 0; padding: 20px; }
                .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 20px; }
                .card { background: var(--card); border: 1px solid var(--border); border-radius: 24px; padding: 30px; position: relative; overflow: hidden; }
                .card::before { content: ''; position: absolute; top:0; left:0; width:100%; height:4px; background: linear-gradient(to right, var(--p), var(--s)); }
                .val { font-size: 4em; font-weight: 800; background: linear-gradient(to right, var(--p), var(--s)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .console { background: #000; color: #38bdf8; font-family: 'JetBrains Mono', monospace; padding: 20px; border-radius: 16px; height: 350px; overflow-y: auto; font-size: 0.85em; border: 1px solid var(--border); }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { text-align: left; padding: 15px; color: #94a3b8; border-bottom: 2px solid var(--border); }
                td { padding: 15px; border-bottom: 1px solid var(--border); font-size: 0.9em; }
                .btn { background: linear-gradient(to right, var(--p), var(--s)); color: white; border: none; padding: 12px 24px; border-radius: 12px; cursor: pointer; font-weight: 600; }
                .status-SUCCESS { color: #4ade80; font-weight: bold; }
                .status-EXPIRED { color: #f87171; }
            </style>
        </head>
        <body>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:40px;">
                <h1>🌌 TITAN V800 <small style="font-weight:300; opacity:0.6;">Omni-Velocity</small></h1>
                <div>Joined Nodes: <b>${DATA.stats.joined_count}</b> | Load: <b>${os.loadavg()[0]}</b></div>
            </div>

            <div class="grid">
                <div class="card">
                    <h3>💰 Revenue Overview</h3>
                    <div class="val">฿${DATA.stats.income.toFixed(2)}</div>
                    <p>Success: ${DATA.stats.success_hits} | Fails: ${DATA.stats.fail_hits}</p>
                    <canvas id="chart" height="100"></canvas>
                </div>
                <div class="card">
                    <h3>📱 Registered Wallets</h3>
                    <div style="display:flex; gap:10px; margin-bottom:20px;">
                        <input id="w" style="background:#0f172a; border:1px solid #334155; color:white; padding:12px; border-radius:10px; flex:1;" placeholder="09xxxxxxx">
                        <button class="btn" onclick="act('add')">Add</button>
                    </div>
                    ${DATA.config.WALLETS.map(w => `<div style="display:flex; justify-content:space-between; margin-bottom:8px; background:#0f172a; padding:10px; border-radius:8px;"><span>${w}</span> <button style="color:#ef4444; background:none; border:none; cursor:pointer;" onclick="act('del','${w}')">Remove</button></div>`).join('')}
                </div>
            </div>

            <div class="grid" style="grid-template-columns: 2fr 1fr; margin-top:25px;">
                <div class="card">
                    <h3>📜 Hyper-Velocity History</h3>
                    <table>
                        <thead><tr><th>Time</th><th>Amount</th><th>Status</th><th>Source</th><th>Hash</th></tr></thead>
                        <tbody>
                            ${DATA.history.map(h => `
                                <tr>
                                    <td>${h.time}</td>
                                    <td style="color:var(--p); font-weight:bold;">${h.amt}฿</td>
                                    <td class="status-${h.stat}">${h.stat}</td>
                                    <td style="color:#64748b;">${h.source}</td>
                                    <td style="font-family:monospace; color:var(--s);">${h.hash}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="card">
                    <h3>🖥️ System Activity</h3>
                    <div class="console">
                        ${DATA.logs.map(l => `[${l.time}] <span style="color:#6366f1">[${l.cat}]</span> ${l.msg}<br>`).join('')}
                    </div>
                </div>
            </div>

            <script>
                function act(a,v){
                    const val = v || document.getElementById('w').value;
                    fetch('/api/wallet?action='+a+'&phone='+val).then(()=>location.reload());
                }
                const ctx = document.getElementById('chart').getContext('2d');
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: Array.from({length: 24}, (_, i) => i + ':00'),
                        datasets: [{ data: ${JSON.stringify(DATA.stats.hourly)}, borderColor: '#00d2ff', backgroundColor: 'rgba(0,210,255,0.1)', fill: true, tension: 0.4 }]
                    },
                    options: { plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { grid: { display: false } } } }
                });
                setTimeout(()=>location.reload(), 7000);
            </script>
        </body>
        </html>`;
    }
}

new TitanV800().boot();
