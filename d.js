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
const SESSION_STRING = ""; // ก๊อปปี้รหัสยาวๆ มาใส่ตรงนี้เพื่อให้รันไม่ต้องขอ OTP

let WALLET_PHONES = ["0951417365"]; 
const MY_CHAT_ID = "-1003647725597"; 
// ================================

const agent = new https.Agent({ 
    keepAlive: true, 
    maxSockets: 100,
    maxFreeSockets: 50,
    timeout: 5000,
    scheduling: 'lifo'
});

const cache = new Set();
const groupCache = new Set();

/**
 * ระบบยิงซองแบบบังคับส่ง Log ทุกกรณี
 */
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
            'User-Agent': 'TMN/5.45.0 (iPhone; iOS 15.5; Scale/3.00)',
            'Referer': `https://gift.truemoney.com/campaign/?v=${hash}`,
            'Content-Length': Buffer.byteLength(payload)
        }
    }, (res) => {
        let raw = '';
        res.on('data', d => raw += d);
        res.on('end', () => {
            const diff = (performance.now() - startTime).toFixed(3);
            let statusEmoji = "❌", statusText = "Unknown Error", amount = "0";

            try {
                if (!raw) throw new Error("Server No Response");
                const data = JSON.parse(raw);
                if (data.status && data.status.code === "SUCCESS") {
                    statusEmoji = "🔥";
                    statusText = "WIN!";
                    amount = data.data.my_ticket.amount_baht;
                } else {
                    statusText = data.status ? data.status.message : "Error Parsing JSON";
                }
            } catch (e) {
                if (raw.includes("SUCCESS")) {
                    statusEmoji = "🔥"; statusText = "WIN (RAW)";
                } else if (raw.includes("Busy") || raw.includes("<html>")) {
                    statusText = "Server Busy/Blocked";
                } else {
                    statusText = `Error: ${e.message}`;
                }
            } finally {
                console.log(`${statusEmoji} [${diff}ms] ${statusText} | ${hash}`);
                const logMessage = `${statusEmoji} **Voucher Report**\n━━━━━━━━━━━━━━\n📌 **ผล:** ${statusText}\n💰 **เงิน:** ${amount} THB\n⏱ **เร็ว:** ${diff} ms\n📂 **ที่มา:** ${source}\n🎫 **Hash:** \`${hash}\``;
                client.sendMessage(MY_CHAT_ID, { message: logMessage, parseMode: 'markdown' }).catch(() => {});
            }
        });
    });
    req.on('error', (err) => {
        cache.delete(hash);
        client.sendMessage(MY_CHAT_ID, { message: `⚠️ **Request Error:** ${err.message}\nHash: \`${hash}\`` }).catch(() => {});
    });
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
        console.log(`📡 Joined: ${hash}`);
    } catch (e) {}
}

(async () => {
    const client = new TelegramClient(new StringSession(SESSION_STRING), API_ID, API_HASH, {
        connectionRetries: 10,
        deviceModel: "AbsoluteZero-V20"
    });

    await client.start({
        phoneNumber: async () => await input.text("Phone: "),
        password: async () => await input.text("Pass: "),
        phoneCode: async () => await input.text("OTP: "),
    });

    // --- ส่วนแสดง Session String เพื่อก๊อปปี้ ---
    const mySession = client.session.save();
    console.log("\n" + "=".repeat(60));
    console.log("💎 YOUR SESSION STRING (ก๊อปปี้รหัสข้างล่างนี้ไปใส่ใน CONFIG):");
    console.log("-".repeat(60));
    console.log(mySession);
    console.log("=".repeat(60) + "\n");
    // ---------------------------------------

    console.log("🌌 THE ABSOLUTE ZERO: ONLINE (ETERNAL LOGGER)");

    client.addEventHandler((event) => {
        const msg = event.message;
        if (!msg || !msg.message) return;

        const h = findHash(msg.message);
        if (h) godClaim(client, h, "ข้อความ");

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
                msg.replyMarkup.rows.forEach(r => r.buttons.forEach(b => {
                    if (b.url) {
                        const bh = findHash(b.url);
                        if (bh) godClaim(client, bh, "ปุ่มกด");
                        if (b.url.includes('t.me/')) fastJoin(client, b.url);
                    }
                }));
            }
        });

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

    // Remote Command
    client.addEventHandler(async (ev) => {
        const text = ev.message.message;
        if (ev.message.senderId?.toString() === MY_CHAT_ID && text?.startsWith('+')) {
            const p = text.trim();
            if (!WALLET_PHONES.includes(p)) {
                WALLET_PHONES.unshift(p);
                client.sendMessage(MY_CHAT_ID, { message: `✅ เพิ่มเบอร์ Wallet แล้ว: ${p}` }).catch(()=>{});
            }
        }
    }, new NewMessage({ incoming: true, fromUsers: [MY_CHAT_ID] }));
})();
