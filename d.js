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
const MY_CHAT_ID = "-1003647725597"; // ตรวจสอบว่า ID นี้ถูกต้อง (ต้องมี -100 นำหน้าสำหรับกลุ่ม)
// ================================

const agent = new https.Agent({ 
    keepAlive: true, 
    maxSockets: 100,
    maxFreeSockets: 50,
    timeout: 10000,
    scheduling: 'lifo'
});

const cache = new Set();
const groupCache = new Set();

function godClaim(client, hash, source) {
    if (cache.has(hash)) return;
    cache.add(hash);
    const startTime = performance.now();
    const phone = WALLET_PHONES[0]; 
    const payload = JSON.stringify({ mobile: phone, voucher_hash: hash });
    
    const req = https.request({
        hostname: 'gift.truemoney.com',
        path: `/campaign/vouchers/${hash}/redeem`,
        method: 'POST',
        agent: agent,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'User-Agent': 'TMN/1.0'
        }
    }, (res) => {
        let raw = '';
        res.on('data', d => raw += d);
        res.on('end', () => {
            const diff = (performance.now() - startTime).toFixed(3);
            try {
                const data = JSON.parse(raw);
                if (data.status.code === "SUCCESS") {
                    const amount = data.data.my_ticket.amount_baht;
                    console.log(`\x1b[32m🔥 [WIN] ${diff}ms | ${amount} THB | ${hash}\x1b[0m`);
                    
                    // ส่งข้อมูลไปที่กลุ่มที่ตั้งไว้
                    client.sendMessage(MY_CHAT_ID, { 
                        message: `🎯 **บอทตักซองสำเร็จ!**\n💰 ได้รับเงิน: **${amount}** บาท\n📱 เบอร์ที่ใช้: \`${phone}\`\n⏱ ความเร็ว: **${diff} ms**\n📂 แหล่งที่มา: ${source}`,
                        parseMode: 'markdown' 
                    }).catch(err => console.log(`❌ ส่งแจ้งเตือนไม่สำเร็จ: ${err.message}`));

                } else {
                    console.log(`\x1b[31m❌ [${diff}ms] ${data.status.message} | ${hash}\x1b[0m`);
                }
            } catch (e) {
                console.log("❌ Error Parsing JSON");
            }
        });
    });
    req.on('error', () => cache.delete(hash));
    req.write(payload);
    req.end();
}

function findHash(str) {
    if (!str) return null;
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

async function fastJoin(client, link) {
    try {
        const hash = link.split('/').pop().replace('+', '').split('?')[0];
        if (groupCache.has(hash) || hash.includes('v=')) return;
        groupCache.add(hash);
        if (link.includes('joinchat/') || link.includes('/+')) {
            await client.invoke(new Api.messages.ImportChatInvite({ hash }));
        } else {
            await client.invoke(new Api.channels.JoinChannel({ channel: hash }));
        }
        console.log(`📡 เข้ากลุ่มสำเร็จ: ${hash}`);
    } catch (e) {}
}

(async () => {
    const client = new TelegramClient(new StringSession(SESSION_STRING), API_ID, API_HASH, {
        connectionRetries: 10,
        deviceModel: "GOD-MODE-V20"
    });

    await client.start({
        phoneNumber: async () => await input.text("กรอกเบอร์ (Phone): "),
        password: async () => await input.text("รหัสผ่าน (ถ้ามี): "),
        phoneCode: async () => await input.text("OTP: "),
    });

    console.log("🌌 THE ABSOLUTE ZERO: ONLINE & READY");

    // ตรวจสอบสิทธิในกลุ่มแจ้งเตือนตอนเริ่มรัน
    try {
        await client.getEntity(MY_CHAT_ID);
        console.log("✅ ตรวจพบกลุ่มแจ้งเตือน: พร้อมส่งข้อมูล");
    } catch (e) {
        console.log("⚠️ คำเตือน: หา ID กลุ่มแจ้งเตือนไม่เจอ บอทอาจจะไม่ส่งข้อมูลไปกลุ่ม");
    }

    client.addEventHandler((event) => {
        const msg = event.message;
        if (!msg || !msg.message) return;

        // 1. ตักซองจากข้อความ (เร็วที่สุด)
        const h = findHash(msg.message);
        if (h) godClaim(client, h, "ข้อความตรง");

        // 2. สแกนลิงก์/ปุ่ม/เข้ากลุ่ม (Background)
        setImmediate(() => {
            if (msg.message.includes('t.me/')) {
                const links = msg.message.match(/t\.me\/[^\s]+/g);
                if (links) links.forEach(l => fastJoin(client, l));
            }
            if (msg.entities) {
                msg.entities.forEach(e => {
                    if (e.url) {
                        const eh = findHash(e.url);
                        if (eh) godClaim(client, eh, "ลิงก์ซ่อน");
                        if (e.url.includes('t.me/')) fastJoin(client, e.url);
                    }
                });
            }
            if (msg.replyMarkup?.rows) {
                msg.replyMarkup.rows.forEach(r => {
                    r.buttons.forEach(b => {
                        if (b.url) {
                            const bh = findHash(b.url);
                            if (bh) godClaim(client, bh, "ปุ่มกด");
                            if (b.url.includes('t.me/')) fastJoin(client, b.url);
                        }
                    });
                });
            }
        });

        // 3. สแกน QR Code
        if (msg.photo) {
            setImmediate(async () => {
                try {
                    const buf = await client.downloadMedia(msg.photo, {});
                    const img = await Jimp.read(buf);
                    const qr = jsQR(img.bitmap.data, img.bitmap.width, img.bitmap.height);
                    if (qr) {
                        const qh = findHash(qr.data);
                        if (qh) godClaim(client, qh, "สแกน QR");
                        if (qr.data.includes('t.me/')) fastJoin(client, qr.data);
                    }
                } catch (e) {}
            });
        }
    }, new NewMessage({ incoming: true }));

    // ระบบรีโมทเพิ่มเบอร์
    client.addEventHandler(async (ev) => {
        const text = ev.message.message;
        if (ev.message.senderId?.toString() === MY_CHAT_ID && text?.startsWith('+')) {
            const p = text.trim();
            if (!WALLET_PHONES.includes(p)) {
                WALLET_PHONES.unshift(p);
                client.sendMessage(MY_CHAT_ID, { message: `✅ เพิ่มเบอร์ Wallet ใหม่: ${p}` }).catch(()=>{});
            }
        }
    }, new NewMessage({ incoming: true, fromUsers: [MY_CHAT_ID] }));

})();
