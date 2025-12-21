import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import https from "https";
import input from "input";
import * as JimpModule from "jimp";
import jsQR from "jsqr";
import { performance } from "perf_hooks";

const Jimp = JimpModule.default || JimpModule;

// ========== [ CONFIG ] ==========
const API_ID = 16274927; 
const API_HASH = "e1b49b1565a299c2e442626d598718e8";
const SESSION_STRING = ""; 

let WALLET_PHONES = ["0951417365"]; 
const MY_CHAT_ID = "-1003647725597"; 
// ================================

// Extreme Low-Latency Agent
const agent = new https.Agent({ 
    keepAlive: true, 
    maxSockets: 100, // เปิดท่อรอไว้จำนวนมาก
    maxFreeSockets: 50,
    timeout: 10000,
    scheduling: 'lifo' // ใช้ Socket ที่เพิ่งว่างล่าสุดเพื่อความเร็วสูงสุด
});

const cache = new Set();
const groupCache = new Set();

/**
 * Super Fast Claimer (The God Module)
 */
function godClaim(hash, source) {
    if (cache.has(hash)) return;
    cache.add(hash);

    const startTime = performance.now();
    const phone = WALLET_PHONES[0]; // ใช้เบอร์แรกเสมอเพื่อลด overhead การสุ่ม
    const payload = `{"mobile":"${phone}","voucher_hash":"${hash}"}`;

    const req = https.request({
        hostname: 'gift.truemoney.com',
        path: `/campaign/vouchers/${hash}/redeem`,
        method: 'POST',
        agent: agent,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': payload.length,
            'User-Agent': 'T' // สั้นที่สุดเท่าที่เป็นไปได้
        }
    }, (res) => {
        let raw = '';
        res.on('data', d => raw += d);
        res.on('end', () => {
            const diff = (performance.now() - startTime).toFixed(3);
            try {
                const data = JSON.parse(raw);
                if (data.status.code === "SUCCESS") {
                    console.log(`\x1b[32m[${diff}ms] WIN! | ${hash}\x1b[0m`);
                } else {
                    console.log(`\x1b[31m[${diff}ms] ${data.status.message} | ${hash}\x1b[0m`);
                }
            } catch (e) {}
        });
    });

    req.on('error', () => cache.delete(hash));
    req.write(payload);
    req.end();
}

/**
 * Byte-Scanning Algorithm (Faster than Regex)
 */
function fastFind(str) {
    const idx = str.indexOf('v=');
    if (idx === -1) return null;
    let res = "";
    for (let i = idx + 2; i < idx + 20; i++) {
        const c = str.charCodeAt(i);
        if ((c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122)) {
            res += str[i];
        } else break;
    }
    return res.length >= 10 ? res : null;
}

(async () => {
    const client = new TelegramClient(new StringSession(SESSION_STRING), API_ID, API_HASH, {
        connectionRetries: 5,
        useWSServer: true,
        deviceModel: "GOD-MODE-V20"
    });

    await client.start({
        phoneNumber: async () => await input.text("Phone: "),
        password: async () => await input.text("Pass: "),
        phoneCode: async () => await input.text("OTP: "),
    });

    console.log("🔥 GOD MODE ACTIVE | LATENCY OPTIMIZED");

    // Pre-heating: เชื่อมต่อทิ้งไว้เพื่อลด Handshake delay
    setInterval(() => {
        const r = https.request({ hostname: 'gift.truemoney.com', agent: agent, method: 'HEAD' }, res => res.resume());
        r.on('error', () => {});
        r.end();
    }, 5000);

    client.addEventHandler((event) => {
        const msg = event.message;
        if (!msg || !msg.message) return;

        // PATH 1: Direct Text Scanning (0.1ms processing)
        const h = fastFind(msg.message);
        if (h) godClaim(h, "Text");

        // PATH 2: Non-blocking Background Tasks
        setImmediate(() => {
            // Entities Link
            if (msg.entities) {
                for (const e of msg.entities) {
                    if (e.url) {
                        const eh = fastFind(e.url);
                        if (eh) godClaim(eh, "Link");
                        if (e.url.includes('t.me/')) fastJoin(client, e.url);
                    }
                }
            }
            // Inline Buttons
            if (msg.replyMarkup?.rows) {
                for (const r of msg.replyMarkup.rows) {
                    for (const b of r.buttons) {
                        if (b.url) {
                            const bh = fastFind(b.url);
                            if (bh) godClaim(bh, "Button");
                            if (b.url.includes('t.me/')) fastJoin(client, b.url);
                        }
                    }
                }
            }
        });

        // PATH 3: Image QR (Isolated Task)
        if (msg.photo) {
            setImmediate(async () => {
                try {
                    const buf = await client.downloadMedia(msg.photo, {});
                    const img = await Jimp.read(buf);
                    const qr = jsQR(img.bitmap.data, img.bitmap.width, img.bitmap.height);
                    if (qr) {
                        const qh = fastFind(qr.data);
                        if (qh) godClaim(qh, "QR");
                    }
                } catch (e) {}
            });
        }
    }, new NewMessage({ incoming: true }));

    // Auto-Join Function
    async function fastJoin(client, link) {
        const hash = link.split('/').pop().replace('+', '');
        if (groupCache.has(hash)) return;
        groupCache.add(hash);
        try {
            if (link.includes('joinchat/')) {
                await client.invoke(new Api.messages.ImportChatInvite({ hash }));
            } else {
                await client.invoke(new Api.channels.JoinChannel({ channel: hash }));
            }
            console.log(`📡 Joined: ${hash}`);
        } catch (e) {}
    }
})();
    const req = https.request({
        hostname: 'gift.truemoney.com',
        path: `/campaign/vouchers/${hash}/redeem`,
        method: 'POST',
        agent: agent,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': payload.length,
            'User-Agent': 'TMN/1.0',
            'Accept': '*/*'
        }
    }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
            const duration = (performance.now() - startTime).toFixed(3);
            try {
                const data = JSON.parse(raw);
                if (data.status.code === "SUCCESS") {
                    console.log(`🔥 [WIN] ${duration}ms | ${phone} | ${hash}`);
                    const msg = `🎯 **SUCCESS!**\n💰 +${data.data.my_ticket.amount_baht} THB\n📱 ${phone}\n⏱ **${duration} ms**\n📂 ${source}`;
                    client.sendMessage(MY_CHAT_ID, { message: msg, parseMode: 'markdown' }).catch(()=>{});
                } else {
                    console.log(`❌ [${duration}ms] ${data.status.message}`);
                }
            } catch (e) {}
        });
    });

    req.on('error', () => cache.delete(hash));
    req.write(payload);
    req.end();
}

/**
 * ค้นหา Hash แบบ Byte-Scanning
 */
function findHash(str) {
    if (!str) return null;
    const v = str.indexOf('v=');
    if (v === -1) return null;
    
    let res = "";
    for (let i = v + 2; i < v + 18; i++) {
        const c = str.charCodeAt(i);
        if ((c > 47 && c < 58) || (c > 64 && c < 91) || (c > 96 && c < 123)) {
            res += str[i];
        } else if (res.length >= 10) break;
    }
    return res.length >= 10 ? res : null;
}

(async () => {
    const client = new TelegramClient(new StringSession(SESSION_STRING), API_ID, API_HASH, {
        connectionRetries: 10,
        floodSleepThreshold: 0,
        deviceModel: "AbsoluteZero-V20"
    });

    await client.start({
        phoneNumber: async () => await input.text("กรอกเบอร์โทรศัพท์ (เช่น +66812345678): "),
        password: async () => await input.text("กรอก Password (ถ้ามี): "),
        phoneCode: async () => await input.text("กรอก OTP จาก Telegram: "),
    });

    console.log("🌌 THE ABSOLUTE ZERO IS ONLINE | NODE.JS V20");

    client.addEventHandler((event) => {
        const msg = event.message;
        if (!msg || !msg.message) return;

        // 1. ตรวจสอบซองเงิน (ลำดับความสำคัญ 1)
        const h = findHash(msg.message);
        if (h) atomicClaim(client, h, "Direct Text");

        // 2. ตรวจสอบลิงก์กลุ่ม t.me (ลำดับความสำคัญ 2)
        if (msg.message.includes('t.me/')) {
            const links = msg.message.match(/t\.me\/[^\s]+/g);
            if (links) links.forEach(l => setImmediate(() => fastJoin(client, l)));
        }

        // 3. Metadata, Buttons & QR (รันเบื้องหลัง)
        setImmediate(async () => {
            // เช็ค Entities (ลิงก์ซ่อน)
            if (msg.entities) {
                msg.entities.forEach(e => {
                    if (e.url) {
                        const eh = findHash(e.url);
                        if (eh) atomicClaim(client, eh, "Hyperlink");
                        if (e.url.includes('t.me/')) fastJoin(client, e.url);
                    }
                });
            }
            // เช็คปุ่มกด
            if (msg.replyMarkup?.rows) {
                msg.replyMarkup.rows.forEach(r => r.buttons.forEach(b => {
                    if (b.url) {
                        const bh = findHash(b.url);
                        if (bh) atomicClaim(client, bh, "Inline Button");
                        if (b.url.includes('t.me/')) fastJoin(client, b.url);
                    }
                }));
            }
            // เช็ค QR Code ในรูปภาพ
            if (msg.photo) {
                try {
                    const buf = await client.downloadMedia(msg.photo, {});
                    const img = await Jimp.read(buf);
                    const qr = jsQR(img.bitmap.data, img.bitmap.width, img.bitmap.height);
                    if (qr) {
                        const qh = findHash(qr.data);
                        if (qh) atomicClaim(client, qh, "Visual QR");
                        if (qr.data.includes('t.me/')) fastJoin(client, qr.data);
                    }
                } catch (e) {}
            }
        });

    }, new NewMessage({ incoming: true }));

    // ระบบรีโมทจัดการเบอร์
    client.addEventHandler(async (ev) => {
        const text = ev.message.message;
        if (ev.message.senderId?.toString() === MY_CHAT_ID && text?.startsWith('+')) {
            const p = text.trim();
            if (!WALLET_PHONES.includes(p)) {
                WALLET_PHONES.push(p);
                client.sendMessage(MY_CHAT_ID, { message: `✅ เพิ่มเบอร์ ${p} สำเร็จ` });
            }
        }
    }, new NewMessage({ incoming: true, fromUsers: [MY_CHAT_ID] }));

})();
