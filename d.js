import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import https from "https";
import input from "input";
import * as JimpModule from "jimp";
import jsQR from "jsqr";
import { performance } from "perf_hooks";
import cron from "node-cron"; // เพิ่ม library: npm install node-cron

const Jimp = JimpModule.default || JimpModule;

// ========== [ CONFIGURATION ] ==========
const API_ID = 16274927; 
const API_HASH = "e1b49b1565a299c2e442626d598718e8";
const SESSION_STRING = "1BQANOTEuMTA4LjU2LjE2NgG7syfVfIDQQZn5AYSCH7TCyTcS+3IlGqeYh87iks3MfrERGB/6QtknmID9hp67Hzu+JXLJoF3RgLYP7oWjqEdPxXucRkxnCiD5sWMmc1jhfoZ8aTe+Iitub57/+zfE4q+SVuZ4IpMNOcCcmZZE5B1fTpTo+0s/JrgqpUv4l54CkSv2f+Rucwq69Ib1P/IOhqRtR2lkbm/w6dv8twfIb9M1G+BdtzUYT1RV+kgS6NMfhb75HsrWv5+sPqJUI2AndD5lK+jWTbU+xs9n8aIB+iTE7BssedfERwsqfzG2AilzdmG0KXCDyFmjqPSzGqy8l7Eyc71XKZb9a+lSaZ772fP0Yw=="; 

let WALLET_PHONES = ["0951417365"]; 
const MY_CHAT_ID = "-1003647725597"; 

// ตัวแปรเก็บสถิติรายวัน
let dailyStats = { totalAmount: 0, count: 0, startTime: new Date() };
// ========================================

const cache = new Set();
const groupCache = new Set();

function godClaim(client, hash, source) {
    if (cache.has(hash)) return;
    cache.add(hash);
    
    const startTime = performance.now();
    const phone = WALLET_PHONES[0]; 
    const apiUrl = `https://api.mystrix2.me/truemoney?phone=${phone}&gift=${hash}`;

    https.get(apiUrl, (res) => {
        let raw = '';
        res.on('data', d => raw += d);
        res.on('end', () => {
            const diff = (performance.now() - startTime).toFixed(3);
            let statusEmoji = "❌", statusText = "API Error", amount = "0", owner = "ไม่ระบุ";

            try {
                const resData = JSON.parse(raw);
                // อ่านค่าตามโครงสร้าง JSON ที่คุณให้มา
                if (resData.data && resData.data.voucher) {
                    const v = resData.data.voucher;
                    statusEmoji = "🔥";
                    statusText = "ตักซองสำเร็จ!";
                    amount = v.amount_baht || "0";
                    owner = resData.data.owner_profile?.full_name || "Unknown";
                    
                    // บันทึกสถิติ
                    dailyStats.totalAmount += parseFloat(amount);
                    dailyStats.count++;
                } else {
                    statusText = resData.message || "ซองเต็ม/หมด หรือลิ้งค์เสีย";
                }
            } catch (e) {
                statusText = "Response Error: " + raw.substring(0, 30);
            } finally {
                const logMessage = `${statusEmoji} **Voucher Report (Mystrix)**\n` +
                                 `━━━━━━━━━━━━━━\n` +
                                 `📌 **ผล:** ${statusText}\n` +
                                 `💰 **เงินที่ได้:** ${amount} THB\n` +
                                 `👤 **เจ้าของ:** ${owner}\n` +
                                 `⏱ **ความเร็ว:** ${diff} ms\n` +
                                 `📂 **ที่มา:** ${source}\n` +
                                 `🎫 **Hash:** \`${hash}\``;

                client.sendMessage(MY_CHAT_ID, { message: logMessage, parseMode: 'markdown' }).catch(() => {});
            }
        });
    }).on('error', (err) => {
        cache.delete(hash);
    });
}

async function fastJoin(client, link) {
    try {
        const hash = link.split('/').pop().replace('+', '').split('?')[0];
        if (groupCache.has(hash) || hash.length < 5) return;
        groupCache.add(hash);
        
        if (link.includes('joinchat/') || link.includes('/+')) {
            await client.invoke(new Api.messages.ImportChatInvite({ hash }));
        } else {
            await client.invoke(new Api.channels.JoinChannel({ channel: hash }));
        }
        console.log(`📡 Auto Joined: ${hash}`);
    } catch (e) {}
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

(async () => {
    const client = new TelegramClient(new StringSession(SESSION_STRING), API_ID, API_HASH, { connectionRetries: 10 });
    await client.connect();
    console.log("🌌 ABSOLUTE ZERO V3: ONLINE");

    // --- ระบบสรุปยอด 7 โมงเช้า ---
    cron.schedule('0 7 * * *', () => {
        const summary = `📅 **สรุปยอดรายวัน (07:00 น.)**\n` +
                        `━━━━━━━━━━━━━━\n` +
                        `✅ ตักสำเร็จ: ${dailyStats.count} ครั้ง\n` +
                        `💰 ยอดรวมทั้งหมด: ${dailyStats.totalAmount.toFixed(2)} THB\n` +
                        `⏰ เริ่มเก็บสถิติเมื่อ: ${dailyStats.startTime.toLocaleString('th-TH')}\n` +
                        `━━━━━━━━━━━━━━\n` +
                        `🚀 บอททำงานปกติ กำลังรอซองต่อไป...`;
        
        client.sendMessage(MY_CHAT_ID, { message: summary, parseMode: 'markdown' }).catch(() => {});
        // รีเซ็ตสถิติใหม่หลังส่งรายงาน
        dailyStats = { totalAmount: 0, count: 0, startTime: new Date() };
    }, { timezone: "Asia/Bangkok" });

    client.addEventHandler((event) => {
        const msg = event.message;
        if (!msg || !msg.message) return;

        const h = findHash(msg.message);
        if (h) godClaim(client, h, "Message");

        // ระบบ Auto Join กลุ่ม/ช่อง
        if (msg.message.includes('t.me/')) {
            const links = msg.message.match(/t\.me\/[^\s]+/g);
            if (links) links.forEach(l => fastJoin(client, l));
        }

        setImmediate(() => {
            if (msg.entities) {
                msg.entities.forEach(e => {
                    if (e.url) {
                        const eh = findHash(e.url);
                        if (eh) godClaim(client, eh, "Hidden Link");
                        if (e.url.includes('t.me/')) fastJoin(client, e.url);
                    }
                });
            }
            if (msg.replyMarkup?.rows) {
                msg.replyMarkup.rows.forEach(r => r.buttons.forEach(b => {
                    if (b.url) {
                        const bh = findHash(b.url);
                        if (bh) godClaim(client, bh, "Button");
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
                        if (qh) godClaim(client, qh, "QR Scan");
                        if (qr.data.includes('t.me/')) fastJoin(client, qr.data);
                    }
                } catch (e) {}
            });
        }
    }, new NewMessage({ incoming: true }));
})();
