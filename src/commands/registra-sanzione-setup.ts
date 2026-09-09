import {
	ChannelType,
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	MessageFlags,
	SlashCommandBuilder,
} from 'discord.js';

import { isOperator } from '../utils/userRecord';
import { saveSanctionConfig } from '../handlers/databasehandler';

export const data = new SlashCommandBuilder()
	.setName('registra-sanzione-setup')
	.setDescription('Configura il canale per la pubblicazione delle sanzioni disciplinari.')
	.addChannelOption((option) =>
		option
			.setName('canale')
			.setDescription('Canale dove verranno pubblicate le sanzioni disciplinari.')
			.addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
			.setRequired(true)
	);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	if (!isOperator(interaction.member)) {
		await interaction.reply({
			content: '❌ Non disponi delle autorizzazioni necessarie per configurare il canale delle sanzioni.',
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	if (!interaction.guild) {
		await interaction.reply({
			content: '❌ Questo comando è disponibile solo nei server.',
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	const configuredGuildId = process.env.GUILD_ID?.trim();
	if (!configuredGuildId || interaction.guild.id !== configuredGuildId) {
		await interaction.reply({
			content: '❌ Questo comando può essere utilizzato solo nel server autorizzato.',
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	const channel = interaction.options.getChannel('canale', true) as any;
	if (channel.guildId !== interaction.guild.id || !channel.isTextBased() || typeof channel.send !== 'function') {
		await interaction.reply({
			content: '❌ Il canale deve essere testuale e appartenere a questo server.',
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	const botPermissions = channel.permissionsFor(interaction.client.user);
	if (!botPermissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
		await interaction.reply({
			content: '❌ Il bot non può visualizzare o inviare messaggi nel canale selezionato.',
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	try {
		await saveSanctionConfig(interaction.guild.id, channel.id);
		await interaction.reply({
			content: `✅ Il canale per le sanzioni disciplinari è stato configurato correttamente su ${channel}.`,
			flags: MessageFlags.Ephemeral,
		});
	} catch (error) {
		console.error('[SANZIONE SETUP] Errore durante la configurazione del canale:', error);
		await interaction.reply({
			content: '❌ Si è verificato un errore durante la configurazione del canale delle sanzioni.',
			flags: MessageFlags.Ephemeral,
		});
	}
}
