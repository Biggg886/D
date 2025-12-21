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
const SESSION_STRING = "1BQANOTEuMTA4LjU2LjE2NgG7syfVfIDQQZn5AYSCH7TCyTcS+3IlGqeYh87iks3MfrERGB/6QtknmID9hp67Hzu+JXLJoF3RgLYP7oWjqEdPxXucRkxnCiD5sWMmc1jhfoZ8aTe+Iitub57/+zfE4q+SVuZ4IpMNOcCcmZZE5B1fTpTo+0s/JrgqpUv4l54CkSv2f+Rucwq69Ib1P/IOhqRtR2lkbm/w6dv8twfIb9M1G+BdtzUYT1RV+kgS6NMfhb75HsrWv5+sPqJUI2AndD5lK+jWTbU+xs9n8aIB+iTE7BssedfERwsqfzG2AilzdmG0KXCDyFmjqPSzGqy8l7Eyc71XKZb9a+lSaZ772fP0Yw=="; 

let WALLET_PHONES = ["0951417365"]; 
const MY_CHAT_ID = "-1003647725597"; 
// ================================

const agent = new https.Agent({ 
    keepAlive: true, 
    maxSockets: 200,
    maxFreeSockets: 100,
    timeout: 8000,
    scheduling: 'lifo'
});

const cache = new Set();
const groupCache = new Set();

// รายการ User-Agent เพื่อการสุ่ม (Bypass Cloudflare)
const uaList = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    "TMN/5.45.0 (iPhone; iOS 15.5; Scale/3.00)"
];

function godClaim(client, hash, source) {
    if (cache.has(hash)) return;
    cache.add(hash);
    const startTime = performance.now();
    const phone = WALLET_PHONES[0]; 
    const payload = JSON.stringify({ mobile: phone, voucher_hash: hash });
    const selectedUA = uaList[Math.floor(Math.random() * uaList.length)];

    const req = https.request({
        hostname: 'gift.truemoney.com',
        path: `/campaign/vouchers/${hash}/redeem`,
        method: 'POST',
        agent: agent,
        headers: {
            'Host': 'gift.truemoney.com',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'th-TH,th;q=0.9',
            'Connection': 'keep-alive',
            'Content-Type': 'application/json',
            'Origin': 'https://gift.truemoney.com',
            'Referer': `https://gift.truemoney.com/campaign/?v=${hash}`,
            'User-Agent': selectedUA,
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Length': Buffer.byteLength(payload)
        }
    }, (res) => {
        let raw = '';
        res.on('data', d => raw += d);
        res.on('end', () => {
            const diff = (performance.now() - startTime).toFixed(3);
            let statusEmoji = "❌", statusText = "Blocked/Busy", amount = "0";

            try {
                if (raw.includes('<!DOCTYPE') || raw.includes('<html')) {
                    if (raw.includes("SUCCESS")) {
                        statusEmoji = "🔥"; statusText = "WIN (HTML BYPASS)";
                    } else if (raw.includes("หมด") || raw.includes("เต็ม")) {
                        statusText = "ซองเต็มหรือหมดแล้ว";
                    } else {
                        statusText = "Cloudflare Blocked (IP/UA)";
                    }
                } else {
                    const data = JSON.parse(raw);
                    if (data.status?.code === "SUCCESS") {
                        statusEmoji = "🔥";
                        statusText = "WIN!";
                        amount = data.data.my_ticket.amount_baht;
                    } else {
                        statusText = data.status ? data.status.message : "Error Data";
                    }
                }
            } catch (e) {
                statusText = "Server Heavy Load";
            } finally {
                console.log(`${statusEmoji} [${diff}ms] ${statusText} | ${hash}`);
                const logMessage = `${statusEmoji} **Voucher Report**\n━━━━━━━━━━━━━━\n📌 **ผล:** ${statusText}\n💰 **เงิน:** ${amount} THB\n⏱ **เร็ว:** ${diff} ms\n📂 **ที่มา:** ${source}\n🎫 **Hash:** \`${hash}\``;
                client.sendMessage(MY_CHAT_ID, { message: logMessage, parseMode: 'markdown' }).catch(() => {});
            }
        });
    });

    req.on('error', (err) => {
        cache.delete(hash);
        client.sendMessage(MY_CHAT_ID, { message: `⚠️ **Request Error:** ${err.message}` }).catch(() => {});
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
        deviceModel: "Phantom-V20"
    });

    await client.connect();
    console.log("🌌 THE ABSOLUTE ZERO: ONLINE (PHANTOM BYPASS)");
    console.log("✅ SESSION LOADED: READY TO SNIPE");

    // รักษา Connection ให้ Active ตลอดเวลา
    setInterval(() => {
        const r = https.request({ hostname: 'gift.truemoney.com', method: 'HEAD', agent: agent }, res => res.resume());
        r.on('error', () => {});
        r.end();
    }, 20000);

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
