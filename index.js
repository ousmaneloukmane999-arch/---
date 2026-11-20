const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const pino = require("pino");

const MON_NUMERO = "22770246724"; // TON NUMERO ICI

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["Goat MD", "Chrome", "1.0.0"]
    });

    if (!sock.authState.creds.registered) {
        console.log("\n⏳ Génération du code d'appairage...");
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(MON_NUMERO);
                console.log(`\n=========================================`);
                console.log(`🔑 TON CODE : ${code}`);
                console.log(`=========================================\n`);
                console.log("Ouvre WhatsApp > Appareils connectés > Connecter avec un numéro.");
            } catch (e) {
                console.log("Erreur de génération du code :", e);
            }
        }, 3000);
    }

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("Connexion fermée. Reconnexion...");
            if (shouldReconnect) startBot();
        } else if (connection === "open") {
            console.log("✅ ɢᴏᴀᴛ-ᴍᴅ est en ligne !");
        }
    });

    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const sender = msg.key.remoteJid;

        if (text.toLowerCase() === ".menu") {
            const menu = `
╭─◈ ❑ ɢᴏᴀᴛ • ᴍᴅ • ᴠ1.0 ❑
> 🐐 ɢᴏᴀᴛ ✘ ᴍᴅ
> ╭━━❑ *ᴛᴏᴜᴛᴇꜱ ʟᴇꜱ ᴄᴏᴍᴍᴀɴᴅᴇꜱ* ❑
> | 🕸️ *Général*
> | .menu · .ping · .actif · .apropos
> | 🕸️ *Jeux*
> | .pfc · .devine · .8ball · .des
> | ╰━━❏
╰─◈ _— ᴅᴇᴠ ⌁ ɢᴏᴀᴛ ᴍᴅ —_`;
            await sock.sendMessage(sender, { text: menu }, { quoted: msg });
        }

        if (text.toLowerCase() === ".ping") {
            await sock.sendMessage(sender, { text: "Pong ! 🏓 ɢᴏᴀᴛ-ᴍᴅ est actif." }, { quoted: msg });
        }

        if (text.toLowerCase() === ".8ball") {
            const reponses = ["Oui, absolument.", "Non, jamais.", "Peut-être...", "La chèvre a parlé."];
            const rep = reponses[Math.floor(Math.random() * reponses.length)];
            await sock.sendMessage(sender, { text: `🎱 *Magic 8-Ball* : ${rep}` }, { quoted: msg });
        }
    });
}

startBot();