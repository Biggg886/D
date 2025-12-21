import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import https from "https";
import express from "express";
import * as JimpModule from "jimp";
import jsQR from "jsqr";
import { performance } from "perf_hooks";
import cron from "node-cron";

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

class TitanAbsolute {
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
        console.log("🚀 TITAN ABSOLUTE V10.0: SYSTEM ONLINE");
    }

    // ระบบคัดกรองลิ้งค์ขั้นสูง (ตรวจโดเมน + ดึงรหัส 32 หลักเต็ม)
    extractHash(text) {
        if (!text) return null;
        
        // ตรวจสอบลิ้งค์ซองของจริง
        if (text.includes("gift.truemoney.com")) {
            const match = text.match(/v=([a-zA-Z0-9]{30,35})/);
            return match ? match[1] : null;
        }
        
        // ตรวจสอบรหัสเพียวๆ 32 หลัก (สำหรับ QR Code)
        const rawMatch = text.match(/\b[a-zA-Z0-9]{32}\b/);
        return rawMatch ? rawMatch[0] : null;
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

        const report = `${emoji} **รายงานตักซอง (V10)**\n━━━━━━━━━━━━━━\n📌 **ผลลัพธ์:** ${status}\n💰 **จำนวน:** ${amount} บาท\n👤 **จาก:** ${owner}\n⏱ **ความเร็ว:** ${duration}ms\n📂 **ที่มา:** ${source}\n🎫 **รหัส:** \`${hash}\``;
        this.client.sendMessage(CONFIG.LOG_GROUP, { message: report, parseMode: "markdown" }).catch(() => {});
    }

    async scanQR(message) {
        try {
            const buffer = await this.client.downloadMedia(message, {});
            if (!buffer) return;
            const img = await Jimp.read(buffer);
            // ปรับแต่งภาพเพื่อให้สแกนติดง่ายขึ้น
            img.greyscale().contrast(0.4).normalize();
            const qr = jsQR(new Uint8ClampedArray(img.bitmap.data), img.bitmap.width, img.bitmap.height);
            if (qr) {
                const h = this.extractHash(qr.data);
                if (h) this.claim(h, "QR Code Scan");
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
            if (h) this.claim(h, "Chat Message");
            
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
            res.send(`
            <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Titan Absolute V10</title>
            <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;500&display=swap" rel="stylesheet">
            <style>
                body { background: #071a0e; color: #ecf0f1; font-family: 'Kanit', sans-serif; margin: 0; }
                .snow { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; }
                .content { position: relative; z-index: 20; max-width: 1100px; margin: auto; padding: 20px; }
                .header { text-align: center; padding: 30px 0; border-bottom: 3px dashed #c41e3a; }
                .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-top: 30px; }
                .card { background: rgba(255,255,255,0.05); border: 1px solid #27ae60; border-radius: 20px; padding: 25px; backdrop-filter: blur(10px); }
                .stat-box { font-size: 2.8em; color: #2ecc71; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th { color: #f1c40f; text-align: left; padding: 12px; border-bottom: 2px solid #c41e3a; }
                td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 0.9em; }
                .input-group { display: flex; gap: 10px; margin-top: 15px; }
                input { background: #111; border: 1px solid #27ae60; color: white; padding: 12px; border-radius: 10px; flex: 1; }
                .btn { cursor: pointer; border: none; padding: 10px 20px; border-radius: 10px; font-weight: bold; }
                .btn-add { background: #27ae60; color: white; }
                .btn-del { background: #c41e3a; color: white; font-size: 0.8em; }
                .badge { background: #c41e3a; padding: 2px 8px; border-radius: 5px; font-size: 0.8em; }
            </style></head>
            <body><canvas class="snow" id="snow"></canvas>
            <div class="content">
                <div class="header"><h1>🎄 TITAN ABSOLUTE V10.0 ❄️</h1><p>ระบบล่าซองอัจฉริยะ (High-Precision Capture)</p></div>
                <div class="grid">
                    <div class="card"><h3>📊 รายได้วันนี้</h3><div class="stat-box">฿ ${this.stats.total.toFixed(2)}</div><p>สำเร็จ <b>${this.stats.count}</b> ครั้ง</p></div>
                    <div class="card"><h3>📱 จัดการเบอร์ Wallet</h3>
                        <div class="input-group"><input type="text" id="phone" placeholder="ใส่เบอร์ใหม่..."><button class="btn btn-add" onclick="control('add')">เพิ่ม</button></div>
                        <div style="margin-top:20px;">${CONFIG.WALLET_PHONES.map(p => `<div style="display:flex;justify-content:space-between;margin-bottom:10px;"><span>• ${p}</span><button class="btn btn-del" onclick="control('del','${p}')">ลบ</button></div>`).join('')}</div>
                    </div>
                </div>
                <div class="card" style="margin-top:20px;"><h3>📜 ประวัติรับซองล่าสุด</h3>
                    <table><thead><tr><th>เวลา</th><th>สถานะ</th><th>ยอด</th><th>รหัส (32 หลัก)</th></tr></thead>
                    <tbody>${this.voucherHistory.map(v => `<tr><td>${v.time}</td><td><span class="${v.status.includes('สำเร็จ') ? '' : 'badge'}">${v.status}</span></td><td style="color:#2ecc71">฿${v.amount}</td><td><code>${v.hash}</code></td></tr>`).join('')}</tbody></table>
                </div>
            </div>
            <script>
                function control(action, phone) {
                    const val = phone || document.getElementById('phone').value;
                    if(!val && action === 'add') return;
                    fetch(\`/manage?action=\${action}&phone=\${val}\`).then(() => location.reload());
                }
                const canvas=document.getElementById('snow'),ctx=canvas.getContext('2d');let flakes=[];
                function init(){canvas.width=window.innerWidth;canvas.height=window.innerHeight;flakes=[];for(let i=0;i<120;i++)flakes.push({x:Math.random()*canvas.width,y:Math.random()*canvas.height,r:Math.random()*3+1,d:Math.random()*1});}
                function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle="white";ctx.beginPath();flakes.forEach(f=>{ctx.moveTo(f.x,f.y);ctx.arc(f.x,f.y,f.r,0,Math.PI*2);f.y+=Math.cos(f.d)+1+f.r/2;if(f.y>canvas.height)f.y=-10;});ctx.fill();requestAnimationFrame(draw);}
                init();draw();window.onresize=init;
            </script></body></html>
            `);
        });

        app.get("/manage", (req, res) => {
            const { action, phone } = req.query;
            if (action === "add" && phone) CONFIG.WALLET_PHONES.unshift(phone);
            if (action === "del" && phone) CONFIG.WALLET_PHONES = CONFIG.WALLET_PHONES.filter(p => p !== phone);
            res.send("ok");
        });

        app.listen(3000, '0.0.0.0', () => console.log("🌐 Dashboard Server: Port 3000 Ready"));
    }
}

const bot = new TitanAbsolute();
bot.start();
