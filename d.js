import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import https from "https";
import input from "input";
import * as JimpModule from "jimp";
import jsQR from "jsqr";
import { performance } from "perf_hooks";
import cron from "node-cron";

const Jimp = JimpModule.default || JimpModule;

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

class TrueMoneyBot {
    constructor() {
        this.client = null;
        this.cache = new Set();
        this.groupCache = new Set();
        this.stats = { total: 0, count: 0, startTime: new Date() };
    }

    async init() {
        console.log("🚀 Initializing Titan System...");
        this.client = new TelegramClient(
            new StringSession(CONFIG.SESSION),
            CONFIG.API_ID,
            CONFIG.API_HASH,
            { connectionRetries: 10, floodSleepThreshold: 60 }
        );

        await this.client.connect();
        this.setupHandlers();
        this.setupCron();
        console.log("🌌 TITAN SYSTEM: ONLINE");
    }

    // --- Parser Engine ---
    extractVoucherHash(text) {
        if (!text) return null;
        // ดักจับทุกรูปแบบ: ลิงก์ตรง, ลิงก์ปนขยะ, หรือแค่ตัว Hash 18 หลัก
        const regex = /(?:v=|campaign\/)([a-zA-Z0-9]{10,25})|([a-zA-Z0-9]{18})/;
        const match = text.match(regex);
        return match ? (match[1] || match[2]) : null;
    }

    // --- Core Action: Claim ---
    async claim(hash, source) {
        if (!hash || this.cache.has(hash)) return;
        this.cache.add(hash);

        const startTime = performance.now();
        const phone = CONFIG.WALLET_PHONES[0];
        const targetUrl = `${CONFIG.API_ENDPOINT}?phone=${phone}&gift=${hash}`;

        https.get(targetUrl, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                const duration = (performance.now() - startTime).toFixed(2);
                this.processResponse(data, hash, source, duration);
            });
        }).on("error", (err) => {
            this.cache.delete(hash);
            this.sendLog(`⚠️ Network Error: ${err.message}`);
        });
    }

    processResponse(raw, hash, source, duration) {
        let emoji = "❌", status = "Failed", amount = "0", owner = "Unknown";
        try {
            const json = JSON.parse(raw);
            const voucher = json.data?.voucher || json.voucher;
            
            if (voucher) {
                emoji = "🔥";
                status = "SUCCESS";
                amount = voucher.amount_baht || "0";
                owner = json.data?.owner_profile?.full_name || "Private User";
                this.stats.total += parseFloat(amount);
                this.stats.count++;
            } else {
                status = json.message || "Already Redeemed";
            }
        } catch (e) {
            status = raw.includes("success") ? "WIN (Raw Mode)" : "API Error";
        }

        const report = `${emoji} **TITAN REDEEM REPORT**\n━━━━━━━━━━━━━━\n📌 **STATUS:** ${status}\n💰 **AMOUNT:** ${amount} THB\n👤 **OWNER:** ${owner}\n⏱ **SPEED:** ${duration}ms\n📂 **FROM:** ${source}\n🎫 **HASH:** \`${hash}\``;
        this.sendLog(report);
    }

    // --- Auto Joiner ---
    async autoJoin(link) {
        try {
            const cleanLink = link.trim().split(/\s+/)[0];
            const chatHash = cleanLink.split('/').pop().replace('+', '').split('?')[0];
            if (this.groupCache.has(chatHash) || chatHash.length < 5) return;
            
            this.groupCache.add(chatHash);
            if (cleanLink.includes('joinchat/') || cleanLink.includes('/+')) {
                await this.client.invoke(new Api.messages.ImportChatInvite({ hash: chatHash }));
            } else {
                await this.client.invoke(new Api.channels.JoinChannel({ channel: chatHash }));
            }
            console.log(`📡 Auto Joined: ${chatHash}`);
        } catch (e) { /* Ignore join errors */ }
    }

    // --- Media Scanner ---
    async scanMedia(message) {
        try {
            const buffer = await this.client.downloadMedia(message, {});
            const image = await Jimp.read(buffer);
            const qr = jsQR(image.bitmap.data, image.bitmap.width, image.bitmap.height);
            if (qr) {
                const hash = this.extractVoucherHash(qr.data);
                if (hash) this.claim(hash, "QR Code Scanner");
                if (qr.data.includes("t.me/")) this.autoJoin(qr.data);
            }
        } catch (e) { /* Silence QR errors */ }
    }

    // --- Event Handlers ---
    setupHandlers() {
        this.client.addEventHandler(async (event) => {
            const msg = event.message;
            if (!msg) return;

            // 1. Text & Links
            const hash = this.extractVoucherHash(msg.message);
            if (hash) this.claim(hash, "Message Stream");

            // 2. Auto Join Check
            if (msg.message?.includes("t.me/")) {
                const links = msg.message.match(/t\.me\/[^\s]+/g);
                if (links) links.forEach(l => this.autoJoin(l));
            }

            // 3. QR & Media
            if (msg.photo || msg.media instanceof Api.MessageMediaPhoto) {
                this.scanMedia(msg);
            }

            // 4. Buttons & Entities
            setImmediate(() => this.parseEntities(msg));
        }, new NewMessage({ incoming: true }));
    }

    parseEntities(msg) {
        if (msg.entities) {
            msg.entities.forEach(e => {
                if (e.url) {
                    const h = this.extractVoucherHash(e.url);
                    if (h) this.claim(h, "Hidden Link");
                    if (e.url.includes("t.me/")) this.autoJoin(e.url);
                }
            });
        }
        if (msg.replyMarkup?.rows) {
            msg.replyMarkup.rows.forEach(r => r.buttons.forEach(b => {
                if (b.url) {
                    const h = this.extractVoucherHash(b.url);
                    if (h) this.claim(h, "Inline Button");
                    if (b.url.includes("t.me/")) this.autoJoin(b.url);
                }
            }));
        }
    }

    setupCron() {
        cron.schedule("0 7 * * *", () => {
            const summary = `📅 **DAILY TITAN SUMMARY** (07:00)\n━━━━━━━━━━━━━━\n✅ SUCCESS: ${this.stats.count}\n💰 TOTAL: ${this.stats.total.toFixed(2)} THB\n⏱ UPTIME: ${this.getUptime()}\n━━━━━━━━━━━━━━\n🚀 Waiting for next vouchers...`;
            this.sendLog(summary);
            this.stats = { total: 0, count: 0, startTime: new Date() };
        }, { timezone: "Asia/Bangkok" });
    }

    getUptime() {
        const diff = Math.abs(new Date() - this.stats.startTime);
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        return `${hours}h ${mins}m`;
    }

    async sendLog(message) {
        try {
            await this.client.sendMessage(CONFIG.LOG_GROUP, { message, parseMode: "markdown" });
        } catch (e) {
            console.error("Logger Error:", e.message);
        }
    }
}

const bot = new TrueMoneyBot();
bot.init();
