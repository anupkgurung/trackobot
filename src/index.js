//require("dotenv").config();
import dotenv from "dotenv";
dotenv.config();
import { Client, Events, GatewayIntentBits } from "discord.js";
import { SEARCH } from "./command.js";
const TARGET_USER_ID = "777162675243319347";
const applicationId = process.env.APP_ID;
const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.GUILD_ID;
//"154585730465660929";

import WebSocket from "ws";
const url = process.env.BASE_URL;

async function getWSUrl() {
  const response = await fetch(url + "/v10/gateway/bot", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${token}`,
    },
    method: "GET",
  });
  const data = await response.json();
  if (data) {
    const ws = new WebSocket(data.url + "?v=10&encoding=json");

    ws.on("open", () => {
      console.log("oepn connection");
    });

    ws.on("message", (data) => {
      const parsedData = JSON.parse(data);

      if (parsedData.op === 10) {
        //op contain the code which is 10 meaning hello
        const interval = parsedData?.d?.heartbeat_interval;
        startHeartBeat(ws, interval);

        ws.send(
          JSON.stringify({
            op: 2,
            d: {
              token,
              intents: 53608447,
              properties: {
                os: "mac",
                browser: "arc",
                device: "mac",
              },
            },
          }),
        );
      }
      if (parsedData.t === "INTERACTION_CREATE") {
        handleInteraction(parsedData.d);
      }
    });
  }
}

function startHeartBeat(ws, interval) {
  setInterval(function () {
    ws.send(JSON.stringify({ op: 1, d: null }));
  }, interval);
}

async function handleInteraction(interaction) {
  const word = interaction.data.options.find((o) => o.name === "word");
  const minChars = interaction.data.options.find(
    (o) => o.name === "min_characters",
  );

  threeSecondsResponseWindow(interaction);

  const results = await handleSearch(word, minChars);

  // format results
  if (results.length === 0) {
    await editInteractionResponse(
      interaction,
      `No messages found containing **${word}** longer than **${minChars}** characters.`,
    );
    return;
  }

  const output = results
    .map(
      (r) =>
        `**#${r.channel}** | **${r.author}** (${r.length} chars)\n${r.content.slice(0, 200)}`,
    )
    .join("\n\n");

  // discord has 2000 character limit per message
  await editInteractionResponse(interaction, output.slice(0, 2000));
}

async function editInteractionResponse(interaction, content) {
  const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interaction.token}/messages/@original`;

  await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${token}`,
    },
    body: JSON.stringify({
      content: content,
    }),
  });
}
function threeSecondsResponseWindow(interaction) {
  const url = `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`;
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${token}`,
    },
    body: JSON.stringify({
      type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
      data: {
        flags: 64, // ephemeral — only visible to the user who ran the command
      },
    }),
  });
}

async function handleSearch(searchFor, charterLimit) {
  const results = [];

  // first fetch all channels in the server
  const channelsResponse = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/channels`,
    {
      headers: {
        Authorization: `Bot ${token}`,
      },
    },
  );

  const channels = await channelsResponse.json();

  for (const channel of channels) {
    if (channel.type !== 0) continue;
    //messages?limit=100
    try {
      const messagesResponse = await fetch(
        `https://discord.com/api/v10/channels/${channel.id}`,
        {
          headers: {
            Authorization: `Bot ${token}`,
          },
        },
      );

      const messages = await messagesResponse.json();

      for (const message of messages) {
        if (
          message.content.toLowerCase().includes(searchFor.toLowerCase()) &&
          message.content.length > charterLimit
        ) {
          results.push({
            channel: channel.name,
            author: message.author.username,
            content: message.content,
            length: message.content.length,
          });
        }
      }
    } catch (err) {
      continue;
    }
  }

  return results;
}

async function registerCommands(url) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${token}`,
    },
    method: "PUT",
    body: JSON.stringify([SEARCH]),
  });

  if (response.ok) {
    console.log("Registered all commands");
  } else {
    console.error("Error registering commands");
    const text = await response.text();
    console.error(text);
  }
  return response;
}

async function registerGlobalCommands() {
  const url = `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`;
  await registerCommands(url);
}

getWSUrl();
await registerGlobalCommands();

// const client = new Client({ß
//   intents: [
//     GatewayIntentBits.Guilds,
//     GatewayIntentBits.GuildMembers,
//     GatewayIntentBits.GuildPresences,
//     GatewayIntentBits.GuildMessages,
//     GatewayIntentBits.MessageContent,
//   ],
// });

// client.once("clientReady", () => {
//   console.log(`Bot is online as ${client.user.tag}`);
// });

// client.on("presenceUpdate", (oldPresence, newPresence) => {
//   if (newPresence.userId !== TARGET_USER_ID) return;

//   const oldStatus = oldPresence ? oldPresence.status : "unknown";
//   const newStatus = newPresence.status;

//   console.log(`Status changed: ${oldStatus} → ${newStatus}`);
// });

// // client.on("raw", (payload) => {
// //   console.log(payload);
// // });

// client.login(token);
