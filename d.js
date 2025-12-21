import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import https from "https";
import input from "input";
import * as JimpModule from "jimp";
import jsQR from "jsqr";
import { performance } from "perf_hooks";

// แก้ไขปัญหา Jimp Default Export ใน Node.js v20
const Jimp = JimpModule.default || JimpModule;

// ========== [ ABSOLUTE CONFIG ] ==========
const API_ID = 16274927; 
const API_HASH = "e1b49b1565a299c2e442626d598718e8";
const SESSION_STRING = ""; // หากมี Session เดิมให้ใส่ตรงนี้

let WALLET_PHONES = ["0951417365"]; 
const MY_CHAT_ID = "-1003647725597"; 
// =========================================

// สร้าง Agent ที่จูน Socket ระดับ Low-level
const agent = new https.Agent({ 
    keepAlive: true, 
    maxSockets: 20,
    maxFreeSockets: 10,
    scheduling: 'lifo',
    timeout: 30000
});

const cache = new Set();
const groupCache = new Set();
let pIdx = 0;

/**
 * ระบบเข้ากลุ่มอัตโนมัติ (Parallel Task)
 */
async function fastJoin(client, link) {
    try {
        const cleanLink = link.replace(/^(https?:\/\/)?t\.me\//, '').replace('joinchat/', '').replace('+', '').split('?')[0];
        if (groupCache.has(cleanLink) || cleanLink.includes('v=')) return;
        groupCache.add(cleanLink);

        console.log(`📡 กำลังเข้ากลุ่ม: ${cleanLink}`);
        if (link.includes('joinchat/') || link.includes('/+')) {
            await client.invoke(new Api.messages.ImportChatInvite({ hash: cleanLink }));
        } else {
            await client.invoke(new Api.channels.JoinChannel({ channel: cleanLink }));
        }
        console.log(`✅ เข้ากลุ่มสำเร็จ: ${cleanLink}`);
    } catch (e) {
        // เงียบไว้เพื่อไม่ให้ขัดจังหวะการทำงานหลัก
    }
}

/**
 * ฟังก์ชันยิงถล่ม (The Executor)
 */
function atomicClaim(client, hash, source) {
    if (cache.has(hash)) return;
    cache.add(hash);

    const startTime = performance.now();
    const phone = WALLET_PHONES[pIdx++ % WALLET_PHONES.length];
    const payload = `{"mobile":"${phone}","voucher_hash":"${hash}"}`;

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
