const insults = [
	"merde",
	"con",
	"connerie",
	"bullshit",
	"salope",
	"putain",
	"putin",
	"ptn",
	"pute",
	"nazi",
	"enculé",
	"bordel",
	"nique",
	"chié",
	"fils de pute",
	"fdp",
	"va te faire",
	"foutre",
	"connard",
	"salopard",
	"branler",
	"pd",
	"sucer",
	"fion",
	"trou du cul",
	"zoophile",
	"raciste",
	"homophobe",
	"connasse",
	"bouffon",
	"nique ta mère",
	"ntm",
	"ta gueule",
	"tg",
	"saloperie",
	"sac à merde",
	"tarlouze",
	"fils de chien",
	"taré",
	"putain de merde",
	"bâtard",
	"pouffiasse",
	"gogole",
	"pétasse",
	"gros porc",
	"sale bâtard",
	"suceur",
	"imbécile",
	"clodo",
	"culs",
	"foutre",
	"baiseur",
	"ordure",
	"gros suceur",
	"bite",
];

function escapeRegExp(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function handleInsultTracker(interaction) {
	const targetUser = interaction.options.getUser("utilisateur");

	if (!targetUser) {
		return interaction.reply({
			content: "Utilisateur non trouvé.",
			ephemeral: true,
		});
	}

	await interaction.deferReply();

	try {
		const channels = interaction.guild.channels.cache.filter(
			(channel) => channel.type === 0,
		);

		let totalInsults = 0;
		const insultCounts = {};

		for (const insult of insults) {
			insultCounts[insult] = 0;
		}

		for (const [_, channel] of channels) {
			try {
				let lastMessageId = null;
				let processedMessages = 0;
				const MAX_MESSAGES_PER_CHANNEL = 5000;

				while (processedMessages < MAX_MESSAGES_PER_CHANNEL) {
					try {
						const fetchOptions = { limit: 100 };
						if (lastMessageId) fetchOptions.before = lastMessageId;

						const messages = await channel.messages.fetch(fetchOptions);
						if (messages.size === 0) break;

						processedMessages += messages.size;
						lastMessageId = messages.last().id;

						for (const message of messages.values()) {
							if (message.author.id === targetUser.id) {
								const content = message.content
									.normalize("NFD")
									.replace(/\p{Diacritic}/gu, "");

								for (const insult of insults) {
									const regex = new RegExp(
										escapeRegExp(
											insult.normalize("NFD").replace(/\p{Diacritic}/gu, ""),
										),
										"gi",
									);
									const matches = content.match(regex);

									if (matches) {
										insultCounts[insult] += matches.length;
										totalInsults += matches.length;
									}
								}
							}
						}

						await new Promise((resolve) => setTimeout(resolve, 750));
					} catch (error) {
						if (error.code === 50035) {
							break;
						}
						console.error(`Error fetching messages in ${channel.name}:`, error);
						await new Promise((resolve) => setTimeout(resolve, 2000));
					}
				}
			} catch (error) {
				console.error(`Error processing channel ${channel.name}:`, error);
			}
		}

		if (totalInsults === 0) {
			return interaction.followUp({
				content: `Aucune insulte trouvée pour ${targetUser.tag}.`,
				ephemeral: true,
			});
		}

		const sortedInsults = Object.entries(insultCounts)
			.filter(([_, count]) => count > 0)
			.sort((a, b) => b[1] - a[1]);

		const tableRows = sortedInsults.map(([insult, count]) => {
			const countStr = count.toString().padStart(5);
			return `${countStr} │ ${insult}`;
		});

		const maxCountLength = sortedInsults.reduce((max, [_, count]) => {
			return Math.max(max, count.toString().length);
		}, 0);

		const header = "Compt. │ Insulte";
		const divider = `${"─".repeat(7 + maxCountLength)}${"─".repeat(30)}`;

		const embed = {
			color: 0xff0000,
			title: `Insulte Tracker pour ${targetUser.username}`,
			description: [
				`**Total d'insultes:** ${totalInsults}`,
				"",
				"```",
				header,
				divider,
				...tableRows,
				"```",
			].join("\n"),
			thumbnail: {
				url: targetUser.displayAvatarURL({ dynamic: true }),
			},
			timestamp: new Date(),
		};

		await interaction.followUp({ embeds: [embed] });
	} catch (error) {
		console.error("Error in insult tracker:", error);
		await interaction.followUp({
			content: "Une erreur s'est produite lors de la recherche d'insultes.",
			ephemeral: true,
		});
	}
}
