/**
 * 👑 TITAN V10,000: ETERNAL OMNI-BARRAGE (GOD MODE)
 * 🎄 Special Christmas 2025 - FULL SYSTEM
 * Feature: QR Scanner | Thai Time Precision | Multi-Group Sync
 */

import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import https from "https";
import express from "express";
import { performance } from "perf_hooks";
import fs from "fs";
import { execSync } from "child_process";
import Jimp from "jimp";
import jsQR from "jsqr";

// [ PRE-FLIGHT CHECK ]
try {
    if (!fs.existsSync('./node_modules/jimp')) {
        console.log("📦 Installing dependencies...");
        execSync('npm install jimp jsqr && npm pkg set type="module"');
    }
} catch (e) {}

const app = express();
const DB_PATH = './titan_v10000_god.json';

let DB = {
    config: {
        API_ID: 16274927,
        API_HASH: "e1b49b1565a299c2e442626d598718e8",
        SESSION: "1BQANOTEuMTA4LjU2LjE2NgG7syfVfIDQQZn5AYSCH7TCyTcS+3IlGqeYh87iks3MfrERGB/6QtknmID9hp67Hzu+JXLJoF3RgLYP7oWjqEdPxXucRkxnCiD5sWMmc1jhfoZ8aTe+Iitub57/+zfE4q+SVuZ4IpMNOcCcmZZE5B1fTpTo+0s/JrgqpUv4l54CkSv2f+Rucwq69Ib1P/IOhqRtR2lkbm/w6dv8twfIb9M1G+BdtzUYT1RV+kgS6NMfhb75HsrWv5+sPqJUI2AndD5lK+jWTbU+xs9n8aIB+iTE7BssedfERwsqfzG2AilzdmG0KXCDyFmjqPSzGqy8l7Eyc71XKZb9a+lSaZ772fP0Yw==",
        WALLETS: ["0951417365"],
        LOG_CHAT: "-1003647725597", // เช็ค ID กลุ่มให้ถูกต้อง
        GATEWAY: "https://api.mystrix2.me/truemoney"
    },
    metrics: { total: 0, hits: 0, wallet_stats: {} },
    history: [],
    logs: []
};

if (fs.existsSync(DB_PATH)) Object.assign(DB, JSON.parse(fs.readFileSync(DB_PATH)));
const save = () => fs.writeFileSync(DB_PATH, JSON.stringify(DB, null, 2));

// ============================================================
// [ UTILS: THAI TIME & SCRUBBER ]
// ============================================================
const getThaiTime = () => {
    return new Date().toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false
    }) + "." + new Date().getMilliseconds().toString().padStart(3, '0');
};

class TitanScanner {
    static scrub(text) {
        if (!text || !text.includes("gift.truemoney.com")) return null;
        let code = text.split(/v=|campaign\//)[1]?.split(/[^a-zA-Z0-9]/)[0];
        return code && code.length >= 15 ? code : null;
    }

    static async scanQR(buffer) {
        try {
            const image = await Jimp.read(buffer);
            const qr = jsQR(image.bitmap.data, image.bitmap.width, image.bitmap.height);
            return qr ? this.scrub(qr.data) : null;
        } catch (e) { return null; }
    }
}

// ============================================================
// [ CORE ENGINE ]
// ============================================================
class TitanV10000 {
    constructor() { this.tg = null; this.cache = new Set(); this.port = 3000; }

    async start() {
        console.log(`\n👑 TITAN V10,000 [GOD MODE] ONLINE | ${getThaiTime()}`);
        this.tg = new TelegramClient(new StringSession(DB.config.SESSION), DB.config.API_ID, DB.config.API_HASH, { connectionRetries: 5 });
        await this.tg.connect();

        this.tg.addEventHandler(async (ev) => {
            const m = ev.message;
            if (!m) return;

            let code = null;
            // 1. ตรวจจากข้อความ
            if (m.message) code = TitanScanner.scrub(m.message);
            
            // 2. ตรวจจากรูปภาพ (QR Code)
            if (!code && m.media instanceof Api.MessageMediaPhoto) {
                console.log(`[${getThaiTime()}] 📸 ตรวจพบรูปภาพ กำลังสแกน QR...`);
                const buffer = await this.tg.downloadMedia(m.media);
                code = await TitanScanner.scanQR(buffer);
            }

            if (code && !this.cache.has(code)) {
                this.cache.add(code);
                this.fire(code);
            }
        }, new NewMessage({ incoming: true }));

        this.initWeb();
    }

    async fire(hash) {
        const timeTrigger = getThaiTime();
        console.log(`[${timeTrigger}] ⚡ BARRAGE ACTIVATED: ${hash}`);

        const shots = DB.config.WALLETS.map(phone => {
            return new Promise((res) => {
                const t0 = performance.now();
                https.get(`${DB.config.GATEWAY}?phone=${phone}&gift=${hash}`, (r) => {
                    let d = ""; r.on("data", c => d += c);
                    r.on("end", () => res({ phone, data: d, ms: (performance.now()-t0).toFixed(0) }));
                }).on("error", () => res(null));
            });
        });

        const results = await Promise.allSettled(shots);
        this.handle(results, hash, timeTrigger);
    }

    handle(results, hash, timeTrigger) {
        let win = false;
        let details = "";

        results.forEach(r => {
            if (r.status === 'fulfilled' && r.value) {
                try {
                    const json = JSON.parse(r.value.data);
                    const v = json.data?.voucher || json.voucher;
                    if (v) {
                        const amt = parseFloat(v.amount_baht);
                        DB.metrics.total += amt;
                        DB.metrics.hits++;
                        DB.metrics.wallet_stats[r.value.phone] = (DB.metrics.wallet_stats[r.value.phone] || 0) + amt;
                        win = true;
                        details = `✅ ${r.value.phone} +${amt}฿ (${r.value.ms}ms)`;
                    }
                } catch(e){}
            }
        });

        DB.history.unshift({ time: timeTrigger, code: hash, status: win ? "WIN" : "FAIL", info: details });
        save();

        // ส่งเข้ากลุ่ม LOG
        if (win) {
            const logMsg = `🎁 **TITAN V10,000 HIT!**\n━━━━━━━━━━━━━━\n⏰ เวลาไทย: \`${timeTrigger}\`\n🎫 รหัส: \`${hash}\`\n💰 ผลลัพธ์: ${details}`;
            this.tg.sendMessage(DB.config.LOG_CHAT, { message: logMsg, parseMode: "markdown" }).catch(e => console.error("Log Error:", e.message));
        }
    }

    initWeb() {
        app.get("/", (req, res) => res.send(this.ui()));
        const start = (p) => {
            app.listen(p, () => { this.port = p; console.log(`✅ Dashboard: http://localhost:${p}`); })
               .on('error', (e) => { if (e.code === 'EADDRINUSE') start(p + 1); });
        };
        start(3000);
    }

    ui() {
        return `<html><body style="background:#02040a; color:#e6edf3; font-family:sans-serif; text-align:center; padding:50px;">
                <h1 style="color:#ffd700; font-size:3em;">🎄 TITAN V10,000 GOD MODE 🎅</h1>
                <div style="font-size:5em; color:#ff3e3e; font-weight:bold;">฿${DB.metrics.total.toFixed(2)}</div>
                <div style="margin:20px; font-size:1.5em; color:#00ff88;">[ เวลาไทยปัจจุบัน: ${getThaiTime()} ]</div>
                <div style="background:rgba(255,255,255,0.05); padding:20px; border-radius:15px; display:inline-block; text-align:left; min-width:80%;">
                ${DB.history.map(h => `<div style="border-bottom:1px solid #333; padding:10px;"><b>[${h.time}]</b> <code style="color:#ffd700">${h.code}</code> - <span style="color:${h.status==='WIN'?'#00ff88':'#ff3e3e'}">${h.status}</span> ${h.info}</div>`).join('')}
                </div>
                <script>setInterval(()=>location.reload(), 5000);</script>
                </body></html>`;
    }
}

new TitanV10000().start();
