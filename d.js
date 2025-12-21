import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import https from "https";
import express from "express";
import * as JimpModule from "jimp";
import jsQR from "jsqr";
import { performance } from "perf_hooks";
import cron from "node-cron";

// ปรับการเรียกใช้ Jimp ให้รองรับ ESM
const Jimp = JimpModule.Jimp || JimpModule.default || JimpModule;

const app = express();
app.use(express.json());

// ==========================================
// [ CONFIGURATION ]
// ==========================================
const CONFIG = {
    API_ID: 16274927,
    API_HASH: "e1b49b1565a299c2e442626d598718e8",
    SESSION: "1BQANOTEuMTA4LjU2LjE2NgG7syfVfIDQQZn5AYSCH7TCyTcS+3IlGqeYh87iks3MfrERGB/6QtknmID9hp67Hzu+JXLJoF3RgLYP7oWjqEdPxXucRkxnCiD5sWMmc1jhfoZ8aTe+Iitub57/+zfE4q+SVuZ4IpMNOcCcmZZE5B1fTpTo+0s/JrgqpUv4l54CkSv2f+Rucwq69Ib1P/IOhqRtR2lkbm/w6dv8twfIb9M1G+BdtzUYT1RV+kgS6NMfhb75HsrWv5+sPqJUI2AndD5lK+jWTbU+xs9n8aIB+iTE7BssedfERwsqfzG2AilzdmG0KXCDyFmjqPSzGqy8l7Eyc71XKZb9a+lSaZ772fP0Yw==",
    WALLET_PHONES: ["0951417365"],
    LOG_GROUP: "-1003647725597",
    API_ENDPOINT: "https://api.mystrix2.me/truemoney"
};

class EvergreenTitan {
    constructor() {
        this.client = null;
        this.cache = new Set();
        this.groupHistory = [];
        this.voucherHistory = [];
        this.stats = { total: 0, count: 0, startTime: new Date() };
    }

    async start() {
        this.client = new TelegramClient(new StringSession(CONFIG.SESSION), CONFIG.API_ID, CONFIG.API_HASH, { connectionRetries: 5 });
        await this.client.connect();
        this.setupHandlers();
        this.setupCron();
        this.startWebServer();
        console.log("🎄 TITAN EVERGREEN V7.0: ระบบออนไลน์สมบูรณ์แบบ!");
    }

    // แก้ไข Regex ใหม่: ดักจับรหัสได้แม่นยำ 32 หลักและไม่โดนตัดหาง
    extractHash(text) {
        if (!text) return null;
        // ดึงจากลิ้งค์ตรงๆ (รองรับรหัสยาว 20-35 ตัวอักษร)
        const match = text.match(/v=([a-zA-Z0-9]{20,35})/) || text.match(/[a-zA-Z0-9]{32}/);
        return match ? (match[1] || match[0]) : null;
    }

    async claim(hash, source) {
        if (!hash || this.cache.has(hash)) return;
        this.cache.add(hash);
        const startTime = performance.now();
        const phone = CONFIG.WALLET_PHONES[0];

        https.get(`${CONFIG.API_ENDPOINT}?phone=${phone}&gift=${hash}`, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                const duration = (performance.now() - startTime).toFixed(2);
                this.processResult(data, hash, source, duration);
            });
        }).on("error", () => this.cache.delete(hash));
    }

    processResult(raw, hash, source, duration) {
        let emoji = "❌", status = "ล้มเหลว", amount = "0", owner = "ไม่ระบุ";
        try {
            const json = JSON.parse(raw);
            const v = json.data?.voucher || json.voucher;
            if (v) {
                emoji = "🎁"; status = "สำเร็จ!"; 
                amount = v.amount_baht;
                owner = json.data?.owner_profile?.full_name || "คนใจดี";
                this.stats.total += parseFloat(amount);
                this.stats.count++;
            } else { status = json.message || "ซองเต็ม/หมด"; }
        } catch (e) { status = "API Error"; }

        this.voucherHistory.unshift({ hash, status, amount, source, time: new Date().toLocaleTimeString(), owner });
        if (this.voucherHistory.length > 30) this.voucherHistory.pop();

        const report = `${emoji} **รายงานตักซอง**\n━━━━━━━━━━━━━━\n📌 **ผลลัพธ์:** ${status}\n💰 **จำนวน:** ${amount} บาท\n👤 **จาก:** ${owner}\n⏱ **ความเร็ว:** ${duration}ms\n📂 **ที่มา:** ${source}\n🎫 **รหัส:** \`${hash}\``;
        this.client.sendMessage(CONFIG.LOG_GROUP, { message: report, parseMode: "markdown" }).catch(() => {});
    }

    async scanQR(message) {
        try {
            const buffer = await this.client.downloadMedia(message, {});
            if (!buffer) return;
            const img = await Jimp.read(buffer);
            img.greyscale().contrast(0.4).normalize();
            
            const qr = jsQR(new Uint8ClampedArray(img.bitmap.data), img.bitmap.width, img.bitmap.height);
            if (qr) {
                const h = this.extractHash(qr.data);
                if (h) this.claim(h, "สแกน QR Code");
            }
        } catch (e) { console.log("QR Scan Error"); }
    }

    async autoJoin(link) {
        try {
            const hash = link.split('/').pop().replace('+', '').split('?')[0];
            if (this.groupHistory.find(g => g.hash === hash)) return;
            await this.client.invoke(new Api.channels.JoinChannel({ channel: hash }));
            this.groupHistory.unshift({ hash, time: new Date().toLocaleTimeString() });
            if (this.groupHistory.length > 10) this.groupHistory.pop();
        } catch (e) {}
    }

    setupHandlers() {
        this.client.addEventHandler(async (event) => {
            const msg = event.message;
            if (!msg || !msg.message) return;
            const h = this.extractHash(msg.message);
            if (h) this.claim(h, "ข้อความแชท");
            if (msg.photo) this.scanQR(msg);
            if (msg.message.includes("t.me/")) {
                const links = msg.message.match(/t\.me\/[^\s]+/g);
                if (links) links.forEach(l => this.autoJoin(l));
            }
        }, new NewMessage({ incoming: true }));
    }

    setupCron() {
        cron.schedule("0 7 * * *", () => {
            const report = `🎄 **สรุปยอดของขวัญประจำวัน**\n━━━━━━━━━━━━━━\n✅ สำเร็จ: ${this.stats.count} ครั้ง\n💰 ยอดรวม: ${this.stats.total.toFixed(2)} บาท`;
            this.client.sendMessage(CONFIG.LOG_GROUP, { message: report }).catch(() => {});
            this.stats = { total: 0, count: 0, startTime: new Date() };
        }, { timezone: "Asia/Bangkok" });
    }

    startWebServer() {
        app.get("/", (req, res) => {
            res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Dashboard</title><link href="https://fonts.googleapis.com/css2?family=Kanit&display=swap" rel="stylesheet"><style>body{background:#071a0e;color:#fff;font-family:'Kanit';margin:0;}.content{padding:20px;max-width:1000px;margin:auto;}.card{background:rgba(255,255,255,0.05);border:1px solid #27ae60;padding:20px;border-radius:15px;margin-bottom:20px;}table{width:100%;border-collapse:collapse;}th,td{padding:10px;text-align:left;border-bottom:1px solid #222;}th{color:#f1c40f;}.btn-del{background:#c41e3a;color:#fff;border:none;padding:5px;border-radius:5px;cursor:pointer;}</style></head><body><div class="content"><h1>🎄 Titan Evergreen V7.0</h1><div style="display:flex;gap:15px;"><div class="card"><h3>฿ ยอดรวม</h3><h2>${this.stats.total.toFixed(2)}</h2></div><div class="card"><h3>🎁 จำนวนซอง</h3><h2>${this.stats.count}</h2></div></div><div class="card"><h3>📱 เบอร์ Wallet</h3>${CONFIG.WALLET_PHONES.map(p => `<div>• ${p}</div>`).join('')}</div><div class="card"><h3>📜 ประวัติล่าสุด</h3><table><tr><th>เวลา</th><th>สถานะ</th><th>จำนวน</th><th>รหัส</th></tr>${this.voucherHistory.map(v => `<tr><td>${v.time}</td><td>${v.status}</td><td>${v.amount}</td><td>${v.hash}</td></tr>`).join('')}</table></div></div></body></html>`);
        });

        app.get("/manage", (req, res) => {
            const { action, phone } = req.query;
            if (action === "add" && phone) CONFIG.WALLET_PHONES.unshift(phone);
            if (action === "del" && phone) CONFIG.WALLET_PHONES = CONFIG.WALLET_PHONES.filter(p => p !== phone);
            res.send("ok");
        });

        // แก้ไขให้เข้าจากภายนอกได้ 100%
        app.listen(3000, '0.0.0.0', () => {
            console.log("🌐 Dashboard: http://YOUR_IP:3000");
        });
    }
}

const bot = new EvergreenTitan();
bot.start();
