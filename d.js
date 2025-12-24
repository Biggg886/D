/**
 * TITAN V1400: XMAS BARRAGE EDITION 🎅🎄
 * ฟีเจอร์: แก้รหัสขาดจากอีโมจิ | ยิงทุกเบอร์พร้อมกัน | UI ธีมคริสต์มาส
 */

import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import https from "https";
import express from "express";
import { performance } from "perf_hooks";
import fs from "fs";
import { exec } from "child_process";

const app = express();

// ============================================================
// [ LAYER 1: DATA CORE ]
// ============================================================
const DB_FILE = './titan_v1400_xmas.json';
let DB = {
    config: {
        API_ID: 16274927,
        API_HASH: "e1b49b1565a299c2e442626d598718e8",
        SESSION: "1BQANOTEuMTA4LjU2LjE2NgG7syfVfIDQQZn5AYSCH7TCyTcS+3IlGqeYh87iks3MfrERGB/6QtknmID9hp67Hzu+JXLJoF3RgLYP7oWjqEdPxXucRkxnCiD5sWMmc1jhfoZ8aTe+Iitub57/+zfE4q+SVuZ4IpMNOcCcmZZE5B1fTpTo+0s/JrgqpUv4l54CkSv2f+Rucwq69Ib1P/IOhqRtR2lkbm/w6dv8twfIb9M1G+BdtzUYT1RV+kgS6NMfhb75HsrWv5+sPqJUI2AndD5lK+jWTbU+xs9n8aIB+iTE7BssedfERwsqfzG2AilzdmG0KXCDyFmjqPSzGqy8l7Eyc71XKZb9a+lSaZ772fP0Yw==",
        WALLETS: ["0951417365"], 
        LOG_CHAT: "-1003647725597",
        API_GATEWAY: "https://api.mystrix2.me/truemoney"
    },
    stats: { total: 0, hits: 0, wallet_stats: {} },
    history: [],
    logs: [],
    joined_nodes: []
};

const save = () => fs.writeFileSync(DB_FILE, JSON.stringify(DB, null, 2));
if (fs.existsSync(DB_FILE)) { try { Object.assign(DB, JSON.parse(fs.readFileSync(DB_FILE))); } catch(e){} }

// ============================================================
// [ LAYER 2: ATOMIC STRIPPER (FIX EMOJI) ]
// ============================================================
class XmasEngine {
    static extract(text) {
        if (!text || !text.includes("gift.truemoney.com")) return null;

        // ค้นหาตำแหน่งเริ่มต้นของรหัส
        const markers = ["v=", "campaign/"];
        let startIdx = -1;
        for (let m of markers) {
            if (text.indexOf(m) !== -1) {
                startIdx = text.indexOf(m) + m.length;
                break;
            }
        }
        if (startIdx === -1) return null;

        // กวาดข้อความหลังจากจุดเริ่มมา 150 ตัวอักษร
        let raw = text.substring(startIdx).split(/\s/)[0];

        // 🔥 ATOMIC STRIP: ลบทุกอย่างที่ไม่ใช่ตัวอักษรและตัวเลข (ลบอีโมจิที่คั่นกลางออก 100%)
        let clean = raw.replace(/[^a-zA-Z0-9]/g, "");

        return clean.length >= 20 ? clean : null;
    }
}

// ============================================================
// [ LAYER 3: BARRAGE CORE ]
// ============================================================
class TitanV1400 {
    constructor() { this.tg = null; this.cache = new Set(); }

    async start() {
        this.addLog("SYSTEM", "🎄 Xmas Barrage V1400 Deployment Started...");
        exec(`fuser -k 3000/tcp`, () => {
            this.initTG();
            this.initWeb();
        });
    }

    async initTG() {
        try {
            this.tg = new TelegramClient(new StringSession(DB.config.SESSION), DB.config.API_ID, DB.config.API_HASH, { connectionRetries: 5 });
            await this.tg.connect();
            this.setupHandlers();
            this.addLog("CORE", "Santa's Network Connected");
        } catch (e) { this.addLog("ERR", e.message); }
    }

    addLog(cat, msg) {
        const t = new Date().toLocaleTimeString();
        DB.logs.unshift({ t, cat, msg });
        if (DB.logs.length > 50) DB.logs.pop();
        save();
    }

    async fire(hash, src) {
        if (this.cache.has(hash)) return;
        this.cache.add(hash);

        this.addLog("BARRAGE", `Firing ${DB.config.WALLETS.length} Wallets for ID: ${hash}`);

        const barrage = DB.config.WALLETS.map(phone => {
            return new Promise((res) => {
                const start = performance.now();
                https.get(`${DB.config.API_GATEWAY}?phone=${phone}&gift=${hash}`, (resp) => {
                    let b = "";
                    resp.on("data", c => b += c);
                    resp.on("end", () => res({ phone, body: b, ms: (performance.now()-start).toFixed(0) }));
                }).on("error", () => res(null));
            });
        });

        const results = await Promise.allSettled(barrage);
        this.report(results, hash, src);
    }

    report(results, hash, src) {
        let win = false;
        let detail = "";

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
                        detail = `🎁 ${r.value.phone} รับ ${amt}฿ (${r.value.ms}ms)`;
                    }
                } catch(e){}
            }
        });

        const stat = win ? "SUCCESS" : "MISS/EXPIRED";
        DB.history.unshift({ t: new Date().toLocaleTimeString(), hash, stat, detail });
        if (DB.history.length > 30) DB.history.pop();

        const msg = `🎄 **TITAN V1400 XMAS**\n━━━━━━━━━━━━━━\n🎫 **Code:** \`${hash}\`\n📊 **Status:** ${stat}\n📂 **Source:** ${src}\n💰 **Winner:** ${detail || 'แย่งไม่ทัน'}`;
        this.tg.sendMessage(DB.config.LOG_CHAT, { message: msg, parseMode: "markdown" }).catch(()=>{});
        save();
    }

    setupHandlers() {
        this.tg.addEventHandler(async (ev) => {
            const m = ev.message;
            if (!m || !m.message) return;
            const text = m.message;

            // 1. ดักซอง (Atomic Extraction)
            const code = XmasEngine.extract(text);
            if (code) this.fire(code, "Xmas-Monitor");

            // 2. Auto-Join
            if (text.includes("t.me/")) {
                const links = text.match(/t\.me\/(joinchat\/|\+|)([a-zA-Z0-9_-]{5,})/g);
                if (links) {
                    for (let l of links) {
                        const tag = l.split('/').pop().replace('+', '');
                        if (!DB.joined_nodes.includes(tag)) {
                            this.tg.invoke(new Api.messages.ImportChatInvite({ hash: tag }))
                                .then(() => { DB.joined_nodes.push(tag); this.addLog("JOIN", `Infiltrated: ${tag}`); })
                                .catch(() => {
                                    this.tg.invoke(new Api.channels.JoinChannel({ channel: tag }))
                                        .then(() => { DB.joined_nodes.push(tag); this.addLog("JOIN", `Joined Public: ${tag}`); })
                                        .catch(() => {});
                                });
                        }
                    }
                }
            }
        }, new NewMessage({ incoming: true }));
    }

    initWeb() {
        app.get("/", (req, res) => res.send(this.ui()));
        app.get("/api/ctl", (req, res) => {
            const { a, v } = req.query;
            if (a === 'add') DB.config.WALLETS.push(v);
            if (a === 'del') DB.config.WALLETS = DB.config.WALLETS.filter(x => x !== v);
            save(); res.send("ok");
        });
        app.listen(3000);
    }

    ui() {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>XMAS BARRAGE V1400</title>
            <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;600&display=swap" rel="stylesheet">
            <style>
                :root { --xmas-red: #d42426; --xmas-green: #165b33; --xmas-gold: #f8b229; --bg: #051622; }
                body { background: var(--bg); color: #fff; font-family: 'Kanit', sans-serif; margin: 0; padding: 20px; overflow-x: hidden; }
                .snow { position: fixed; top: 0; left: 0; pointer-events: none; width: 100%; height: 100%; z-index: 100; }
                .card { background: rgba(22, 91, 51, 0.2); border: 2px solid var(--xmas-green); border-radius: 20px; padding: 30px; margin-bottom: 20px; backdrop-filter: blur(10px); }
                .val { font-size: 5em; font-weight: 800; color: var(--xmas-red); text-shadow: 0 0 20px rgba(212,36,38,0.5); }
                .wallet { background: #165b33; padding: 12px; border-radius: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; border: 1px solid var(--xmas-gold); }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 15px; border-bottom: 1px solid var(--xmas-green); text-align: left; }
                button { background: var(--xmas-red); color: white; border: none; padding: 10px 20px; border-radius: 10px; cursor: pointer; font-weight: bold; }
                input { background: #000; border: 1px solid var(--xmas-gold); color: white; padding: 10px; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="snow" id="snow"></div>
            <h1 style="text-align:center; color: var(--xmas-gold);">🎅 TITAN V1400: XMAS BARRAGE 🎄</h1>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                <div class="card">
                    <h3>💰 TOTAL XMAS GIFT</h3>
                    <div class="val">฿${DB.stats.total.toFixed(2)}</div>
                    <p>HITS: ${DB.stats.hits}</p>
                    <div style="margin-top:20px;">
                        <input id="w" placeholder="09xxxxxxx"> <button onclick="ctl('add')">ADD WALLET</button>
                    </div>
                </div>
                <div class="card">
                    <h3>📱 ACTIVE REINDEERS (WALLETS)</h3>
                    ${DB.config.WALLETS.map(w => `<div class="wallet"><span>📱 ${w} (฿${DB.stats.wallet_stats[w] || 0})</span> <button style="background:none;" onclick="ctl('del','${w}')">❌</button></div>`).join('')}
                </div>
            </div>
            <div class="card">
                <h3>📜 BARRAGE SESSIONS</h3>
                <table>
                    <thead><tr><th>TIME</th><th>ID</th><th>STATUS</th><th>DETAIL</th></tr></thead>
                    <tbody>
                        ${DB.history.map(h => `<tr><td>${h.t}</td><td>${h.hash}</td><td style="color:${h.stat==='SUCCESS'?'#4ade80':'#ff4444'}">${h.stat}</td><td>${h.detail}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
            <script>
                function ctl(a,v){ fetch('/api/ctl?a='+a+'&v='+(v||document.getElementById('w').value)).then(()=>location.reload()); }
                // Simple snow effect
                const snow = document.getElementById('snow');
                for(let i=0; i<50; i++) {
                    let s = document.createElement('div');
                    s.innerHTML = '❄';
                    s.style.position = 'absolute';
                    s.style.left = Math.random() * 100 + 'vw';
                    s.style.top = '-20px';
                    s.style.opacity = Math.random();
                    s.style.fontSize = (Math.random() * 20 + 10) + 'px';
                    s.style.transition = 'top ' + (Math.random() * 5 + 5) + 's linear';
                    snow.appendChild(s);
                    setTimeout(() => { s.style.top = '100vh'; }, 100);
                }
                setInterval(()=>location.reload(), 10000);
            </script>
        </body>
        </html>`;
    }
}

new TitanV1400().start();
    
