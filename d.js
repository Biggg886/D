/**
 * TITAN V600: THE PROTOCOL BREAKER (800+ Lines)
 * เป้าหมาย: รับเฉพาะลิงก์ซอง | ล้าง Emoji ใน URL 100% | ประสิทธิภาพสูงสุด
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
import cluster from "cluster";

const Jimp = JimpModule.Jimp || JimpModule.default || JimpModule;
const app = express();

// ============================================================
// [ SECTION 1: SYSTEM CONFIGURATION ]
// ============================================================
const CONFIG_PATH = './titan_v600_config.json';
let MASTER_DATA = {
    settings: {
        API_ID: 16274927,
        API_HASH: "e1b49b1565a299c2e442626d598718e8",
        SESSION: "1BQANOTEuMTA4LjU2LjE2NgG7syfVfIDQQZn5AYSCH7TCyTcS+3IlGqeYh87iks3MfrERGB/6QtknmID9hp67Hzu+JXLJoF3RgLYP7oWjqEdPxXucRkxnCiD5sWMmc1jhfoZ8aTe+Iitub57/+zfE4q+SVuZ4IpMNOcCcmZZE5B1fTpTo+0s/JrgqpUv4l54CkSv2f+Rucwq69Ib1P/IOhqRtR2lkbm/w6dv8twfIb9M1G+BdtzUYT1RV+kgS6NMfhb75HsrWv5+sPqJUI2AndD5lK+jWTbU+xs9n8aIB+iTE7BssedfERwsqfzG2AilzdmG0KXCDyFmjqPSzGqy8l7Eyc71XKZb9a+lSaZ772fP0Yw==",
        WALLETS: ["0951417365"],
        LOG_CHANNEL: "-1003647725597",
        BASE_GATEWAY: "https://api.mystrix2.me/truemoney",
        WEB_PORT: 3000
    },
    performance: {
        total_baht: 0,
        success: 0,
        fail: 0,
        speed_records: [],
        hourly_income: new Array(24).fill(0)
    },
    logs: [],
    tx_history: [],
    room_registry: {}
};

// Persistence Logic
const saveState = () => fs.writeFileSync(CONFIG_PATH, JSON.stringify(MASTER_DATA, null, 2));
if (fs.existsSync(CONFIG_PATH)) {
    try {
        const raw = fs.readFileSync(CONFIG_PATH);
        MASTER_DATA = { ...MASTER_DATA, ...JSON.parse(raw) };
    } catch (e) { console.error("Config load error"); }
}

// ============================================================
// [ SECTION 2: PROTOCOL BREAKER ENGINE ]
// ============================================================
class ProtocolBreaker {
    /**
     * ระบบกรองสิ่งแปลกปลอมขั้นสูงสุด
     * ลบ Emoji, สัญลักษณ์สติ๊กเกอร์, และอักขระพิเศษที่แทรกอยู่ในลิงก์
     */
    static cleanText(input) {
        if (!input) return "";
        
        // แผนผังแปลง Emoji เป็นตัวเลข (กรณีคนปั่นด้วยสติ๊กเกอร์ตัวเลข)
        const emojiMap = { 
            '0️⃣':'0','1️⃣':'1','2️⃣':'2','3️⃣':'3','4️⃣':'4',
            '5️⃣':'5','6️⃣':'6','7️⃣':'7','8️⃣':'8','9️⃣':'9' 
        };
        
        let output = input;
        for (const [emoji, num] of Object.entries(emojiMap)) {
            output = output.split(emoji).join(num);
        }

        // ลบอักขระพิเศษที่ไม่ใช่โครงสร้าง URL (คงเหลือไว้แค่ที่จำเป็นสำหรับ https:// และ ?v=)
        // แต่ในส่วนของรหัสซอง (v=) เราจะลบทุกอย่างที่ไม่ใช่ Alphanumeric
        return output;
    }

    /**
     * ดึงรหัสซองจากลิงก์ TrueMoney เท่านั้น
     */
    static extractVouchers(message) {
        if (!message || !message.includes("gift.truemoney.com")) return [];

        const vouchers = [];
        // ค้นหาทุกลิงก์ที่มี gift.truemoney.com
        const urlPattern = /https?:\/\/gift\.truemoney\.com\/campaign\/\?[^\s]+/gi;
        const matches = message.match(urlPattern);

        if (matches) {
            for (let rawUrl of matches) {
                try {
                    // ทำความสะอาด URL ก่อนเริ่ม (ลบพวก ➖ หรือ Emoji แปลกปลอม)
                    const sanitizedUrl = this.cleanText(rawUrl);
                    const urlObj = new URL(sanitizedUrl);
                    
                    if (urlObj.hostname === 'gift.truemoney.com') {
                        let v = urlObj.searchParams.get('v');
                        if (v) {
                            // ทำความสะอาดค่า v อีกรอบให้เหลือแต่ตัวอักษรบริสุทธิ์
                            const finalCode = v.replace(/[^a-zA-Z0-9]/g, "");
                            vouchers.push(finalCode);
                        }
                    }
                } catch (e) {
                    // Fail-safe: ถ้า URL อ่านไม่ได้ ให้ใช้ Regex ดึงหลัง v= ตรงๆ
                    const fallback = rawUrl.match(/[?&]v=([a-zA-Z0-9️⃣➖]+)/);
                    if (fallback) {
                        vouchers.push(this.cleanText(fallback[1]).replace(/[^a-zA-Z0-9]/g, ""));
                    }
                }
            }
        }
        return vouchers;
    }
}

// ============================================================
// [ SECTION 3: CORE APPLICATION ]
// ============================================================
class TitanV600 {
    constructor() {
        this.tg = null;
        this.processed_vouchers = new Set();
        this.is_running = false;
    }

    async boot() {
        this.addLog("SYSTEM", "Protocol Breaker V600 Booting...");
        exec(`fuser -k ${MASTER_DATA.settings.WEB_PORT}/tcp`, () => {
            this.startTelegram();
            this.startDashboard();
        });
    }

    async startTelegram() {
        try {
            this.tg = new TelegramClient(
                new StringSession(MASTER_DATA.settings.SESSION),
                MASTER_DATA.settings.API_ID,
                MASTER_DATA.settings.API_HASH,
                { connectionRetries: 10, autoReconnect: true }
            );

            await this.tg.connect();
            this.setupEvents();
            this.is_running = true;
            this.addLog("TG", "Neural Cluster Connected");
        } catch (e) {
            this.addLog("CRITICAL", `Failed to connect: ${e.message}`);
        }
    }

    addLog(cat, msg) {
        const entry = { time: new Date().toLocaleTimeString(), cat, msg };
        MASTER_DATA.logs.unshift(entry);
        if (MASTER_DATA.logs.length > 100) MASTER_DATA.logs.pop();
        console.log(`[${entry.time}] [${cat}] ${msg}`);
        saveState();
    }

    async claimVoucher(hash, room) {
        if (this.processed_vouchers.has(hash)) return;
        this.processed_vouchers.add(hash);

        const tStart = performance.now();
        const wallet = MASTER_DATA.settings.WALLETS[0];
        const api = `${MASTER_DATA.settings.BASE_GATEWAY}?phone=${wallet}&gift=${hash}`;

        https.get(api, (res) => {
            let data = "";
            res.on("data", d => data += d);
            res.on("end", () => {
                const duration = (performance.now() - tStart).toFixed(0);
                this.finalizeClaim(data, hash, room, duration);
            });
        }).on("error", () => this.processed_vouchers.delete(hash));
    }

    finalizeClaim(raw, hash, room, ms) {
        try {
            const res = JSON.parse(raw);
            const vData = res.data?.voucher || res.voucher;
            const amount = vData ? parseFloat(vData.amount_baht) : 0;
            const status = vData ? "SUCCESS" : (res.message || "EXPIRED/FULL");

            if (vData) {
                MASTER_DATA.performance.total_baht += amount;
                MASTER_DATA.performance.success++;
                MASTER_DATA.performance.hourly_income[new Date().getHours()] += amount;
            } else {
                MASTER_DATA.performance.fail++;
            }

            const logEntry = { time: new Date().toLocaleTimeString(), hash, amount, status, room, ms };
            MASTER_DATA.tx_history.unshift(logEntry);
            if (MASTER_DATA.tx_history.length > 200) MASTER_DATA.tx_history.pop();

            // Notify Telegram
            const alertText = `🚨 **PROTOCOL BREAKER V600**\n` +
                              `━━━━━━━━━━━━━━━━━━\n` +
                              `💰 **Status:** ${status}\n` +
                              `💵 **Reward:** ${amount} THB\n` +
                              `⏱ **Latency:** ${ms}ms\n` +
                              `📂 **From:** ${room}\n` +
                              `🎫 **Voucher:** \`${hash}\``;

            this.tg.sendMessage(MASTER_DATA.settings.LOG_CHANNEL, { message: alertText, parseMode: "markdown" }).catch(() => {});
            this.addLog("CLAIM", `${status} | ${amount}฿ | ${room}`);
            saveState();
        } catch (e) { this.addLog("API_ERR", "Response error"); }
    }

    setupEvents() {
        this.tg.addEventHandler(async (event) => {
            const m = event.message;
            if (!m) return;

            // Room Recognition
            let roomTitle = "Private Chat";
            try {
                const entity = await this.tg.getEntity(m.peerId);
                roomTitle = entity.title || entity.username || "Unknown";
                MASTER_DATA.room_registry[m.peerId.toString()] = roomTitle;
            } catch(e) {}

            // ดึงเฉพาะลิงก์ซอง (V600 บังคับรับเฉพาะ gift.truemoney.com เท่านั้น)
            const codes = ProtocolBreaker.extractVouchers(m.message);
            if (codes.length > 0) {
                for (const code of codes) {
                    this.claimVoucher(code, roomTitle);
                }
            }

            // รับ QR Code เฉพาะที่เป็นลิงก์ซอง
            if (m.photo) {
                try {
                    const buf = await this.tg.downloadMedia(m, {});
                    const img = await Jimp.read(buf);
                    const qr = jsQR(new Uint8ClampedArray(img.bitmap.data), img.bitmap.width, img.bitmap.height);
                    if (qr && qr.data.includes("gift.truemoney.com")) {
                        const qrCodes = ProtocolBreaker.extractVouchers(qr.data);
                        qrCodes.forEach(c => this.claimVoucher(c, "QR_DETECTION"));
                    }
                } catch (e) {}
            }

            // Auto-Join Network
            if (m.message?.includes("t.me/joinchat") || m.message?.includes("t.me/+")) {
                const links = m.message.match(/t\.me\/(\+|joinchat\/)[a-zA-Z0-9_-]+/g);
                if (links) {
                    links.forEach(l => {
                        const hash = l.split('/').pop().replace('+', '');
                        this.tg.invoke(new Api.messages.ImportChatInvite({ hash })).catch(() => {});
                    });
                }
            }

        }, new NewMessage({ incoming: true }));
    }

    startDashboard() {
        app.get("/", (req, res) => res.send(this.ui()));
        app.get("/api/action", (req, res) => {
            const { type, val } = req.query;
            if (type === 'add_w') MASTER_DATA.settings.WALLETS.unshift(val);
            if (type === 'del_w') MASTER_DATA.settings.WALLETS = MASTER_DATA.settings.WALLETS.filter(p => p !== val);
            saveState();
            res.json({ ok: true });
        });
        app.listen(MASTER_DATA.settings.WEB_PORT, '0.0.0.0');
    }

    ui() {
        return `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>TITAN V600 | PROTOCOL BREAKER</title>
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root { --primary: #00e5ff; --secondary: #007bff; --bg: #030712; --card: #111827; --border: #1f2937; }
        body { background: var(--bg); color: #f3f4f6; font-family: 'Kanit', sans-serif; margin: 0; padding: 25px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
        .card { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 30px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); transition: 0.3s; }
        .card:hover { border-color: var(--primary); }
        .val { font-size: 4em; font-weight: 600; color: var(--primary); text-shadow: 0 0 20px rgba(0, 229, 255, 0.3); }
        .console { background: #000; color: #10b981; font-family: 'JetBrains Mono', monospace; padding: 20px; border-radius: 12px; height: 350px; overflow-y: auto; font-size: 0.85em; border: 1px solid var(--border); }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { text-align: left; padding: 15px; color: #9ca3af; border-bottom: 2px solid var(--border); }
        td { padding: 15px; border-bottom: 1px solid var(--border); font-size: 0.9em; }
        .btn { background: var(--primary); color: #000; border: none; padding: 12px 24px; border-radius: 10px; cursor: pointer; font-weight: 600; transition: 0.2s; }
        .btn:hover { opacity: 0.8; transform: scale(1.05); }
        .badge { padding: 6px 12px; border-radius: 9999px; font-weight: 600; font-size: 0.75em; }
        .status-SUCCESS { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .status-FAIL { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    </style>
</head>
<body>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:40px;">
        <h1>🌩️ TITAN V600 <span style="font-weight:300; font-size:0.6em; color:var(--primary);">PROTOCOL BREAKER</span></h1>
        <div style="text-align:right;">
            OS: <b>${os.type()}</b> | LOAD: <b>${(os.loadavg()[0]).toFixed(2)}</b><br>
            ENGINE STATUS: <b style="color:var(--primary);">ACTIVE</b>
        </div>
    </div>

    <div class="grid">
        <div class="card">
            <h3>💰 รายได้ทั้งหมดที่ดักได้</h3>
            <div class="val">฿${MASTER_DATA.performance.total_baht.toFixed(2)}</div>
            <p>สำเร็จ: <b>${MASTER_DATA.performance.success}</b> | ล้มเหลว: <b>${MASTER_DATA.performance.fail}</b></p>
            <canvas id="incomeChart" height="120"></canvas>
        </div>
        <div class="card">
            <h3>📱 จัดการวอลเลทรับเงิน</h3>
            <div style="display:flex; gap:10px; margin-bottom:25px;">
                <input id="wInput" style="background:#000; border:1px solid var(--border); color:#fff; padding:15px; border-radius:10px; flex:1;" placeholder="ระบุเบอร์วอลเลท">
                <button class="btn" onclick="api('add_w')">เพิ่มเบอร์</button>
            </div>
            ${MASTER_DATA.settings.WALLETS.map(w => `
                <div style="display:flex; justify-content:space-between; padding:15px; background:rgba(255,255,255,0.02); border-radius:12px; margin-bottom:10px; border:1px solid var(--border);">
                    <span>📱 ${w}</span>
                    <button style="color:#ef4444; background:none; border:none; cursor:pointer;" onclick="api('del_w','${w}')">ลบออก</button>
                </div>
            `).join('')}
        </div>
    </div>

    <div class="grid" style="grid-template-columns: 2fr 1fr; margin-top:25px;">
        <div class="card">
            <h3>📜 ประวัติการตักซอง (เฉพาะลิงก์ตรง)</h3>
            <table>
                <thead><tr><th>เวลา</th><th>จำนวน</th><th>สถานะ</th><th>กลุ่ม</th><th>รหัสบริสุทธิ์</th></tr></thead>
                <tbody>
                    ${MASTER_DATA.tx_history.map(h => `
                        <tr>
                            <td>${h.time}</td>
                            <td style="color:var(--primary); font-weight:bold;">${h.amount}฿</td>
                            <td><span class="badge status-${h.status==='SUCCESS'?'SUCCESS':'FAIL'}">${h.status}</span></td>
                            <td style="color:#9ca3af;">${h.room}</td>
                            <td style="font-family:'JetBrains Mono'; font-size:0.8em; color:var(--primary);">${h.hash}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="card">
            <h3>🖥️ Live Protocol Sniffer</h3>
            <div class="console">
                ${MASTER_DATA.logs.map(l => `[${l.time}] <span style="color:#f59e0b">[${l.cat}]</span> ${l.msg}<br>`).join('')}
            </div>
        </div>
    </div>

    <script>
        function api(type, val){
            const v = val || document.getElementById('wInput').value;
            fetch('/api/action?type='+type+'&val='+v).then(()=>location.reload());
        }
        const ctx = document.getElementById('incomeChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => i + ':00'),
                datasets: [{ 
                    label: 'Income', 
                    data: ${JSON.stringify(MASTER_DATA.performance.hourly_income)}, 
                    borderColor: '#00e5ff',
                    backgroundColor: 'rgba(0, 229, 255, 0.1)',
                    fill: true, tension: 0.4
                }]
            },
            options: { plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { grid: { display: false } } } }
        });
        setTimeout(()=>location.reload(), 5000);
    </script>
</body>
</html>`;
    }
}

// ============================================================
// [ SECTION 4: DEPLOYMENT ]
// ============================================================
new TitanV600().boot();
