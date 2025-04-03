import { writeFileSync, readFileSync } from "node:fs";
import { getInsultsInMessage } from "./social_credit_tracker.js";

export const CACHE_PATH = "./cache/messages.json";

const getChannels = async (guild) => await guild.channels
	.fetch()
	.then((channels) => channels.filter((channel) => channel.type === 0));

export async function getAllMessages(client) {
	const guild = await client.guilds.fetch(process.env.GUILD_ID);
	const channels = await getChannels(guild);

	const storedData = {};

	const channelsResults = channels.map(async (channel) => {
		try {
			let lastMessageId = null;

			while (true) {
				const fetchOptions = { limit: 100 };
				if (lastMessageId) fetchOptions.before = lastMessageId;

				const messages = await channel.messages.fetch(fetchOptions);
				console.log("Fetching messages from %s : %s", channel.name, messages.size);

				if (messages.size === 0) break;
				lastMessageId = messages.last().id;

				messages.values().forEach(message => {
					if (message.author.bot) return;

					if (!storedData[message.author.id]) {
						storedData[message.author.id] = {};
					}

					const insults = getInsultsInMessage(message);

					if (!insults.length) return;
					insults.forEach(insult => {
						if (!storedData[message.author.id][insult]) {
							storedData[message.author.id][insult] = 0;
						}
						storedData[message.author.id][insult]++;
					});
				});
			}
		} catch (error) {
			console.error("Error on messages retrieval:", error);
		}
	});

	await Promise.all(channelsResults);

	const jsonData = JSON.stringify(storedData, null, 2);
	writeFileSync(CACHE_PATH, jsonData, "utf8");
	console.log("All messages stored successfully.");
}

export function storeMessage(message) {
	const storedData = JSON.parse(readFileSync(CACHE_PATH, "utf8"));

	if (!storedData[message.author.id]) {
		storedData[message.author.id] = {};
	}

	const insults = getInsultsInMessage(message);

	if (insults) {
		for (const insult of insults) {
			if (!storedData[message.author.id][insult]) {
				storedData[message.author.id][insult] = 0;
			}
			storedData[message.author.id][insult]++;
		}
	}

	writeFileSync(CACHE_PATH, JSON.stringify(storedData, null, 2), "utf8");

	const data = readFileSync(CACHE_PATH, "utf8");
	const insultsCount = JSON.parse(data);

	const userInsults = insultsCount[targetUser.id];

	const sortedInsults = Object.entries(userInsults).sort((a, b) => b[1] - a[1]);
	const totalInsults = sortedInsults.reduce((sum, [_, count]) => sum + count, 0);

	let newNickName = `${message.author.username}[${100-totalInsults}]`;
	if(/.*\[-?[0-9]+\]/.test(message.author.username)) newNickName = message.author.username.replace(/\[-?[0-9]+\]/, `[-${100-totalInsults}]`);
	message.author.setNickname(
		newNickName,
		"Updated nickname based on insults count"
	).catch(console.error);
}
