import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import https from "https";
import express from "express";
import * as JimpModule from "jimp";
import jsQR from "jsqr";
import { performance } from "perf_hooks";

const Jimp = JimpModule.Jimp || JimpModule.default || JimpModule;
const app = express();

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

class TitanMasterpiece {
    constructor() {
        this.client = null;
        this.cache = new Set();
        this.voucherHistory = [];
        this.joinHistory = [];
        this.monitoredRooms = new Map();
        this.stats = { total: 0, count: 0 };
    }

    async start() {
        this.client = new TelegramClient(new StringSession(CONFIG.SESSION), CONFIG.API_ID, CONFIG.API_HASH, { connectionRetries: 5 });
        await this.client.connect();
        this.setupHandlers();
        this.startWebServer();
        console.log("💎 TITAN MASTERPIECE V50.0: READY AND ONLINE!");
    }

    // ฟังก์ชันล้างขยะและดึงรหัส 32 หลัก (รองรับ Emoji/ขีด/เว้นวรรค)
    cleanAndExtract(text) {
        if (!text) return null;
        const cleanText = text.replace(/[^\w]/gi, ''); // ลบทุกอย่างที่ไม่ใช่ A-Z, 0-9
        const match = cleanText.match(/[a-zA-Z0-9]{32}/);
        return match ? match[0] : null;
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
        let status = "ล้มเหลว", amount = "0", emoji = "❌";
        try {
            const json = JSON.parse(raw);
            const v = json.data?.voucher || json.voucher;
            if (v) {
                status = "สำเร็จ!"; amount = v.amount_baht; emoji = "🎁";
                this.stats.total += parseFloat(amount);
                this.stats.count++;
            } else { status = json.message || "ซองเต็ม"; }
        } catch (e) { status = "API Error"; }

        this.voucherHistory.unshift({ hash, status, amount, source, time: new Date().toLocaleTimeString() });
        if (this.voucherHistory.length > 50) this.voucherHistory.pop();
        
        this.client.sendMessage(CONFIG.LOG_GROUP, { 
            message: `${emoji} **Titan Report**\n💰 **ยอด:** ${amount}฿ | ${status}\n🎫 **Hash:** \`${hash}\`\n📂 **ที่มา:** ${source}`, 
            parseMode: "markdown" 
        }).catch(() => {});
    }

    async autoJoin(link) {
        try {
            const target = link.split('/').pop().replace('+', '').split('?')[0];
            if (this.joinHistory.find(j => j.target === target)) return;
            await this.client.invoke(new Api.channels.JoinChannel({ channel: target }));
            this.joinHistory.unshift({ target, time: new Date().toLocaleTimeString(), status: "Success" });
        } catch (e) {
            this.joinHistory.unshift({ target: link, time: new Date().toLocaleTimeString(), status: "Failed" });
        }
    }

    setupHandlers() {
        this.client.addEventHandler(async (event) => {
            const msg = event.message;
            if (!msg) return;

            // บันทึกชื่อห้อง
            try {
                const entity = await this.client.getEntity(msg.peerId);
                this.monitoredRooms.set(msg.peerId.toString(), entity.title || entity.username || "Unknown");
            } catch(e) {}

            // ดักจับรหัส (เฉพาะลิ้งค์ TrueMoney เท่านั้น)
            if (msg.message?.includes("truemoney.com")) {
                const h = this.cleanAndExtract(msg.message);
                if (h) this.claim(h, "💬 Chat");
            }

            // สแกน QR
            if (msg.photo) {
                const buffer = await this.client.downloadMedia(msg, {});
                const img = await Jimp.read(buffer);
                const qr = jsQR(new Uint8ClampedArray(img.bitmap.data), img.bitmap.width, img.bitmap.height);
                if (qr) {
                    const hash = this.cleanAndExtract(qr.data);
                    if (hash) this.claim(hash, "📸 QR Scan");
                }
            }

            // เข้ากลุ่มอัตโนมัติ
            if (msg.message?.includes("t.me/")) {
                const links = msg.message.match(/t\.me\/[a-zA-Z0-9_+]+/g);
                if (links) links.forEach(l => this.autoJoin(l));
            }
        }, new NewMessage({ incoming: true }));
    }

    startWebServer() {
        app.get("/", (req, res) => {
            res.send(`
            <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Titan Masterpiece Dashboard</title>
            <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;500&display=swap" rel="stylesheet">
            <style>
                body { background: #0d1117; color: #c9d1d9; font-family: 'Kanit', sans-serif; margin: 0; padding: 20px; }
                .container { max-width: 1200px; margin: auto; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .card { background: #161b22; border: 1px solid #30363d; border-radius: 15px; padding: 20px; margin-bottom: 20px; }
                .stat-value { font-size: 3em; color: #39d353; font-weight: bold; }
                .btn { padding: 10px 15px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; color: white; transition: 0.3s; }
                .btn-add { background: #238636; } .btn-del { background: #da3633; padding: 5px 10px; }
                input { background: #0d1117; border: 1px solid #30363d; color: white; padding: 10px; border-radius: 8px; width: 60%; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th { text-align: left; color: #8b949e; border-bottom: 1px solid #30363d; padding: 10px; }
                td { padding: 12px; border-bottom: 1px solid #21262d; font-size: 0.9em; }
                .room-list { max-height: 200px; overflow-y: auto; font-size: 0.8em; }
            </style></head>
            <body><div class="container">
                <h1 style="color:#58a6ff">💎 TITAN MASTERPIECE V50.0</h1>
                <div class="grid">
                    <div>
                        <div class="card"><h3>📊 ยอดรวมวันนี้</h3><div class="stat-value">฿${this.stats.total.toFixed(2)}</div><p>สำเร็จทั้งหมด ${this.stats.count} ครั้ง</p></div>
                        <div class="card"><h3>📱 จัดการเบอร์ Wallet (เบอร์แรกจะถูกใช้รับเงิน)</h3>
                            <div style="margin-bottom:15px;">
                                <input id="newPhone" placeholder="09xxxxxxx"> <button class="btn btn-add" onclick="control('add')">เพิ่มเบอร์</button>
                            </div>
                            ${CONFIG.WALLET_PHONES.map(p => `
                                <div style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #222;">
                                    <span>📱 ${p}</span> <button class="btn btn-del" onclick="control('del','${p}')">ลบ</button>
                                </div>`).join('')}
                        </div>
                    </div>
                    <div>
                        <div class="card"><h3>📡 ห้องที่กำลัง Monitor (${this.monitoredRooms.size})</h3>
                            <div class="room-list">${Array.from(this.monitoredRooms.values()).map(r => `<div>🟢 ${r}</div>`).join('')}</div>
                        </div>
                        <div class="card"><h3>🔗 ประวัติ Auto Join</h3>
                            <div class="room-list">${this.joinHistory.map(j => `<div>[${j.time}] ${j.target} - <b>${j.status}</b></div>`).join('')}</div>
                        </div>
                    </div>
                </div>
                <div class="card"><h3>📜 ประวัติการรับเงินล่าสุด</h3>
                    <table><thead><tr><th>เวลา</th><th>สถานะ</th><th>จำนวน</th><th>แหล่งที่มา</th><th>รหัส</th></tr></thead>
                    <tbody>${this.voucherHistory.map(v => `<tr><td>${v.time}</td><td>${v.status}</td><td style="color:#39d353">฿${v.amount}</td><td>${v.source}</td><td><code>${v.hash}</code></td></tr>`).join('')}</tbody></table>
                </div>
            </div>
            <script>
                function control(action, phone) {
                    const p = phone || document.getElementById('newPhone').value;
                    if(!p && action === 'add') return;
                    fetch('/manage?action=' + action + '&phone=' + p).then(() => location.reload());
                }
            </script></body></html>
            `);
        });

        app.get("/manage", (req, res) => {
            const { action, phone } = req.query;
            if (action === "add" && phone) CONFIG.WALLET_PHONES.unshift(phone);
            if (action === "del" && phone) CONFIG.WALLET_PHONES = CONFIG.WALLET_PHONES.filter(p => p !== phone);
            res.send("ok");
        });

        app.listen(3000, '0.0.0.0');
    }
}

new TitanMasterpiece().start();
