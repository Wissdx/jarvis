import { writeFileSync, readFileSync } from "node:fs";
import { getInsultsInMessage } from "./social_credit_tracker.js";

export const CACHE_PATH = "./cache/messages.json";

export async function getAllMessages(client) {
	const guild = await client.guilds.fetch(process.env.GUILD_ID);
	const channels = await guild.channels
		.fetch()
		.then((channels) => channels.filter((channel) => channel.type === 0));

	const storedData = {};

	for (const [_, channel] of channels) {
		try {
			let lastMessageId = null;

			while (true) {
				const fetchOptions = { limit: 100 };
				if (lastMessageId) fetchOptions.before = lastMessageId;

				const messages = await channel.messages.fetch(fetchOptions);
				console.log("Fetching messages from %s : %s", channel.name, messages.size);

				if (messages.size === 0) break;
				lastMessageId = messages.last().id;

				for (const message of messages.values()) {
					if (message.author.bot) continue;

					if (!storedData[message.author.id]) {
						storedData[message.author.id] = {};
					}

					const insults = getInsultsInMessage(message);
					if (!insults.length) continue;
					for (const insult of insults) {
						if (!storedData[message.author.id][insult]) {
							storedData[message.author.id][insult] = 0;
						}
						storedData[message.author.id][insult]++;
					}
				}
			}
		} catch (error) {
			console.error("Error on messages retrieval:", error);
		}
	}

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
	if (!insults.length) return;
	for (const insult of insults) {
		if (!storedData[message.author.id][insult]) {
			storedData[message.author.id][insult] = 0;
		}
		storedData[message.author.id][insult]++;
	}

	writeFileSync(CACHE_PATH, JSON.stringify(storedData, null, 2), "utf8");
}
