import { Client, GatewayIntentBits, Partials, EmbedBuilder, ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js"
import "dotenv/config"
import path from "path"
import express from "express"
import { fileURLToPath } from "url"
import fs from "fs"
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express()
app.use("/", express.static(path.join(__dirname, "public")))
const port = process.env.PORT || 4000
app.listen(port, () => {
    console.log(`Server läuft auf Port ${port}`)
})
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Channel, Partials.Message, Partials.Reaction, 
    Partials.GuildMember, Partials.User, Partials.ThreadMember
    ]
});
const DSTORAGE_CHANNEL_ID = "1474153763647389860";
const RSTORAGE_CHANNEL_ID = "1474144083105808556";
let storageMessageD = null;
let dataD = {};
let storageMessageR = null;
let dataR = {};
async function initDmTicketsStorage(client) {
  const channel = await client.channels.fetch(DSTORAGE_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const messages = await channel.messages.fetch({ limit: 20 });
  storageMessageD = messages.find(
    m => m.author.id === client.user.id && m.embeds.length > 0
  );

  if (!storageMessageD) {
    dataD = { _init: true };
    const embed = new EmbedBuilder()
      .setTitle("Storage")
      .setDescription("```json\n" + JSON.stringify(dataD) + "\n```");

    storageMessageD = await channel.send({ embeds: [embed] });
  } else {
    try {
      const raw = storageMessageD.embeds[0].description
        .replace("```json\n", "")
        .replace("\n```", "");

      dataD = JSON.parse(raw);
    } catch {
      dataD = { _init: true };
    }
  }
}

export function getDData(key) {
  return dataD[key];
}

export async function setDData(key, value) {
  if (!storageMessageD) return;

  dataD[key] = value;

  const jsonString = JSON.stringify(dataD);

  const embed = new EmbedBuilder()
    .setTitle("Storage")
    .setDescription("```json\n" + jsonString + "\n```");

  await storageMessageD.edit({ embeds: [embed] }).catch(console.error);
  
}

async function initRemindersStorage(client) {
  const channel = await client.channels.fetch(RSTORAGE_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const messages = await channel.messages.fetch({ limit: 20 });
  storageMessageR = messages.find(
    m => m.author.id === client.user.id && m.embeds.length > 0
  );

  if (!storageMessageR) {
    dataR = { _init: true };
    const embed = new EmbedBuilder()
      .setTitle("Storage")
      .setDescription("```json\n" + JSON.stringify(dataR) + "\n```");

    storageMessageR = await channel.send({ embeds: [embed] });
  } else {
    try {
      const raw = storageMessageR.embeds[0].description
        .replace("```json\n", "")
        .replace("\n```", "");

      dataR = JSON.parse(raw);
    } catch {
      dataR = { _init: true };
    }
  }
}
export function getRData(key) {
  return dataR[key];
}
export async function setRData(key, value) {
  if (!storageMessageR) return;
  dataR[key] = value;
  const jsonString = JSON.stringify(dataR);
  const embed = new EmbedBuilder()
    .setTitle("Storage")
    .setDescription("```json\n" + jsonString + "\n```");
  await storageMessageR.edit({ embeds: [embed] }).catch(console.error);
}
const FORUM_CHANNEL_ID = "1474918563218198548";
const TEAM_ROLE_ID = "1457906448234319922";
const LOG_CHANNEL_ID = "1423413348220796991";
export async function initSupport(client) {
    const savedData = getDData("tickets") || {};
    let OPEN_HELP = new Map(Object.entries(savedData));
    const getAccountAge = (createdAt) => {
        const diff = Date.now() - createdAt.getTime();
        const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
        return years === 0 ? "Weniger als ein Jahr" : `${years} Jahre`;
    };
    client.on("messageCreate", async (msg) => {
        if (msg.author.bot) return;
        if (msg.channel.type === ChannelType.DM) {
            let threadId = OPEN_HELP.get(msg.author.id);
            let thread = threadId ? await client.channels.fetch(threadId).catch(() => null) : null;
            if (!thread) {
                const forumChannel = await client.channels.fetch(FORUM_CHANNEL_ID).catch(() => null);
                if (!forumChannel) return console.error("Forum Channel nicht gefunden!");

                const lastId = (getDData("last_ticket_id") || 0) + 1;
                const ticketIndex = String(lastId).padStart(4, "0");
                thread = await forumChannel.threads.create({
                    name: `Ticket #${ticketIndex} - ${msg.author.username}`,
                    message: {
                        content: `<@&${TEAM_ROLE_ID}> - Neues Ticket von ${msg.author}!`,
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("🎫 Neues Support-Ticket")
                                .setColor("#ffffff")
                                .setThumbnail(msg.author.displayAvatarURL())
                                .addFields(
                                    { name: "User", value: `${msg.author.tag} (${msg.author.id})`, inline: true },
                                    { name: "Account erstellt", value: getAccountAge(msg.author.createdAt), inline: true },
                                    { name: "Erste Nachricht", value: msg.content || "*Anhang*" }
                                )
                                .setFooter({ text: "🎯 Nutze die Buttons unten zur Verwaltung" })
                        ],
                        components: [
                            new ActionRowBuilder().addComponents(
                                new ButtonBuilder().setCustomId("ticket_claim").setLabel("Claim Ticket").setStyle(ButtonStyle.Success).setEmoji("🙋‍♂️"),
                                new ButtonBuilder().setCustomId("ticket_warn").setLabel("User warnen").setStyle(ButtonStyle.Secondary).setEmoji("⚠️"),
                                new ButtonBuilder().setCustomId("ticket_delete").setLabel("Ticket Schließen").setStyle(ButtonStyle.Danger).setEmoji("🔒")
                            )
                        ]
                    }
                });
                OPEN_HELP.set(msg.author.id, thread.id);
                await setDData("tickets", Object.fromEntries(OPEN_HELP));
                await setDData("last_ticket_id", lastId);
                const userConfirm = new EmbedBuilder()
                    .setTitle("✅ Ticket erstellt!")
                    .setDescription(`Dein Support-Ticket wurde erfolgreich erstellt!\n\n💬 Schreibe hier weiter, um mit dem Team zu kommunizieren.\n⏱️ Ein Teammitglied wird sich bald bei dir melden!`)
                    .setColor("#ffffff")
                    .setFooter({ text: `Ticket #${ticketIndex}` })
                    .setTimestamp();
                await msg.author.send({ embeds: [userConfirm] }).catch(() => {});
            } else {
                const relayEmbed = new EmbedBuilder()
                    .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
                    .setDescription(msg.content || "*Kein Textinhalt*")
                    .setColor("#ffffff")
                    .setTimestamp();
                if (msg.attachments.size > 0) relayEmbed.setImage(msg.attachments.first().url);
                await thread.send({ embeds: [relayEmbed] });
            }
        }
        if (msg.guild && msg.channel.isThread() && msg.channel.parentId === FORUM_CHANNEL_ID) {
            const entry = [...OPEN_HELP.entries()].find(([uId, tId]) => tId === msg.channel.id);
            if (!entry) return;
            const userId = entry[0];
            const targetUser = await client.users.fetch(userId).catch(() => null);
            if (targetUser) {
                const staffEmbed = new EmbedBuilder()
                    .setAuthor({ name: "Kekse Clan Support", iconURL: client.user.displayAvatarURL() })
                    .setTitle("💬 Antwort vom Support-Team")
                    .setDescription(msg.content)
                    .setColor("#ffffff")
                    .setFooter({ text: "Antworte direkt auf diese DM, um mit uns zu schreiben." });
                if (msg.attachments.size > 0) staffEmbed.setImage(msg.attachments.first().url);
                await targetUser.send({ embeds: [staffEmbed] })
                    .then(() => msg.react("✅"))
                    .catch(() => msg.channel.send("❌ DMs des Users sind deaktiviert."));
            }
        }
    });
    client.on("interactionCreate", async (interaction) => {
        if (!interaction.isButton()) return;   
        const entry = [...OPEN_HELP.entries()].find(([uId, tId]) => tId === interaction.channelId);
        if (!entry) return;
        const userId = entry[0];
        if (interaction.customId === "ticket_claim") {
            await interaction.reply({ content: `🙋‍♂️ **${interaction.user.username}** hat dieses Ticket übernommen.` });
        }
        if (interaction.customId === "ticket_warn") {
            const user = await client.users.fetch(userId).catch(() => null);
            if (user) {
                const warnEmbed = new EmbedBuilder()
                    .setTitle("⚠️ Warnung vom Support-Team")
                    .setDescription(`Du wurdest von ${interaction.user.username} verwarnt.\nBitte achte auf einen respektvollen Umgangston. Wir sind hier, um dir zu helfen, erwarten aber Höflichkeit.`)
                    .setColor("#F78420");
                await user.send({ embeds: [warnEmbed] }).catch(() => {});
                await interaction.reply({ content: "⚠️ Warnung gesendet.", ephemeral: true });
            }
        }
                if (interaction.customId === "ticket_delete") {
            const user = await client.users.fetch(userId).catch(() => null);
            if (user) {
                await user.send("🔒 **Ticket geschlossen.** Deine Anfrage wurde archiviert. Schreibe eine neue Nachricht, um ein neues Ticket zu eröffnen.").catch(() => {});
            }
            await interaction.reply("🔒 Ticket wird archiviert und geschlossen...");
            OPEN_HELP.delete(userId);
            await setDData("tickets", Object.fromEntries(OPEN_HELP));
            setTimeout(async () => {
                try {
                    await interaction.channel.edit({
                        name: `[Closed] ${interaction.channel.name}`,
                        archived: true,
                        locked: true
                    });
                } catch (err) {
                    console.error("Fehler beim Archivieren des Forum-Threads:", err);
                }
            }, 3000);
        }

    });
}
function initReminder(client) {
  const sendKekseLog = async (action, user, details) => {
    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel) return;
    const logEmbed = new EmbedBuilder()
      .setColor('#ffffff')
      .setAuthor({ 
          name: user.username, 
          iconURL: user.displayAvatarURL({ size: 512 }) 
      })
      .setDescription(`**Aktion:** \`${action}\`\n${details}`)
      .setFooter({ text: 'Kekse Clan | Reminder System' })
      .setTimestamp();
    await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
  };
  function parseDuration(str) {
    const match = str.match(/(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?/);
    if (!match) return 0;
    const days = parseInt(match[1] || "0");
    const hours = parseInt(match[2] || "0");
    const minutes = parseInt(match[3] || "0");
    return ((days * 24 + hours) * 60 + minutes) * 60000;
  }
  function parseAbsoluteTime(str) {
    const [timePart, datePart] = str.split(";");
    if (!timePart || !datePart) return null;
    const [hh, mm] = timePart.split(":").map(Number);
    const [dd, MM, YYYY] = datePart.split(".").map(Number);
    return new Date(YYYY, MM - 1, dd, hh, mm, 0).getTime();
  }
  async function checkReminders() {
    const data = getRData("reminders") || { reminders: [] };
    if (data.reminders.length === 0) return;
    const now = Date.now();
    const remaining = [];
    let changed = false;
    for (const r of data.reminders) {
      if (now >= r.triggerAt) {
        changed = true;
        const user = await client.users.fetch(r.userId).catch(() => null);
        try {
          if (r.dm && user) {
            await user.send(`🔔 **Erinnerung:** ${r.text}`);
          } else {
            const channel = await client.channels.fetch(r.channelId).catch(() => null);
            if (channel) await channel.send(`🔔 <@${r.userId}> **Erinnerung:** ${r.text}`);
          }
          if (user) await sendKekseLog("Erinnerung ausgelöst", user, `**Inhalt:** ${r.text}\n**Typ:** ${r.dm ? "DM" : "Channel"}`);
        } catch (err) {
          console.error("[REMINDER] Fehler beim Senden:", err);
        }
      } else {
        remaining.push(r);
      }
    }
    if (changed) {
      data.reminders = remaining;
      await setRData("reminders", data);
    }
  }
  setInterval(checkReminders, 60000);
  client.on("messageCreate", async msg => {
    if (msg.author.bot || !msg.content.startsWith("!")) return;
    const args = msg.content.slice(1).split(/\s+/);
    const cmd = args.shift().toLowerCase();
    if (cmd === "remind") {
      if (args.length < 2) return msg.channel.send({ content: "❌ Nutzung: `!remind <Zeit/Dauer> <Text> [dm]`", ephemeral: true });
      const timeArg = args.shift();
      const dmFlag = args[args.length - 1]?.toLowerCase() === "dm";
      if (dmFlag) args.pop();
      const text = args.join(" ");
      let triggerAt = timeArg.includes(";") ? parseAbsoluteTime(timeArg) : (Date.now() + parseDuration(timeArg));
      if (!triggerAt || isNaN(triggerAt) || triggerAt <= Date.now()) {
        return msg.channel.send({ content: "❌ Ungültiger Zeitpunkt.", ephemeral: true });
      }
      const reminder = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        userId: msg.author.id,
        channelId: msg.channel.id,
        triggerAt,
        text,
        dm: dmFlag
      };
      const data = getRData("reminders") || { reminders: [] };
      data.reminders.push(reminder);
      await setRData("reminders", data);
      await sendKekseLog("Erinnerung gesetzt", msg.author, `**Text:** ${text}\n**Zeitpunkt:** <t:${Math.floor(triggerAt / 1000)}:f>\n**DM:** ${dmFlag ? "Ja" : "Nein"}`);
      msg.channel.send({ content: `✅ Erinnerung gesetzt für <t:${Math.floor(triggerAt / 1000)}:R>!`, ephemeral: true });
    }
  });
}
client.once("ready", async () => {
    await initDmTicketsStorage(client);
    await initRemindersStorage(client);
    initSupport(client);
    initReminder(client);
    client.user.setPresence({
    activities: [{ name: "DM to talk with moderators", type: 0 }],
    status: "online"
  });
})
client.setMaxListeners(20);
client.on("error", console.error)
client.on("warn", console.warn)
client.login(process.env.BOT_TOKEN)
