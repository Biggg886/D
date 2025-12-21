import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import https from "https";
import express from "express";
import * as JimpModule from "jimp";
import jsQR from "jsqr";
import { performance } from "perf_hooks";
import cron from "node-cron";

// แก้ไขการดึงฟังก์ชัน Jimp ให้รองรับทุกเวอร์ชัน
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
        console.log("🎄 EVERGREEN TITAN ระบบออนไลน์และพร้อมให้เข้าเว็บจากภายนอกแล้ว!");
    }

    extractHash(text) {
        if (!text) return null;
        const match = text.match(/v=([a-zA-Z0-9]{10,25})/) || text.match(/[a-zA-Z0-9]{18}/);
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
            // แก้ไขส่วน Jimp ให้รองรับทั้งภาพสีและขาวดำ
            const img = await Jimp.read(buffer);
            img.greyscale().contrast(0.4).normalize(); // ปรับ Contrast ให้เข้มขึ้นเพื่อ QR
            
            const qr = jsQR(new Uint8ClampedArray(img.bitmap.data), img.bitmap.width, img.bitmap.height);
            if (qr) {
                const h = this.extractHash(qr.data);
                if (h) this.claim(h, "สแกน QR Code");
            }
        } catch (e) { console.log("QR Scan Error: " + e.message); }
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
            if (!msg) return;
            const h = this.extractHash(msg.message);
            if (h) this.claim(h, "ข้อความแชท");
            if (msg.photo) this.scanQR(msg);
            if (msg.message?.includes("t.me/")) {
                const links = msg.message.match(/t\.me\/[^\s]+/g);
                if (links) links.forEach(l => this.autoJoin(l));
            }
        }, new NewMessage({ incoming: true }));
    }

    setupCron() {
        cron.schedule("0 7 * * *", () => {
            const report = `🎄 **สรุปยอดของขวัญประจำวัน**\n━━━━━━━━━━━━━━\n✅ สำเร็จ: ${this.stats.count} ครั้ง\n💰 ยอดรวม: ${this.stats.total.toFixed(2)} บาท\n🌟 ขอให้มีความสุขในวันคริสต์มาส!`;
            this.client.sendMessage(CONFIG.LOG_GROUP, { message: report }).catch(() => {});
            this.stats = { total: 0, count: 0, startTime: new Date() };
        }, { timezone: "Asia/Bangkok" });
    }

    startWebServer() {
        // Dashboard HTML (เหมือนเดิม)
        app.get("/", (req, res) => {
            res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Titan Evergreen Dashboard</title><link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;500&display=swap" rel="stylesheet"><style>body { background: #071a0e; color: #ecf0f1; font-family: 'Kanit', sans-serif; margin: 0; }.snow { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; }.content { position: relative; z-index: 20; max-width: 1100px; margin: auto; padding: 20px; }.header { text-align: center; padding: 40px 0; border-bottom: 3px dashed #c41e3a; margin-bottom: 30px; }.title { font-size: 2.5em; color: #f1c40f; text-shadow: 2px 2px #c41e3a; }.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }.card { background: rgba(255,255,255,0.05); border: 1px solid #27ae60; border-radius: 20px; padding: 25px; backdrop-filter: blur(5px); }.stat-box { font-size: 2em; color: #2ecc71; font-weight: bold; }table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.9em; }th { color: #f1c40f; text-align: left; padding: 12px; border-bottom: 2px solid #c41e3a; }td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); }.input-group { display: flex; gap: 10px; margin-top: 15px; }input { background: #111; border: 1px solid #27ae60; color: white; padding: 10px; border-radius: 10px; flex: 1; }.btn { cursor: pointer; border: none; padding: 10px 20px; border-radius: 10px; font-weight: bold; transition: 0.3s; }.btn-add { background: #27ae60; color: white; }.btn-del { background: #c41e3a; color: white; font-size: 0.8em; padding: 5px 10px; }.btn:hover { transform: scale(1.05); opacity: 0.9; }.badge { background: #c41e3a; padding: 2px 8px; border-radius: 5px; font-size: 0.8em; }</style></head><body><canvas class="snow" id="snow"></canvas><div class="content"><div class="header"><div class="title">🎄 TITAN EVERGREEN DASHBOARD ❄️</div><p>ระบบล่าซองของขวัญอัตโนมัติ (Christmas Special Edition)</p></div><div class="grid"><div class="card"><h3>📊 สถิติวันนี้</h3><div class="stat-box">฿ ${this.stats.total.toFixed(2)}</div><p>ตักซองสำเร็จไปแล้ว <b>${this.stats.count}</b> ครั้ง</p></div><div class="card"><h3>📱 จัดการ Wallet</h3><div class="input-group"><input type="text" id="phone" placeholder="ระบุเบอร์ใหม่..."><button class="btn btn-add" onclick="control('add')">เพิ่ม</button></div><div style="margin-top: 15px;">${CONFIG.WALLET_PHONES.map((p, i) => `<div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>${i === 0 ? '⭐' : '•'} ${p}</span><button class="btn-del" onclick="control('del', '${p}')">ลบ</button></div>`).join('')}</div></div></div><div class="card" style="margin-top:20px;"><h3>📜 ประวัติการรับล่าสุด (30 รายการ)</h3><table><thead><tr><th>เวลา</th><th>สถานะ</th><th>จำนวน</th><th>แหล่งที่มา</th><th>เจ้าของซอง</th></tr></thead><tbody>${this.voucherHistory.map(v => `<tr><td>${v.time}</td><td><span class="${v.status.includes('สำเร็จ') ? '' : 'badge'}">${v.status}</span></td><td style="color:#2ecc71">฿${v.amount}</td><td>${v.source}</td><td>${v.owner}</td></tr>`).join('')}</tbody></table></div><div class="card" style="margin-top:20px;"><h3>📡 กลุ่มที่กระโดดเข้าล่าสุด</h3><div style="display: flex; flex-wrap: wrap; gap: 10px;">${this.groupHistory.map(g => `<span class="card" style="padding: 10px; border-color: #f1c40f;">${g.hash} <br><small>${g.time}</small></span>`).join('')}</div></div></div><script>function control(action, phone) { const val = phone || document.getElementById('phone').value; if(!val && action === 'add') return; fetch(\`/manage?action=\${action}&phone=\${val}\`).then(() => location.reload()); } const canvas = document.getElementById('snow'); const ctx = canvas.getContext('2d'); let flakes = []; function init() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; flakes = []; for(let i=0; i<150; i++) flakes.push({x: Math.random()*canvas.width, y: Math.random()*canvas.height, r: Math.random()*3+1, d: Math.random()*1}); } function draw() { ctx.clearRect(0,0,canvas.width, canvas.height); ctx.fillStyle = "white"; ctx.beginPath(); flakes.forEach(f => { ctx.moveTo(f.x, f.y); ctx.arc(f.x, f.y, f.r, 0, Math.PI*2); f.y += Math.cos(f.d) + 1 + f.r/2; f.x += Math.sin(f.d) * 1; if(f.y > canvas.height) { f.y = -10; f.x = Math.random()*canvas.width; } }); ctx.fill(); requestAnimationFrame(draw); } init(); draw(); window.onresize = init;</script></body></html>`);
        });

        app.get("/manage", (req, res) => {
            const { action, phone } = req.query;
            if (action === "add" && phone) CONFIG.WALLET_PHONES.unshift(phone);
            if (action === "del" && phone) CONFIG.WALLET_PHONES = CONFIG.WALLET_PHONES.filter(p => p !== phone);
            res.send("ok");
        });

        // แก้ไขบรรทัดนี้: เพิ่ม '0.0.0.0' เพื่อเปิดรับไอพีภายนอก
        app.listen(3000, '0.0.0.0', () => {
            console.log("🚀 Web Server พร้อมเข้าถึงจากภายนอกที่พอร์ต 3000");
        });
    }
}

const bot = new EvergreenTitan();
bot.start();
