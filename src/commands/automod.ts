import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, MessageFlags } from 'discord.js';
import { db } from '../handlers/databasehandler';

export const data = new SlashCommandBuilder()
  .setName('automod')
  .setDescription('Gestione della configurazione di AutoMod')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommandGroup((group) =>
    group
      .setName('wl')
      .setDescription('Gestione della lista di esclusione utenti per AutoMod')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('add')
          .setDescription('Aggiunge un utente alla lista di esclusione di AutoMod')
          .addUserOption((option) =>
            option
              .setName('utente')
              .setDescription('Utente da escludere dai controlli di AutoMod')
              .setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('remove')
          .setDescription('Rimuove un utente dalla lista di esclusione di AutoMod')
          .addUserOption((option) =>
            option
              .setName('utente')
              .setDescription('Utente da rimuovere dalla lista di esclusione')
              .setRequired(true)
          )
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;

  const subcommandGroup = interaction.options.getSubcommandGroup();
  const subcommand = interaction.options.getSubcommand();

  if (subcommandGroup === 'wl') {
    const targetUser = interaction.options.getUser('utente', true);
    const guildId = interaction.guild.id;

    if (subcommand === 'add') {
      db.run(
        'INSERT OR IGNORE INTO automod_whitelist (guildId, targetId, type, userId) VALUES (?, ?, ?, ?)',
        [guildId, targetUser.id, 'USER', targetUser.id],
        async function (err) {
          if (err) {
            console.error('Errore database lista di esclusione, aggiunta:', err);
            return interaction.reply({ content: '❌ Errore durante il salvataggio nel database.', flags: MessageFlags.Ephemeral });
          }

          // 1. Invia un messaggio privato all'utente
          let dmSent = true;
          const dmEmbed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('🛡️ Lista di esclusione AutoMod')
            .setDescription(`Sei stato aggiunto alla lista di esclusione di AutoMod nel server **${interaction.guild?.name}**. I tuoi messaggi non saranno più filtrati dal sistema.`)
            .setTimestamp();

          await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
            dmSent = false;
          });

          // 2. Risponde pubblicamente nel canale
          const publicEmbed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Utente aggiunto alla lista di esclusione')
            .setDescription(`L'utente ${targetUser} è stato aggiunto con successo alla lista di esclusione di AutoMod.`)
            .addFields({
              name: '📬 Notifica DM',
              value: dmSent ? '`Inviata con successo`' : '`Impossibile inviare (DM Chiusi)`',
              inline: true
            })
            .setFooter({ text: 'AutoMod Config' })
            .setTimestamp();

          return interaction.reply({ embeds: [publicEmbed] });
        }
      );
    } else if (subcommand === 'remove') {
      db.run(
        'DELETE FROM automod_whitelist WHERE guildId = ? AND (userId = ? OR targetId = ?)',
        [guildId, targetUser.id, targetUser.id],
        async function (err) {
          if (err) {
            console.error('Errore database lista di esclusione, rimozione:', err);
            return interaction.reply({ content: '❌ Errore durante la rimozione dal database.', flags: MessageFlags.Ephemeral });
          }

          if (this.changes === 0) {
            return interaction.reply({
              content: `⚠️ L'utente ${targetUser} non era presente nella lista di esclusione.`,
              flags: MessageFlags.Ephemeral,
            });
          }

          // 1. Invia un messaggio privato all'utente
          let dmSent = true;
          const dmEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('⚠️ Lista di esclusione AutoMod')
            .setDescription(`Sei stato rimosso dalla lista di esclusione di AutoMod nel server **${interaction.guild?.name}**. I tuoi messaggi saranno nuovamente controllati dal sistema.`)
            .setTimestamp();

          await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
            dmSent = false;
          });

          // 2. Risponde pubblicamente nel canale
          const publicEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('🗑️ Utente rimosso dalla lista di esclusione')
            .setDescription(`L'utente ${targetUser} è stato rimosso dalla lista di esclusione di AutoMod.`)
            .addFields({
              name: '📬 Notifica DM',
              value: dmSent ? '`Inviata con successo`' : '`Impossibile inviare (DM Chiusi)`',
              inline: true
            })
            .setFooter({ text: 'AutoMod Config' })
            .setTimestamp();

          return interaction.reply({ embeds: [publicEmbed] });
        }
      );
    }
  }
}