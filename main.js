require("dotenv").config();

const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  Client,
  Intents,
  MessageActionRow,
  MessageButton,
  Permissions,
} = require("discord.js");
const dayjs = require("dayjs");
const express = require("express");
const bodyParser = require("body-parser");
const sqlite = require("sqlite3");

const DB = new sqlite.Database("./database.db");
DB.run(`CREATE TABLE IF NOT EXISTS customers (
  discordId VARCHAR(18) PRIMARY KEY
)`);

const {
  CLIENT_ID,
  TOKEN,
  SUGGESTIONS_CHANNEL_ID,
  HELP_CHANNEL_ID,
  API_PORT,
  GUILD_ID,
  CUSTOMER_ROLE_ID,
} = process.env;

const rest = new REST().setToken(TOKEN);
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

const slowmodeCommand = new SlashCommandBuilder()
  .setName("slowmode")
  .setDescription("Set slowmode")
  .setDefaultPermission(false)
  .addIntegerOption(option =>
    option
      .setName("delay")
      .setDescription("Delay in seconds")
      .setRequired(false),
  )
  .toJSON();

rest.put(Routes.applicationCommands(CLIENT_ID), {
  body: [slowmodeCommand],
});

client.once("ready", () => {
  console.log("Ready!");
});

const createSupportThread = async message => {
  const user = message.author;

  const date = dayjs().format("DD-MM-YYYY");
  const name = `${user.username} [${date}]`;

  const thread = await message.channel.threads.create({
    name,
    startMessage: message,
    reason: "Automatic thread creation for support message",
  });

  await thread.send(
    `Hej ${user}! Stworzyłem ten wątek automaycznie z Twojej wiadomości.`,
  );
  await thread.send({
    content:
      "Jeśli uzyskałeś już zadowalającą Cię pomoc użyj przycisku na dole, aby zamknąć wątek.",
    components: [
      new MessageActionRow().addComponents(
        new MessageButton()
          .setStyle("PRIMARY")
          .setLabel("Zamknij wątek")
          .setCustomId("close-support-thread"),
      ),
    ],
  });
};

const createSuggestionThread = async message => {
  let name = message.content;

  if (name.length > 100) {
    name = `${name.slice(0, 97)}...`;
  }

  message.channel.threads.create({
    name,
    startMessage: message,
    reason: "Automatic thread creation for suggestion",
  });

  message.react("✅");
  message.react("❌");
};

client.on("messageCreate", async message => {
  if (message.channelId === HELP_CHANNEL_ID && !message.hasThread) {
    createSupportThread(message);
  }

  if (message.channelId === SUGGESTIONS_CHANNEL_ID && !message.hasThread) {
    createSuggestionThread(message);
  }
});

client.on("interactionCreate", async interaction => {
  if (interaction.isCommand() && interaction.commandName === "slowmode") {
    const delay = interaction.options.getInteger("delay") ?? 0;

    await interaction.channel.setRateLimitPerUser(delay);

    await interaction.reply({
      content: `Set slowmode to ${delay} seconds`,
      ephemeral: true,
    });
  }

  if (
    interaction.isButton() &&
    interaction.customId === "close-support-thread" &&
    interaction.channel.isThread()
  ) {
    const { user, member } = interaction;

    const starterMessage = await interaction.channel.fetchStarterMessage();
    const ownerId = starterMessage.author.id;

    const hasPermissionToClose =
      ownerId === user.id ||
      member.permissions.has(Permissions.FLAGS.MANAGE_THREADS);

    if (!hasPermissionToClose) {
      await interaction.reply({
        content: "Nie jesteś właścicielem tego wątku!",
        ephemeral: true,
      });
      return;
    }

    await interaction.reply(`Wątek zamknięty przez ${user}!`);
    await interaction.channel.setArchived(true);
    await interaction.channel.setLocked(true);
  }
});

client.login(TOKEN);

const addRole = async userId => {
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(userId);

  if (!member) {
    return;
  }

  await member.roles.add(CUSTOMER_ROLE_ID);
};

const removeRole = async userId => {
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(userId);

  if (!member) {
    return;
  }

  await member.roles.remove(CUSTOMER_ROLE_ID);
};

const app = express();
app.use(bodyParser.json());

app.post("/api/add-customer", async (req, res) => {
  await addRole(req.body.discordId);
  res.status(204).send();
});

app.post("/api/remove-customer", async (req, res) => {
  await removeRole(req.body.discordId);
  res.status(204).send();
});

app.listen(API_PORT);
