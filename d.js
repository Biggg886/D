/**
 * TITAN V2000: XMAS QUANTUM BARRAGE 🎄🎅⚡
 * VERSION: 2.0.0 (SPECIAL XMAS EDITION)
 * ฟีเจอร์: ยิงทุกลำกล้องขนาน | แก้รหัสขาด 100% | Dashboard พรีเมียม
 */

import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import https from "https";
import express from "express";
import { performance } from "perf_hooks";
import fs from "fs";

const app = express();

// ============================================================
// [ LAYER 1: DATA CORE ]
// ============================================================
const DB_FILE = './titan_v2000_core.json';
let DB = {
    config: {
        API_ID: 16274927,
        API_HASH: "e1b49b1565a299c2e442626d598718e8",
        SESSION: "1BQANOTEuMTA4LjU2LjE2NgG7syfVfIDQQZn5AYSCH7TCyTcS+3IlGqeYh87iks3MfrERGB/6QtknmID9hp67Hzu+JXLJoF3RgLYP7oWjqEdPxXucRkxnCiD5sWMmc1jhfoZ8aTe+Iitub57/+zfE4q+SVuZ4IpMNOcCcmZZE5B1fTpTo+0s/JrgqpUv4l54CkSv2f+Rucwq69Ib1P/IOhqRtR2lkbm/w6dv8twfIb9M1G+BdtzUYT1RV+kgS6NMfhb75HsrWv5+sPqJUI2AndD5lK+jWTbU+xs9n8aIB+iTE7BssedfERwsqfzG2AilzdmG0KXCDyFmjqPSzGqy8l7Eyc71XKZb9a+lSaZ772fP0Yw==",
        WALLETS: ["0951417365"], // ใส่เบอร์วอเลททั้งหมด
        LOG_CHAT: "-1003647725597",
        GATEWAY: "https://api.mystrix2.me/truemoney"
    },
    stats: { total: 0, hits: 0, wallets: {} },
    history: [],
    logs: []
};

const save = () => fs.writeFileSync(DB_FILE, JSON.stringify(DB, null, 2));
if (fs.existsSync(DB_FILE)) try { Object.assign(DB, JSON.parse(fs.readFileSync(DB_FILE))); } catch(e){}

// ============================================================
// [ LAYER 2: QUANTUM STRIPPER ENGINE ]
// ============================================================
class QuantumEngine {
    static extract(text) {
        if (!text || !text.includes("gift.truemoney.com")) return null;
        let anchor = text.indexOf("v=");
        if (anchor === -1) anchor = text.indexOf("campaign/");
        if (anchor === -1) return null;

        // กวาดข้อความรอบจุดเกิดเหตุ 200 ตัวอักษร
        let slice = text.substring(anchor).split(/\s/)[0];
        
        // 🔥 ลบอักขระพิเศษทุกชนิด (รวม Emoji คั่นกลาง) ให้เหลือแต่ A-Z, 0-9
        let clean = slice.replace(/[^a-zA-Z0-9]/g, "");
        
        // กำจัดคำที่เป็น Anchor
        clean = clean.replace(/^v/, "").replace(/^campaign/, "");
        
        return clean.length >= 15 ? clean : null;
    }
}



// ============================================================
// [ LAYER 3: CORE BARRAGE ]
// ============================================================
class TitanV2000 {
    constructor() { this.tg = null; this.cache = new Set(); }

    async start() {
        console.log("🎄 TITAN V2000 XMAS DEPLOYED!");
        this.tg = new TelegramClient(new StringSession(DB.config.SESSION), DB.config.API_ID, DB.config.API_HASH, { connectionRetries: 10 });
        await this.tg.connect();

        this.tg.addEventHandler(async (ev) => {
            const m = ev.message;
            if (!m || !m.message) return;

            const code = QuantumEngine.extract(m.message);
            if (code && !this.cache.has(code)) {
                this.cache.add(code);
                this.fire(code); // ยิงทันที ไม่รอให้ฟังก์ชันนี้จบ
            }
        }, new NewMessage({ incoming: true }));

        this.initWeb();
    }

    async fire(hash) {
        // 🚀 BARRAGE MODE: ยิงทุกลำกล้องพร้อมกันแบบขนาน (Parallel)
        const requests = DB.config.WALLETS.map(phone => {
            return new Promise((resolve) => {
                const start = performance.now();
                https.get(`${DB.config.GATEWAY}?phone=${phone}&gift=${hash}`, (res) => {
                    let d = "";
                    res.on("data", c => d += c);
                    res.on("end", () => resolve({ phone, data: d, ms: (performance.now()-start).toFixed(0) }));
                }).on("error", () => resolve(null));
            });
        });

        const results = await Promise.allSettled(requests);
        this.handleResults(results, hash);
    }

    handleResults(results, hash) {
        let success = false;
        let winnerInfo = "";

        results.forEach(r => {
            if (r.status === 'fulfilled' && r.value) {
                try {
                    const json = JSON.parse(r.value.data);
                    const v = json.data?.voucher || json.voucher;
                    if (v) {
                        const amt = parseFloat(v.amount_baht);
                        DB.stats.total += amt;
                        DB.stats.hits++;
                        DB.stats.wallets[r.value.phone] = (DB.stats.wallets[r.value.phone] || 0) + amt;
                        success = true;
                        winnerInfo = `✅ ${r.value.phone} (+${amt}฿) ใน ${r.value.ms}ms`;
                    }
                } catch(e){}
            }
        });

        DB.history.unshift({ t: new Date().toLocaleTimeString(), code: hash, stat: success ? "WIN" : "FAIL", detail: winnerInfo });
        if (DB.history.length > 30) DB.history.pop();
        save();

        if (success) {
            this.tg.sendMessage(DB.config.LOG_CHAT, {
                message: `🎁 **XMAS BARRAGE HIT!**\n━━━━━━━━━━━━━━\n🎫 \`${hash}\`\n💰 **Result:** ${winnerInfo}`,
                parseMode: "markdown"
            }).catch(() => {});
        }
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
            <title>TITAN V2000 XMAS</title>
            <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;600&display=swap" rel="stylesheet">
            <style>
                :root { --red: #ff4d4d; --green: #2ecc71; --gold: #f1c40f; --dark: #0a0a0a; }
                body { background: var(--dark); color: #fff; font-family: 'Kanit', sans-serif; margin:0; padding:20px; overflow-x:hidden; }
                .snow { position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:99; }
                .card { background: rgba(255,255,255,0.05); border: 2px solid var(--green); border-radius: 20px; padding:30px; margin-bottom:20px; backdrop-filter:blur(5px); }
                .total { font-size: 6em; font-weight: 800; color: var(--red); text-shadow: 0 0 30px rgba(255,77,77,0.5); }
                .wallet-box { background: var(--green); padding:15px; border-radius:12px; margin:5px; display:inline-block; border: 1px solid var(--gold); }
                table { width:100%; margin-top:20px; border-collapse: collapse; }
                th, td { padding: 15px; border-bottom: 1px solid #333; text-align: left; }
                input { background:#000; border:1px solid var(--gold); color:#fff; padding:10px; border-radius:8px; }
                button { background:var(--red); color:#fff; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; font-weight:bold; }
            </style>
        </head>
        <body>
            <div class="snow"></div>
            <h1 style="text-align:center; color:var(--gold); font-size:3em;">🎄 TITAN V2000: XMAS QUANTUM 🎅</h1>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                <div class="card">
                    <h3>💰 ยอดของขวัญรวม (Total Gifts)</h3>
                    <div class="total">฿${DB.stats.total.toFixed(2)}</div>
                    <p>จำนวนซองที่เก็บได้: ${DB.stats.hits}</p>
                    <div style="margin-top:20px;">
                        <input id="w" placeholder="09xxxxxxx"> <button onclick="ctl('add')">เพิ่มวอลเลท</button>
                    </div>
                </div>
                <div class="card">
                    <h3>📱 กระบอกปืนที่พร้อมยิง (Active Wallets)</h3>
                    ${DB.config.WALLETS.map(w => `<div class="wallet-box">📱 ${w}<br><b>฿${DB.stats.wallets[w] || 0}</b> <span style="cursor:pointer" onclick="ctl('del','${w}')">❌</span></div>`).join('')}
                </div>
            </div>
            <div class="card">
                <h3>📜 ประวัติการยิงขนาน (Quantum History)</h3>
                <table>
                    <thead><tr><th>เวลา</th><th>รหัสซอง</th><th>สถานะ</th><th>ผู้ชนะ</th></tr></thead>
                    <tbody>
                        ${DB.history.map(h => `<tr><td>${h.t}</td><td><code>${h.code}</code></td><td style="color:${h.stat==='WIN'?'#2ecc71':'#ff4d4d'}">${h.stat}</td><td>${h.detail}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
            <script>
                function ctl(a,v){ fetch('/api/ctl?a='+a+'&v='+(v||document.getElementById('w').value)).then(()=>location.reload()); }
                setInterval(()=>location.reload(), 10000);
            </script>
        </body>
        </html>`;
    }
}

new TitanV2000().start();
