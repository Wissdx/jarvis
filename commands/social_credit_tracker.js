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

const insultRegex = new RegExp(insults.join("|"), 'g');

const images = {
	perfect:
		"https://images.steamusercontent.com/ugc/1874060099622312925/B6030AC366ABC8133394A09D1229ECFC07EF5675/?imw=5000&imh=5000&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false",
	good: "https://www.diggitmagazine.com/sites/default/files/styles/content_image_fluid_md/public/DCS%2520SoCS%2520Meme%2520Original%2520r%2520scm.jpg.webp?itok=Ou07fCZm",
	okay: "https://www.diggitmagazine.com/sites/default/files/styles/content_image_fluid_md/public/DCS%2520SoCS%2520Meme%2520Cena%2520BingChiling%2520r%2520memes.jpg.webp?itok=3gJD1BIy",
	bad: "https://media.tenor.com/idNGiIHv6cgAAAAe/social-credit-score-social.png",
	disastrous:
		"https://i.pinimg.com/736x/3e/93/df/3e93df19c2a27b3b1fe3d482d47e2940.jpg",
};

export async function handleSocialCredit(interaction) {
	try{
		const channels = getChannels(interaction.guild);
		const targetUser = interaction.options.getUser("utilisateur");
		const BASE_CREDIT = 100;
	
		const messagesPromises = channel.map((channel) =>
			getAllMessagesInChannel(channel, targetUser),
		);
		const messages = await Promise.all(messagesPromises);
		const allMessages = messages.flat();
	
		const insultsCount = new Map();
		allMessages.forEach((message) => {
			const content = message.content
				.normalize("NFD")
				.replace(/\p{Diacritic}/gu, "");
	
			getInsultsInMessage(content).forEach((insult) => {
				const normalizedInsult = insult.normalize("NFD").replace(/\p{Diacritic}/gu, "");
				insultsCount.set(normalizedInsult, (insultsCount.get(normalizedInsult) || 0) + 1);
			});
		});

		if (totalInsults === 0) {
			return interaction.followUp({
				content: `Aucune insulte trouvée pour ${targetUser.tag}.`,
				ephemeral: true,
			});
		}

		const totalInsults = Array.from(insultsCount.values()).reduce((a, b) => a + b, 0);
		const sortedInsults = Array.from(insultsCount.entries())
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
		const socialCredits = BASE_CREDIT - totalInsults * 2;
		let socialCreditStatus;

		if (socialCredits >= 75) {
			socialCreditStatus = images.perfect;
		}
		else if (socialCredits >= 50) {
			socialCreditStatus = images.good;
		} else if (socialCredits >= 25) {
			socialCreditStatus = images.okay;
		} else if (socialCredits >= 0) {
			socialCreditStatus = images.bad;
		} else {
			socialCreditStatus = images.disastrous;
		}

		const embed = {
			color: 0xff0000,
			title: `Calculateur crédits sociaux pour ${targetUser.username}`,
			description: [
				`**Crédit sociaux restants:** ${socialCredits}`,
				"",
				"```",
				header,
				divider,
				...tableRows,
				"```",
			].join("\n"),
			thumbnail: {
				url: socialCreditStatus,
			},
			timestamp: new Date(),
		};

		await interaction.followUp({ embeds: [embed] });

	} catch {
		console.error("Error in insult tracker:", error);
		await interaction.followUp({
			content: "Une erreur s'est produite lors de la recherche d'insultes.",
			ephemeral: true,
		});
	}
}

const getInsultsInMessage = (message) => {
	if(!message.content) return false;
	if (message.author.bot) return false;
	const insultsInMessage = message.toLowerCase().content.match(insultRegex);
	if(!insultsInMessage) return [];
	return insultsInMessage;
}



const getAllMessagesInChannel = async (channel, targetUser) => {
	// Get all messages in a channel without limit
	const messages = [];
	let lastMessageId = null;
	
	while (true) {
		const fetchOptions = { limit: 100 };
		if (lastMessageId) fetchOptions.before = lastMessageId;
		const fetchedMessages = await channel.messages.fetch(fetchOptions);
		if (fetchedMessages.size === 0) break;
		messages.push(...fetchedMessages.values());
		lastMessageId = fetchedMessages.last().id;
	}
	return messages.filter((message) => message.author.id === targetUser.id);
}

const getChannels = (guild) => {
	const channels = guild.channels.cache.filter(
		(channel) => channel.type === 0,
	);
	return channels;
}