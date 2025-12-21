import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import https from "https";
import express from "express"; // เพิ่มระบบเว็บ
import * as JimpModule from "jimp";
import jsQR from "jsqr";
import { performance } from "perf_hooks";
import cron from "node-cron";

const Jimp = JimpModule.default || JimpModule;
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

class TitanChristmasBot {
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
        console.log("🎅 TITAN CHRISTMAS: ระบบออนไลน์แล้วพร้อมหิมะตก!");
    }

    // --- ระบบสแกนและดักซอง ---
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
            } else { status = json.message || "ซองหมดแล้ว"; }
        } catch (e) { status = "API ผิดพลาด"; }

        const item = { hash, status, amount, source, time: new Date().toLocaleTimeString(), owner };
        this.voucherHistory.unshift(item);
        if (this.voucherHistory.length > 50) this.voucherHistory.pop();

        const report = `${emoji} **รายงานการรับซอง**\n━━━━━━━━━━━━━━\n📌 **ผลลัพธ์:** ${status}\n💰 **จำนวน:** ${amount} บาท\n👤 **จาก:** ${owner}\n⏱ **ความเร็ว:** ${duration}ms\n📂 **ที่มา:** ${source}\n🎫 **รหัส:** \`${hash}\``;
        this.client.sendMessage(CONFIG.LOG_GROUP, { message: report, parseMode: "markdown" }).catch(() => {});
    }

    // --- ระบบสแกน QR Code (Improved) ---
    async scanQR(message) {
        try {
            const buffer = await this.client.downloadMedia(message, {});
            const img = await Jimp.read(buffer);
            // เพิ่มการขยายรูปและปรับความคมชัดเบื้องต้นเพื่อให้ jsqr อ่านง่ายขึ้น
            img.contrast(0.2).normalize(); 
            const qr = jsQR(img.bitmap.data, img.bitmap.width, img.bitmap.height);
            if (qr) {
                const h = this.extractHash(qr.data);
                if (h) this.claim(h, "สแกนคิวอาร์โค้ด");
            }
        } catch (e) { console.log("QR Scan Error: " + e.message); }
    }

    async autoJoin(link) {
        try {
            const hash = link.split('/').pop().replace('+', '').split('?')[0];
            if (this.groupHistory.find(g => g.hash === hash)) return;
            await this.client.invoke(new Api.channels.JoinChannel({ channel: hash }));
            this.groupHistory.push({ hash, time: new Date().toLocaleString() });
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
            const report = `🎄 **สรุปยอดของขวัญคริสต์มาส**\n━━━━━━━━━━━━━━\n✅ รับสำเร็จ: ${this.stats.count} ครั้ง\n💰 ยอดรวม: ${this.stats.total.toFixed(2)} บาท\n🌟 สุขสันต์วันคริสต์มาส!`;
            this.client.sendMessage(CONFIG.LOG_GROUP, { message: report }).catch(() => {});
            this.stats = { total: 0, count: 0, startTime: new Date() };
        }, { timezone: "Asia/Bangkok" });
    }

    // --- ระบบเว็บไซต์ Dashboard ---
    startWebServer() {
        app.get("/", (req, res) => {
            res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Titan Christmas Dashboard</title>
                <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;500&display=swap" rel="stylesheet">
                <style>
                    body { background: #0a2e12; color: white; font-family: 'Kanit', sans-serif; margin: 0; overflow-x: hidden; }
                    .snow { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1000; }
                    .container { max-width: 1000px; margin: auto; padding: 20px; text-align: center; position: relative; z-index: 2; }
                    .card { background: rgba(255,255,255,0.1); border-radius: 15px; padding: 20px; margin-bottom: 20px; border: 1px solid #c41e3a; }
                    h1 { color: #d42426; text-shadow: 2px 2px 4px #000; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: left; }
                    th { color: #2ecc71; }
                    .btn { background: #d42426; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; }
                    .btn-del { background: #555; }
                </style>
            </head>
            <body>
                <canvas class="snow" id="snowCanvas"></canvas>
                <div class="container">
                    <h1>🎄 Titan Christmas Dashboard ❄️</h1>
                    <div style="display: flex; gap: 20px; justify-content: center;">
                        <div class="card"><h3>💰 ยอดรวมวันนี้</h3><h2>${this.stats.total.toFixed(2)}</h2></div>
                        <div class="card"><h3>🎁 รับไปแล้ว</h3><h2>${this.stats.count} ซอง</h2></div>
                    </div>
                    
                    <div class="card">
                        <h3>📱 จัดการเบอร์ Wallet</h3>
                        <p>เบอร์ปัจจุบัน: <b>${CONFIG.WALLET_PHONES.join(", ")}</b></p>
                        <input type="text" id="newPhone" placeholder="เบอร์โทรศัพท์" style="padding: 5px;">
                        <button class="btn" onclick="addPhone()">เพิ่มเบอร์</button>
                    </div>

                    <div class="card">
                        <h3>📜 รายการซองล่าสุด</h3>
                        <table>
                            <tr><th>เวลา</th><th>สถานะ</th><th>จำนวน</th><th>เจ้าของ</th></tr>
                            ${this.voucherHistory.map(v => `<tr><td>${v.time}</td><td>${v.status}</td><td>${v.amount}</td><td>${v.owner}</td></tr>`).join('')}
                        </table>
                    </div>

                    <div class="card">
                        <h3>📡 กลุ่มที่เข้าล่าสุด</h3>
                        <div style="text-align: left;">${this.groupHistory.map(g => `• ${g.hash} (${g.time})`).join('<br>')}</div>
                    </div>
                </div>

                <script>
                    function addPhone() {
                        const p = document.getElementById('newPhone').value;
                        if(p) fetch('/add-phone?p='+p).then(() => location.reload());
                    }
                    // Snow Effect
                    const canvas = document.getElementById('snowCanvas');
                    const ctx = canvas.getContext('2d');
                    let particles = [];
                    function initSnow() {
                        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
                        for(let i=0; i<100; i++) particles.push({x: Math.random()*canvas.width, y: Math.random()*canvas.height, r: Math.random()*4+1, d: Math.random()*1});
                    }
                    function drawSnow() {
                        ctx.clearRect(0,0,canvas.width, canvas.height);
                        ctx.fillStyle = "white"; ctx.beginPath();
                        for(let p of particles) {
                            ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2, true);
                            p.y += Math.cos(p.d) + 1 + p.r/2; p.x += Math.sin(p.d) * 2;
                            if(p.y > canvas.height) { p.y = -10; p.x = Math.random()*canvas.width; }
                        }
                        ctx.fill(); requestAnimationFrame(drawSnow);
                    }
                    initSnow(); drawSnow();
                </script>
            </body>
            </html>
            `);
        });

        app.get("/add-phone", (req, res) => {
            const p = req.query.p;
            if (p) CONFIG.WALLET_PHONES.unshift(p);
            res.send("ok");
        });

        app.listen(3000, () => console.log("🎄 เว็บไซต์เปิดที่ http://localhost:3000"));
    }
}

const bot = new TitanChristmasBot();
bot.start();
