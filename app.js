import { Client, GatewayIntentBits, Partials, EmbedBuilder, ChannelType } from "discord.js"
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
const STORAGE_CHANNEL_ID = "1474153763647389860";

let storageMessage = null;
let data = {};
async function initDmTicketsStorage(client) {
  const channel = await client.channels.fetch(STORAGE_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const messages = await channel.messages.fetch({ limit: 20 });
  storageMessage = messages.find(
    m => m.author.id === client.user.id && m.embeds.length > 0
  );

  if (!storageMessage) {
    data = { _init: true };
    const embed = new EmbedBuilder()
      .setTitle("Storage")
      .setDescription("```json\n" + JSON.stringify(data) + "\n```");

    storageMessage = await channel.send({ embeds: [embed] });
  } else {
    try {
      const raw = storageMessage.embeds[0].description
        .replace("```json\n", "")
        .replace("\n```", "");

      data = JSON.parse(raw);
    } catch {
      data = { _init: true };
    }
  }
}

export function getDData(key) {
  return data[key];
}

export async function setDData(key, value) {
  if (!storageMessage) return;

  data[key] = value;

  const jsonString = JSON.stringify(data);

  const embed = new EmbedBuilder()
    .setTitle("Storage")
    .setDescription("```json\n" + jsonString + "\n```");

  await storageMessage.edit({ embeds: [embed] }).catch(console.error);
  
}

async function initRemindersStorage(client) {
  const channel = await client.channels.fetch(STORAGE_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const messages = await channel.messages.fetch({ limit: 20 });
  storageMessage = messages.find(
    m => m.author.id === client.user.id && m.embeds.length > 0
  );

  if (!storageMessage) {
    data = { _init: true };
    const embed = new EmbedBuilder()
      .setTitle("Storage")
      .setDescription("```json\n" + JSON.stringify(data) + "\n```");

    storageMessage = await channel.send({ embeds: [embed] });
  } else {
    try {
      const raw = storageMessage.embeds[0].description
        .replace("```json\n", "")
        .replace("\n```", "");

      data = JSON.parse(raw);
    } catch {
      data = { _init: true };
    }
  }
}

export function getRData(key) {
  return data[key];
}

export async function setRData(key, value) {
  if (!storageMessage) return;

  data[key] = value;

  const jsonString = JSON.stringify(data);

  const embed = new EmbedBuilder()
    .setTitle("Storage")
    .setDescription("```json\n" + jsonString + "\n```");

  await storageMessage.edit({ embeds: [embed] }).catch(console.error);
  
}
const CATEGORY_ID = "1465790388517474397";
const LOG_CHANNEL_ID = "1423413348220796991";
const TEAM_ROLE_ID = "1457906448234319922";
const CLOSED_CATEGORY_ID = "1465452886657077593";
let OPEN_HELP = new Map();
let MAIN_GUILD = null;
async function initSupport(client) {
  MAIN_GUILD = client.guilds.cache.first();
  const savedData = getDData("tickets") || {};
  OPEN_HELP = new Map(Object.entries(savedData));
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
      .setFooter({ text: 'Kekse Clan | Modmail System' })
      .setTimestamp();
    await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
  };
  client.on("messageCreate", async msg => {
    if (msg.author.bot) return;
    if (msg.guild && msg.content === ".help") {
      msg.delete().catch(() => {});
      if (OPEN_HELP.has(msg.author.id)) {
        return msg.channel.send(`<@${msg.author.id}>, du hast bereits einen offenen Support-Channel.`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
      }
      const botMsg = await msg.channel.send("Reagiere mit ✅ um Hilfe zu erhalten.");
      await botMsg.react("✅");
      const filter = (reaction, user) => reaction.emoji.name === "✅" && user.id === msg.author.id;
      botMsg.awaitReactions({ filter, max: 1, time: 20000, errors: ["time"] })
        .then(async () => {
          const lastId = getDData("last_ticket_id") || 0;
          const nextId = lastId + 1;
          const index = String(nextId).padStart(4, "0");
          const channel = await MAIN_GUILD.channels.create({
            name: `modmail-${msg.author.username}-${index}`,
            type: ChannelType.GuildText,
            parent: CATEGORY_ID,
            permissionOverwrites: [
              { id: MAIN_GUILD.id, deny: [PermissionsBitField.Flags.ViewChannel] },
              { id: msg.author.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
              { id: TEAM_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]}
            ]
          });
          OPEN_HELP.set(msg.author.id, channel.id);
          await setDData("tickets", Object.fromEntries(OPEN_HELP));
          await setDData("last_ticket_id", nextId);
          const welcomeEmbed = new EmbedBuilder()
            .setTitle("Support Ticket Geöffnet")
            .setDescription(`Hallo **${msg.author.username}**, dein Ticket wurde erstellt!\nSchreibe hier oder per DM, um mit dem Team zu kommunizieren.`)
            .setColor("#ffffff")
            .setFooter({ text: "Kekse Clan" });
          await channel.send({ content: `<@&${TEAM_ROLE_ID}>`, embeds: [welcomeEmbed] });
          await msg.author.send({ embeds: [welcomeEmbed] }).catch(() => {});
          await sendKekseLog("Modmail Ticket geöffnet", msg.author, `**Kanal:** ${channel}\n**ID:** \`${index}\``);        
          botMsg.delete().catch(() => {});
        })
        .catch(() => botMsg.delete().catch(() => {}));
    }
    if (msg.content === ".close" && OPEN_HELP.has(msg.author.id)) {
      const channelId = OPEN_HELP.get(msg.author.id);
      const channel = MAIN_GUILD.channels.cache.get(channelId);
      const closeInfo = "Support-Verbindung getrennt. Das Ticket wurde archiviert.";
      if (channel) {
        await channel.setParent(CLOSED_CATEGORY_ID, { lockPermissions: false }).catch(() => {});
        await channel.send(closeInfo);
        await sendKekseLog("Modmail Ticket archiviert", msg.author, `**Kanal:** ${channel.name}\n**Status:** Erfolgreich geschlossen.`);
      }
      OPEN_HELP.delete(msg.author.id);
      await setDData("tickets", Object.fromEntries(OPEN_HELP));
      await msg.author.send(closeInfo).catch(() => {});
    }
    if (msg.channel.type === ChannelType.DM) {
      const channelId = OPEN_HELP.get(msg.author.id);
      if (!channelId) return;
      const channel = MAIN_GUILD.channels.cache.get(channelId);
      if (!channel) return;
      const dmEmbed = new EmbedBuilder()
        .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
        .setDescription(msg.content)
        .setColor("#ffffff")
        .setTimestamp();
      await channel.send({ embeds: [dmEmbed] });
    }
    if (msg.guild) {
      for (const [userId, channelId] of OPEN_HELP) {
        if (msg.channel.id === channelId && !msg.author.bot && !msg.content.startsWith(".")) {
          const user = await client.users.fetch(userId);
          const replyEmbed = new EmbedBuilder()
            .setAuthor({ name: "Kekse Clan Support", iconURL: client.user.displayAvatarURL() })
            .setDescription(msg.content)
            .setColor("#ffffff")
            .setFooter({ text: "Antworte einfach auf diese Nachricht." });
          await user.send({ embeds: [replyEmbed] }).catch(() => {
            msg.channel.send("❌ Fehler: Der User hat seine DMs geschlossen.");
          });
        }
      }
    }
  });
}
function registerMessageCommands(client) {
  client.on("messageCreate", async (msg) => {
    if (msg.author.bot || !msg.content.startsWith("!")) return;
    const teamRole = "1457906448234319922";
    const logChannelId = "1423413348220796991";
    if (!msg.member.roles.cache.has(teamRole) && !msg.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;
    const args = msg.content.slice(1).match(/(?:[^\s"]+|"[^"]*")+/g)?.map(a => a.replace(/"/g, "")) || [];
    const cmd = args.shift().toLowerCase();
    const deleteCmd = () => msg.delete().catch(() => {});
    const sendKekseLog = async (commandName, target, content) => {
      const logChannel = client.channels.cache.get(logChannelId);
      if (logChannel) {
        const kekseEmbed = new EmbedBuilder()
          .setColor('#ffffff')
          .setAuthor({ 
              name: msg.author.username, 
              iconURL: msg.author.displayAvatarURL({ size: 512 }) 
          })
          .setDescription(`**Aktion:** \`!${commandName}\`\n**Ziel:** ${target}\n**Inhalt:**\n\`\`\`${content || "Kein Inhalt"}\`\`\``)
          .setFooter({ text: 'Kekse Clan | Command Logs' })
          .setTimestamp();
        await logChannel.send({ embeds: [kekseEmbed] });
      }
    };
    if (cmd === "send") {
      await deleteCmd();
      const channel = msg.mentions.channels.first();
      const text = msg.content.replace(/^!send\s+<#[0-9]+>\s?/, "").trim();
      if (channel && text) {
        await channel.send(text);
        await sendKekseLog("send", channel.toString(), text);
      }
    }
    if (cmd === "changelog") {
      await deleteCmd();
      const changelogChannel = msg.guild.channels.cache.get("1464993818968588379");
      if (!changelogChannel || args.length === 0) return;
      const date = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
      const updateList = args.map(item => `- ${item}`).join("\n");
      const messageFormat = `<@&1464994942345547857>\n**:wrench: Änderungen (${date})**\n${updateList}`;
      await changelogChannel.send(messageFormat);
      await sendKekseLog("changelog", changelogChannel.toString(), updateList);
    }
    if (cmd === "embed") {
      await deleteCmd();
      const channel = msg.mentions.channels.first();
      const title = args[1];
      const text = args[2];
      const color = args[3] || "#ffffff";
      if (channel && title && text) {
        const embed = new EmbedBuilder().setTitle(title).setDescription(text).setColor(color);
        await channel.send({ embeds: [embed] });
        await sendKekseLog("embed", channel.toString(), `Titel: ${title}\nText: ${text}`);
      }
    }
    if (cmd === "dm") {
      await deleteCmd();
      const userId = args[0];
      const text = args.slice(1).join(" ");
      const user = await client.users.fetch(userId).catch(() => null);
      if (user && text) {
        await user.send(text).catch(() => {});
        await sendKekseLog("dm", `${user.tag} (${userId})`, text);
      }
    }
    if (cmd === "news") {
      await deleteCmd();
      const channel = msg.mentions.channels.first();
      if (!channel) return;
      let rawText = msg.content.replace(/^!news\s+<#[0-9]+>\s?/, "").trim();
      if (!rawText) return;
      const emojiMap = { "regles": "1467246063122649180", "mail": "1467246078226334040", "like": "1467246068235501733", "management": "1467246065437642999", "moins": "1467246060689690849", "info": "1467246059561685238", "web": "1467246058341142833", "dislike": "1467246057070268681", "logs": "1467246054910070938", "check": "1467246053911957759", "staff": "1467246044772569218", "lien": "1467246043182924040", "identifiant": "1467246041668780227", "cybersecurite": "1467246039731015794", "statistiques": "1467246038497886311", "administrateur": "1467246035922321478", "croix": "1467246034580410429", "certifier": "1467246033389092904", "supprimer": "1467246032181006499", "profil": "1467246030998343733", "moderateur": "1467246028758712575", "crayon": "1467246026846109821", "stats": "1467246025411658012", "ouvert": "1467246023872352358", "discordoff": "1467246022668583147", "warningicon": "1467246020445339875", "2nd": "1467246019556282533", "discordon": "1467246018218430696", "1st": "1467246016926453810", "help": "1467246015332618372", "timeout": "1467246013487255705", "unstableping": "1467246011578712186", "yinfo": "1467246010349785119", "3rd": "1467246008734847138", "failed": "1467246005870264352", "mute": "1467246003890425928", "verified": "1467246002628202507", "cross": "1467246000258420767", "interruption": "1467245998043824128", "checkmark": "1467245996584210554", "moderatorprogramsalumnia": "1467245995510337659", "pingeveryone": "1453800508329558218", "ping": "1453799622303813714", "pepecookie": "1453796363442585660" };
      const formattedText = rawText.replace(/:([a-zA-Z0-9_]+):/g, (match, name) => {
        return emojiMap[name] ? `<:emoji:${emojiMap[name]}>` : match;
      });
      await channel.send(formattedText);
      await sendKekseLog("news", channel.toString(), rawText);
    }
    if (cmd === "reply") {
      await deleteCmd();
      const channelMention = msg.mentions.channels.first() || msg.channel;
      const msgId = args.find(a => /^\d{17,20}$/.test(a));
      let text = args.filter(a => !a.includes(msgId) && !a.startsWith("<#")).join(" ");
      if (!msgId || !text) return;
      try {
        const targetMsg = await channelMention.messages.fetch(msgId);
        targetMsg.system ? await channelMention.send(text) : await targetMsg.reply(text);
        await sendKekseLog("reply", `Nachricht ID ${msgId}`, text);
      } catch (err) {
        await msg.channel.send("❌ Nachricht nicht gefunden.").then(m => setTimeout(() => m.delete(), 3000));
      }
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
    registerMessageCommands(client);
    initReminder(client);
})
client.setMaxListeners(20);
client.on("error", console.error)
client.on("warn", console.warn)
client.login(process.env.BOT_TOKEN)
