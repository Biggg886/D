/**
 * TITAN EVERGREEN V60.0: THE GOD MODE
 * ความสามารถ: ดักซองทุกรูปแบบ, ล้างขยะ Emoji, สแกน QR ชั้นสูง, ระบบจัดการเบอร์สมบูรณ์
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

const Jimp = JimpModule.Jimp || JimpModule.default || JimpModule;
const app = express();
app.use(express.json());

// ==========================================
// [ INTERNAL DATABASE & CONFIG ]
// ==========================================
const STATE = {
    CONFIG: {
        API_ID: 16274927,
        API_HASH: "e1b49b1565a299c2e442626d598718e8",
        SESSION: "1BQANOTEuMTA4LjU2LjE2NgG7syfVfIDQQZn5AYSCH7TCyTcS+3IlGqeYh87iks3MfrERGB/6QtknmID9hp67Hzu+JXLJoF3RgLYP7oWjqEdPxXucRkxnCiD5sWMmc1jhfoZ8aTe+Iitub57/+zfE4q+SVuZ4IpMNOcCcmZZE5B1fTpTo+0s/JrgqpUv4l54CkSv2f+Rucwq69Ib1P/IOhqRtR2lkbm/w6dv8twfIb9M1G+BdtzUYT1RV+kgS6NMfhb75HsrWv5+sPqJUI2AndD5lK+jWTbU+xs9n8aIB+iTE7BssedfERwsqfzG2AilzdmG0KXCDyFmjqPSzGqy8l7Eyc71XKZb9a+lSaZ772fP0Yw==",
        WALLET_PHONES: ["0951417365"],
        LOG_GROUP: "-1003647725597",
        API_ENDPOINT: "https://api.mystrix2.me/truemoney"
    },
    STATS: {
        totalEarned: 0,
        successCount: 0,
        failCount: 0,
        qrScanned: 0,
        startTime: new Date(),
        logs: []
    },
    MONITOR: {
        rooms: new Map(),
        joinQueue: [],
        vouchers: []
    }
};

// ==========================================
// [ CORE ENGINE ]
// ==========================================
class TitanGodMode {
    constructor() {
        this.client = null;
        this.cache = new Set();
        this.isProcessing = false;
    }

    async init() {
        this.addLog("System", "Starting God Mode Engine...");
        this.client = new TelegramClient(
            new StringSession(STATE.CONFIG.SESSION),
            STATE.CONFIG.API_ID,
            STATE.CONFIG.API_HASH,
            { connectionRetries: 10, floodSleepThreshold: 60 }
        );

        await this.client.connect();
        this.setupEventHandlers();
        this.runWebServer();
        this.addLog("System", "Engine Online & Web Dashboard Ready on Port 3000");
    }

    addLog(type, msg) {
        const entry = { time: new Date().toLocaleTimeString(), type, msg };
        STATE.STATS.logs.unshift(entry);
        if (STATE.STATS.logs.length > 50) STATE.STATS.logs.pop();
        console.log(`[${entry.time}] [${type}] ${msg}`);
    }

    // ระบบกรองรหัสขั้นเทพ: ทะลวงทุก Emoji และอักขระซ่อนเร้น
    extractVoucher(text) {
        if (!text || !text.includes("truemoney")) return null;
        
        // 1. ล้างอักขระพิเศษที่ไม่ใช่ภาษาอังกฤษและตัวเลขออกทั้งหมด
        const sanitized = text.replace(/[^a-zA-Z0-9]/g, "");
        
        // 2. ดึงรหัส 32 หลัก
        const match = sanitized.match(/[a-zA-Z0-9]{32}/);
        return match ? match[0] : null;
    }

    async claimVoucher(hash, sourceRoom) {
        if (this.cache.has(hash)) return;
        this.cache.add(hash);

        const targetPhone = STATE.CONFIG.WALLET_PHONES[0];
        const start = performance.now();

        https.get(`${STATE.CONFIG.API_ENDPOINT}?phone=${targetPhone}&gift=${hash}`, (res) => {
            let body = "";
            res.on("data", d => body += d);
            res.on("end", () => {
                const end = performance.now();
                this.handleResponse(body, hash, sourceRoom, (end - start).toFixed(0));
            });
        }).on("error", (e) => {
            this.addLog("Error", `API Request Failed: ${e.message}`);
            this.cache.delete(hash);
        });
    }

    handleResponse(raw, hash, room, ms) {
        try {
            const res = JSON.parse(raw);
            const data = res.data?.voucher || res.voucher;
            const amount = data ? parseFloat(data.amount_baht) : 0;
            const status = data ? "SUCCESS" : (res.message || "Full/Error");

            if (data) {
                STATE.STATS.totalEarned += amount;
                STATE.STATS.successCount++;
            } else {
                STATE.STATS.failCount++;
            }

            const report = {
                time: new Date().toLocaleTimeString(),
                hash,
                amount,
                status,
                room,
                ms
            };

            STATE.MONITOR.vouchers.unshift(report);
            if (STATE.MONITOR.vouchers.length > 100) STATE.MONITOR.vouchers.pop();

            // ส่งแจ้งเตือนเข้ากลุ่ม Log
            const tgMsg = `${data ? "🎁" : "❌"} **Voucher Report**\n` +
                          `━━━━━━━━━━━━━━\n` +
                          `💰 **Status:** ${status}\n` +
                          `💵 **Amount:** ${amount} THB\n` +
                          `⏱ **Delay:** ${ms}ms\n` +
                          `📍 **From:** ${room}\n` +
                          `🎫 **Code:** \`${hash}\``;
            
            this.client.sendMessage(STATE.CONFIG.LOG_GROUP, { message: tgMsg, parseMode: "markdown" }).catch(() => {});
            this.addLog("Claim", `Result: ${status} | ${amount} THB | ${ms}ms`);

        } catch (e) {
            this.addLog("Error", "Failed to parse API response");
        }
    }

    async processImage(message) {
        try {
            const buffer = await this.client.downloadMedia(message, {});
            if (!buffer) return;

            const image = await Jimp.read(buffer);
            
            // Loop สแกน 2 รอบ: ปกติ และ เพิ่มความคมชัด
            const scans = [
                image.clone().normalize().greyscale(),
                image.clone().contrast(0.7).invert()
            ];

            for (const img of scans) {
                const qr = jsQR(new Uint8ClampedArray(img.bitmap.data), img.bitmap.width, img.bitmap.height);
                if (qr) {
                    const hash = this.extractVoucher(qr.data) || (qr.data.length === 32 ? qr.data : null);
                    if (hash) {
                        STATE.STATS.qrScanned++;
                        this.claimVoucher(hash, "QR-Code");
                        break;
                    }
                }
            }
        } catch (e) {
            this.addLog("QR-Engine", "Image processing error");
        }
    }

    async autoJoin(link) {
        try {
            const target = link.split('/').pop().replace('+', '').split('?')[0];
            if (STATE.MONITOR.joinQueue.includes(target)) return;

            await this.client.invoke(new Api.channels.JoinChannel({ channel: target }));
            STATE.MONITOR.joinQueue.push(target);
            this.addLog("Network", `Joined: ${target}`);
        } catch (e) {
            this.addLog("Network", `Join Failed: ${link}`);
        }
    }

    setupEventHandlers() {
        this.client.addEventHandler(async (event) => {
            const msg = event.message;
            if (!msg) return;

            // 1. Update Room Tracking
            try {
                const entity = await this.client.getEntity(msg.peerId);
                const title = entity.title || entity.username || "Private/Bot";
                STATE.MONITOR.rooms.set(msg.peerId.toString(), title);
            } catch (e) {}

            // 2. Text Based Capture
            const hash = this.extractVoucher(msg.message);
            if (hash) {
                this.claimVoucher(hash, STATE.MONITOR.rooms.get(msg.peerId.toString()) || "Chat");
            }

            // 3. Image Based Capture (QR)
            if (msg.photo) {
                this.processImage(msg);
            }

            // 4. Auto Join Engine
            if (msg.message?.includes("t.me/")) {
                const links = msg.message.match(/t\.me\/[a-zA-Z0-9_+]+/g);
                if (links) links.forEach(l => this.autoJoin(l));
            }
        }, new NewMessage({ incoming: true }));
    }

    runWebServer() {
        app.get("/", (req, res) => {
            const sysInfo = {
                uptime: Math.floor((new Date() - STATE.STATS.startTime) / 1000),
                ram: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
                cpu: os.loadavg()[0].toFixed(2)
            };

            res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TITAN GOD MODE V60</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Kanit:wght@300;500&display=swap" rel="stylesheet">
    <style>
        :root { --bg: #08090a; --card: #111418; --primary: #00ff88; --danger: #ff4444; --text: #e0e0e0; }
        body { background: var(--bg); color: var(--text); font-family: 'Kanit', sans-serif; margin: 0; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
        header { padding: 15px 30px; background: var(--card); border-bottom: 2px solid #222; display: flex; justify-content: space-between; align-items: center; }
        .main-content { display: grid; grid-template-columns: 350px 1fr 300px; gap: 15px; padding: 15px; flex: 1; overflow: hidden; }
        .panel { background: var(--card); border-radius: 12px; border: 1px solid #222; display: flex; flex-direction: column; overflow: hidden; }
        .panel-header { padding: 12px; background: #1a1f26; font-weight: bold; border-bottom: 1px solid #222; color: var(--primary); font-size: 0.9em; }
        .scroll { flex: 1; overflow-y: auto; padding: 10px; }
        
        .stat-card { background: #1a1f26; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid var(--primary); }
        .stat-val { font-size: 2em; font-weight: bold; color: var(--primary); }
        
        .log-item { font-family: 'JetBrains Mono', monospace; font-size: 0.75em; margin-bottom: 5px; padding: 5px; border-bottom: 1px solid #222; }
        .type-System { color: #3498db; } .type-Claim { color: var(--primary); } .type-Error { color: var(--danger); }
        
        .btn { padding: 8px 12px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold; font-family: 'Kanit'; }
        .btn-add { background: var(--primary); color: #000; } .btn-del { background: var(--danger); color: #fff; font-size: 0.7em; }
        input { background: #000; border: 1px solid #333; color: #fff; padding: 10px; border-radius: 6px; width: calc(100% - 25px); margin-bottom: 10px; }
        
        table { width: 100%; border-collapse: collapse; font-size: 0.8em; }
        th { text-align: left; padding: 8px; color: #666; }
        td { padding: 8px; border-bottom: 1px solid #222; }
        .status-SUCCESS { color: var(--primary); font-weight: bold; }
        .status-Error { color: var(--danger); }
        
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #333; }
    </style>
</head>
<body>
    <header>
        <div style="font-size: 1.5em; font-weight: bold;">⚡ TITAN <span style="color: var(--primary);">V60.0 GOD MODE</span></div>
        <div style="font-size: 0.9em; color: #888;">UPTIME: ${sysInfo.uptime}s | RAM: ${sysInfo.ram}MB | CPU: ${sysInfo.cpu}%</div>
    </header>

    <div class="main-content">
        <div class="panel">
            <div class="panel-header">WALLET & CONTROLS</div>
            <div class="scroll">
                <div class="stat-card"><div class="stat-val">฿${STATE.STATS.totalEarned.toFixed(2)}</div><div>TOTAL EARNED</div></div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div class="stat-card" style="border-color: #3498db;"><div style="font-size: 1.2em;">${STATE.STATS.successCount}</div><small>SUCCESS</small></div>
                    <div class="stat-card" style="border-color: var(--danger);"><div style="font-size: 1.2em;">${STATE.STATS.failCount}</div><small>FAILED</small></div>
                </div>
                
                <h3>📱 WALLET PHONES</h3>
                <input type="text" id="phoneInput" placeholder="09xxxxxxx">
                <button class="btn btn-add" style="width: 100%;" onclick="manage('add')">ADD NEW WALLET</button>
                <div style="margin-top: 15px;">
                    ${STATE.CONFIG.WALLET_PHONES.map(p => `
                        <div style="display: flex; justify-content: space-between; align-items: center; background: #1a1f26; padding: 8px; margin-bottom: 5px; border-radius: 5px;">
                            <span>${p}</span> <button class="btn btn-del" onclick="manage('del','${p}')">REMOVE</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <div class="panel">
            <div class="panel-header">REAL-TIME VOUCHER CAPTURE</div>
            <div class="scroll">
                <table>
                    <thead><tr><th>TIME</th><th>STATUS</th><th>BAHT</th><th>SOURCE</th><th>CODE</th></tr></thead>
                    <tbody>
                        ${STATE.MONITOR.vouchers.map(v => `
                            <tr>
                                <td>${v.time}</td>
                                <td class="status-${v.status.includes('SUCCESS')?'SUCCESS':'Error'}">${v.status}</td>
                                <td>${v.amount}</td>
                                <td style="color: #888;">${v.room.substring(0,10)}</td>
                                <td style="font-family: monospace; font-size: 0.8em; color: var(--primary);">${v.hash.substring(0,6)}...${v.hash.substring(28)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="panel">
            <div class="panel-header">LIVE SYSTEM CONSOLE</div>
            <div class="scroll" style="background: #000;">
                ${STATE.STATS.logs.map(l => `
                    <div class="log-item">
                        <span style="color: #555;">[${l.time}]</span> 
                        <span class="type-${l.type}">[${l.type}]</span> ${l.msg}
                    </div>
                `).join('')}
            </div>
        </div>
    </div>

    <script>
        function manage(act, p) {
            const phone = p || document.getElementById('phoneInput').value;
            if(!phone && act === 'add') return;
            fetch('/manage?act=' + act + '&p=' + phone).then(() => location.reload());
        }
        // Auto refresh every 5 seconds for live data
        setTimeout(() => location.reload(), 5000);
    </script>
</body>
</html>
            `);
        });

        app.get("/manage", (req, res) => {
            const { act, p } = req.query;
            if (act === "add" && p) {
                STATE.CONFIG.WALLET_PHONES.unshift(p);
                this.addLog("Config", `Added Phone: ${p}`);
            }
            if (act === "del" && p) {
                STATE.CONFIG.WALLET_PHONES = STATE.CONFIG.WALLET_PHONES.filter(x => x !== p);
                this.addLog("Config", `Removed Phone: ${p}`);
            }
            res.send("ok");
        });

        app.listen(3000, '0.0.0.0');
    }
}

// Start The Engine
const titan = new TitanGodMode();
titan.init().catch(e => console.error("FATAL ERROR:", e));
