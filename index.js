const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");

const TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!TOKEN) {
  console.error("❌ Missing Token");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

let data = {};
if (fs.existsSync("xp.json")) {
  data = JSON.parse(fs.readFileSync("xp.json"));
}

function save() {
  fs.writeFileSync("xp.json", JSON.stringify(data, null, 2));
}

function initUser(id) {
  if (!data[id]) {
    data[id] = {
      xp: 0,
      missions: 0,
      level: 0,
      playerID: Math.floor(1000 + Math.random() * 9000)
    };
  }
}

function getLevel(xp) {
  return Math.floor(xp / 500);
}

function getTitle(level) {
  if (level >= 20) return "🏆 Legend";
  if (level >= 10) return "🔥 Veteran";
  if (level >= 5) return "⚡ Operator";
  return "🆕 Rookie";
}

// 🎮 GIVE XP
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith("!givexp")) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply("❌ No permission");
    }

    const user = message.mentions.users.first();
    const amount = parseInt(message.content.split(" ")[2]);

    if (!user || isNaN(amount)) {
      return message.reply("❌ !givexp @user amount");
    }

    initUser(user.id);

    const oldLevel = getLevel(data[user.id].xp);

    data[user.id].xp += amount;
    data[user.id].missions++;

    const newLevel = getLevel(data[user.id].xp);

    if (newLevel > oldLevel) {
      const embed = new EmbedBuilder()
        .setColor("#00ff99")
        .setTitle("🔥 LEVEL UP!")
        .setDescription(`${user} reached level ${newLevel}`)
        .setThumbnail(user.displayAvatarURL());

      message.channel.send({ embeds: [embed] });
    }

    save();
    message.channel.send(`✅ +${amount} XP`);
  }

  // 👤 PROFILE
  if (message.content.startsWith("!profile")) {
    const user = message.mentions.users.first() || message.author;
    initUser(user.id);

    const u = data[user.id];
    const level = getLevel(u.xp);

    const embed = new EmbedBuilder()
      .setColor("#00ccff")
      .setTitle("🎮 Profile")
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: "🪪 ID", value: `#${u.playerID}`, inline: true },
        { name: "⭐ XP", value: `${u.xp}`, inline: true },
        { name: "🏆 Level", value: `${level}`, inline: true },
        { name: "🎮 Missions", value: `${u.missions}`, inline: true },
        { name: "🎖 Rank", value: getTitle(level), inline: true }
      );

    message.channel.send({ embeds: [embed] });
  }

  // 🏆 LEADERBOARD
  if (message.content === "!leaderboard") {
    const sorted = Object.entries(data)
      .sort((a, b) => b[1].xp - a[1].xp)
      .slice(0, 10);

    const desc = sorted.map((p, i) => {
      return `#${i + 1} <@${p[0]}> — ${p[1].xp} XP`;
    }).join("\n");

    const embed = new EmbedBuilder()
      .setColor("#ffd700")
      .setTitle("🏆 Top Players")
      .setDescription(desc || "No data");

    message.channel.send({ embeds: [embed] });
  }

  // 🖼️ CARD
  if (message.content.startsWith("!card")) {
    const user = message.mentions.users.first() || message.author;
    initUser(user.id);

    const u = data[user.id];

    const canvas = createCanvas(800, 300);
    const ctx = canvas.getContext("2d");

    const bg = await loadImage("./assets/card-bg.png");
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    const avatar = await loadImage(user.displayAvatarURL({ extension: "png" }));
    ctx.drawImage(avatar, 50, 50, 150, 150);

    ctx.fillStyle = "#fff";
    ctx.font = "30px Arial";
    ctx.fillText(user.username, 250, 100);
    ctx.fillText(`XP: ${u.xp}`, 250, 150);
    ctx.fillText(`Lv: ${getLevel(u.xp)}`, 250, 200);

    message.channel.send({
      files: [{ attachment: canvas.toBuffer(), name: "card.png" }]
    });
  }
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(TOKEN);
