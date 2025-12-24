/**
 * 👑 TITAN V50,000: OMEGA SYSTEM (ENDGAME EDITION)
 * 🚀 Features: Auto-Join | QR Scan | Atomic Strip | Cyber-Dashboard
 * 🇹🇭 Timezone: Asia/Bangkok (Precision Mode)
 */

import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import https from "https";
import express from "express";
import { performance } from "perf_hooks";
import fs from "fs";
import { execSync } from "child_process";
import os from "os";

// [ AUTO-INSTALL DEPENDENCIES ]
const required = ['jimp', 'jsqr', 'express', 'telegram', 'input'];
try {
    const missing = required.filter(m => !fs.existsSync(`./node_modules/${m}`));
    if (missing.length > 0) {
        console.log(`📦 Installing System Core: ${missing.join(', ')}...`);
        execSync(`npm install ${missing.join(' ')} && npm pkg set type="module"`, { stdio: 'inherit' });
    }
} catch (e) {}

import Jimp from "jimp";
import jsQR from "jsqr";

const app = express();
const DB_PATH = './titan_v50000_omega.json';

// ============================================================
// [ CORE CONFIGURATION ]
// ============================================================
let DB = {
    config: {
        API_ID: 16274927,
        API_HASH: "e1b49b1565a299c2e442626d598718e8",
        SESSION: "1BQANOTEuMTA4LjU2LjE2NgG7syfVfIDQQZn5AYSCH7TCyTcS+3IlGqeYh87iks3MfrERGB/6QtknmID9hp67Hzu+JXLJoF3RgLYP7oWjqEdPxXucRkxnCiD5sWMmc1jhfoZ8aTe+Iitub57/+zfE4q+SVuZ4IpMNOcCcmZZE5B1fTpTo+0s/JrgqpUv4l54CkSv2f+Rucwq69Ib1P/IOhqRtR2lkbm/w6dv8twfIb9M1G+BdtzUYT1RV+kgS6NMfhb75HsrWv5+sPqJUI2AndD5lK+jWTbU+xs9n8aIB+iTE7BssedfERwsqfzG2AilzdmG0KXCDyFmjqPSzGqy8l7Eyc71XKZb9a+lSaZ772fP0Yw==",
        WALLETS: ["0951417365"], // ใส่เบอร์วอลเลทตรงนี้
        LOG_CHAT: "-1003647725597", // ห้องที่จะให้บอทส่งรายงาน
        GATEWAY: "https://api.mystrix2.me/truemoney"
    },
    stats: { total: 0, hits: 0, wallet_stats: {} },
    logs: [],
    history: []
};

if (fs.existsSync(DB_PATH)) Object.assign(DB, JSON.parse(fs.readFileSync(DB_PATH)));
const save = () => fs.writeFileSync(DB_PATH, JSON.stringify(DB, null, 2));

// ============================================================
// [ SYSTEM UTILITIES ]
// ============================================================
const getTime = () => new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok", hour12: false }) + `.${new Date().getMilliseconds().toString().padStart(3, '0')}`;

class OmegaScanner {
    static clean(text) {
        if (!text || !text.includes("gift.truemoney.com")) return null;
        let raw = text.split(/v=|campaign\//)[1];
        if (!raw) return null;
        return raw.split(/[^a-zA-Z0-9]/)[0]; // Atomic Stripper
    }

    static async scanImage(buffer) {
        try {
            const img = await Jimp.read(buffer);
            const qr = jsQR(img.bitmap.data, img.bitmap.width, img.bitmap.height);
            return qr ? this.clean(qr.data) : null;
        } catch (e) { return null; }
    }
}

// ============================================================
// [ MAIN ENGINE ]
// ============================================================
class TitanV50000 {
    constructor() { this.tg = null; this.cache = new Set(); this.port = 3000; }

    async ignite() {
        console.clear();
        console.log(`\n🚀 TITAN V50,000 OMEGA IGNITED | ${getTime()}`);
        
        this.tg = new TelegramClient(new StringSession(DB.config.SESSION), DB.config.API_ID, DB.config.API_HASH, { connectionRetries: 50 });
        await this.tg.connect();
        
        console.log(`✅ TELEGRAM CONNECTED`);
        this.monitor();
        this.launchDashboard();
    }

    monitor() {
        this.tg.addEventHandler(async (ev) => {
            const m = ev.message;
            if (!m) return;
            const txt = m.message || "";

            // 1. AUTO-JOIN SYSTEM
            if (txt.includes("t.me/") || txt.includes("telegram.me/")) {
                this.handleJoin(txt);
            }

            // 2. VOUCHER SCANNING
            let code = OmegaScanner.clean(txt); // Text Scan
            
            if (!code && m.media instanceof Api.MessageMediaPhoto) { // QR Scan
                const buf = await this.tg.downloadMedia(m.media);
                code = await OmegaScanner.scanImage(buf);
            }

            if (code && !this.cache.has(code)) {
                this.cache.add(code);
                this.fire(code, m.chatId);
            }

        }, new NewMessage({ incoming: true }));
    }

    async handleJoin(text) {
        const matches = text.match(/(?:t|telegram)\.me\/(?:joinchat\/|\+)?([a-zA-Z0-9_-]{3,})/g);
        if (matches) {
            for (let link of matches) {
                try {
                    const hash = link.split('/').pop().replace('+', '');
                    await this.tg.invoke(new Api.messages.ImportChatInvite({ hash }));
                    this.log("JOIN", `Infiltrated Group: ${hash}`);
                } catch(e) {
                    // Try public channel join if private fails
                    try {
                        const hash = link.split('/').pop();
                        await this.tg.invoke(new Api.channels.JoinChannel({ channel: hash }));
                    } catch(ex){}
                }
            }
        }
    }

    async fire(hash, source) {
        const timestamp = getTime();
        this.log("ATTACK", `LOCKED ON TARGET: ${hash}`);

        const barrage = DB.config.WALLETS.map(phone => {
            return new Promise((resolve) => {
                const t0 = performance.now();
                https.get(`${DB.config.GATEWAY}?phone=${phone}&gift=${hash}`, (res) => {
                    let d = ""; res.on("data", c => d += c);
                    res.on("end", () => resolve({ phone, body: d, ms: (performance.now()-t0).toFixed(0) }));
                }).on("error", () => resolve(null));
            });
        });

        const results = await Promise.allSettled(barrage);
        this.analyze(results, hash, timestamp);
    }

    analyze(results, hash, time) {
        let win = false;
        let report = [];

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
                        report.push(`📱 ${r.value.phone} [+${amt}฿] ${r.value.ms}ms`);
                    }
                } catch(e){}
            }
        });

        const status = win ? "SUCCESS" : "FAIL";
        const detailStr = report.join(', ') || "Full / Expired";

        DB.history.unshift({ time, hash, status, detail: detailStr });
        if (DB.history.length > 50) DB.history.pop();
        save();

        if (win) {
            this.tg.sendMessage(DB.config.LOG_CHAT, {
                message: `💎 **TITAN V50,000 VICTORY**\n━━━━━━━━━━━━━━━━━\n⏰ **Time:** \`${time}\`\n🎫 **Code:** \`${hash}\`\n💰 **Loot:**\n${report.join('\n')}`,
                parseMode: "markdown"
            }).catch(()=>{});
        }
    }

    log(cat, msg) {
        const l = `[${getTime()}] [${cat}] ${msg}`;
        console.log(l);
        DB.logs.unshift(l);
        if (DB.logs.length > 30) DB.logs.pop();
    }

    launchDashboard() {
        app.get("/", (req, res) => res.send(this.ui()));
        app.get("/api/ctl", (req, res) => {
             const { a, v } = req.query;
             if (a==='add') DB.config.WALLETS.push(v);
             if (a==='del') DB.config.WALLETS = DB.config.WALLETS.filter(x=>x!==v);
             save(); res.send('ok');
        });

        const findPort = (p) => {
            app.listen(p, () => {
                this.port = p;
                console.log(`🌐 DASHBOARD ONLINE: http://localhost:${p}`);
            }).on('error', (e) => { if(e.code === 'EADDRINUSE') findPort(p+1); });
        };
        findPort(3000);
    }

    ui() {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>TITAN V50000 OMEGA</title>
            <meta charset="UTF-8">
            <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
            <style>
                :root { --neon-blue: #00f3ff; --neon-red: #ff0055; --bg: #050505; --glass: rgba(255,255,255,0.05); }
                body { background: var(--bg); color: #fff; font-family: 'Rajdhani', sans-serif; margin: 0; padding: 20px; overflow-x: hidden; background-image: radial-gradient(circle at 50% 50%, #111 0%, #000 100%); }
                .container { max-width: 1400px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 40px; text-transform: uppercase; letter-spacing: 5px; animation: glow 2s infinite alternate; }
                @keyframes glow { from { text-shadow: 0 0 10px var(--neon-blue); } to { text-shadow: 0 0 20px var(--neon-blue), 0 0 10px white; } }
                
                .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
                .card { background: var(--glass); border: 1px solid #333; border-radius: 15px; padding: 25px; backdrop-filter: blur(10px); box-shadow: 0 0 15px rgba(0,0,0,0.5); position: relative; overflow: hidden; }
                .card::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: linear-gradient(90deg, var(--neon-blue), transparent); }
                
                .big-stat { font-size: 5em; font-weight: 800; color: var(--neon-blue); line-height: 1; margin: 10px 0; }
                .sub-stat { font-family: 'JetBrains Mono', monospace; color: #888; font-size: 0.9em; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-family: 'JetBrains Mono', monospace; font-size: 0.85em; }
                th { text-align: left; color: #888; border-bottom: 1px solid #333; padding: 10px; }
                td { padding: 10px; border-bottom: 1px solid #111; }
                
                .status-win { color: var(--neon-blue); text-shadow: 0 0 5px var(--neon-blue); }
                .status-fail { color: var(--neon-red); }
                
                .logs { height: 300px; overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 0.8em; color: #0f0; background: #000; padding: 15px; border-radius: 10px; border: 1px solid #333; }
                
                input { background: transparent; border: 1px solid var(--neon-blue); color: #fff; padding: 10px; border-radius: 5px; font-family: 'JetBrains Mono'; }
                button { background: var(--neon-blue); color: #000; border: none; padding: 10px 20px; font-weight: bold; cursor: pointer; transition: 0.3s; }
                button:hover { box-shadow: 0 0 15px var(--neon-blue); transform: scale(1.05); }

                /* Live Indicator */
                .live { display: inline-block; width: 10px; height: 10px; background: #0f0; border-radius: 50%; animation: blink 1s infinite; margin-right: 5px; }
                @keyframes blink { 50% { opacity: 0; } }
            </style>
        </head>
        <body>
            <div class="container">
                <h1 class="header">💎 TITAN V50,000 <span style="font-size:0.5em; color:#fff;">OMEGA</span></h1>
                
                <div class="grid">
                    <div class="card">
                        <h3><span class="live"></span> TOTAL EARNINGS</h3>
                        <div class="big-stat">฿${DB.stats.total.toFixed(2)}</div>
                        <div class="sub-stat">Successful Hits: ${DB.stats.hits}</div>
                        <div style="margin-top: 20px;">
                            <input id="w" placeholder="Add Wallet Number">
                            <button onclick="ctl('add')">ADD</button>
                        </div>
                    </div>

                    <div class="card">
                        <h3>🖥 SYSTEM STATUS</h3>
                        <div class="sub-stat">
                            UPTIME: ${(process.uptime()/60).toFixed(2)} MINS<br>
                            RAM: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB<br>
                            OS: ${os.type()} ${os.release()}<br>
                            ACTIVE WALLETS: ${DB.config.WALLETS.length} UNITS
                        </div>
                        <div class="logs" style="margin-top:15px; height: 150px;">
                            ${DB.logs.join('<br>')}
                        </div>
                    </div>

                    <div class="card">
                        <h3>📱 ACTIVE UNITS</h3>
                        <div style="height: 200px; overflow-y: auto;">
                            ${DB.config.WALLETS.map(w => `
                                <div style="display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #222;">
                                    <span>${w}</span>
                                    <span style="color:var(--neon-blue)">฿${DB.stats.wallet_stats[w]||0}</span>
                                    <span style="cursor:pointer; color:var(--neon-red)" onclick="ctl('del','${w}')">[X]</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="card" style="margin-top: 20px;">
                    <h3>📊 BARRAGE HISTORY (REAL-TIME)</h3>
                    <table>
                        <thead>
                            <tr>
                                <th width="15%">TIMESTAMP (TH)</th>
                                <th width="25%">VOUCHER ID</th>
                                <th width="10%">STATUS</th>
                                <th>RESULT DETAILS</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${DB.history.map(h => `
                                <tr>
                                    <td>${h.time}</td>
                                    <td>${h.hash}</td>
                                    <td class="${h.status==='SUCCESS'?'status-win':'status-fail'}">${h.status}</td>
                                    <td>${h.detail}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <script>
                function ctl(a,v){ fetch('/api/ctl?a='+a+'&v='+(v||document.getElementById('w').value)).then(()=>location.reload()); }
                setInterval(() => location.reload(), 5000); // Auto-Refresh Dashboard
            </script>
        </body>
        </html>`;
    }
}

new TitanV50000().ignite();
                                
