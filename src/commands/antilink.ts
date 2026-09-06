import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import {
  addWhitelistedRole,
  addWhitelistedUser,
  removeWhitelistedRole,
  removeWhitelistedUser,
} from '../utils/antilinkManager';

export const data =
  new SlashCommandBuilder()
    .setName('antilink')
    .setDescription(
      'Gestisce la configurazione del sistema AntiLink.'
    )
    .addSubcommandGroup(
      (group) =>
        group
          .setName('whitelist')
          .setDescription(
            'Gestisce la whitelist del sistema AntiLink.'
          )
          .addSubcommand(
            (subcommand) =>
              subcommand
                .setName('add')
                .setDescription(
                  'Aggiunge un utente o un ruolo alla whitelist.'
                )
                .addUserOption(
                  (option) =>
                    option
                      .setName('utente')
                      .setDescription(
                        'Utente autorizzato a inviare link.'
                      )
                      .setRequired(false)
                )
                .addRoleOption(
                  (option) =>
                    option
                      .setName('ruolo')
                      .setDescription(
                        'Ruolo autorizzato a inviare link.'
                      )
                      .setRequired(false)
                )
          )
          .addSubcommand(
            (subcommand) =>
              subcommand
                .setName('remove')
                .setDescription(
                  'Rimuove un utente o un ruolo dalla whitelist.'
                )
                .addUserOption(
                  (option) =>
                    option
                      .setName('utente')
                      .setDescription(
                        'Utente da rimuovere dalla whitelist.'
                      )
                      .setRequired(false)
                )
                .addRoleOption(
                  (option) =>
                    option
                      .setName('ruolo')
                      .setDescription(
                        'Ruolo da rimuovere dalla whitelist.'
                      )
                      .setRequired(false)
                )
          )
    );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content:
        '❌ Questo comando può essere utilizzato solo nei server.',
      flags:
        MessageFlags.Ephemeral,
    });

    return;
  }

  if (
    !interaction.memberPermissions?.has(
      'ManageGuild'
    )
  ) {
    await interaction.reply({
      content:
        '❌ Non disponi dei permessi necessari per utilizzare questo comando.',
      flags:
        MessageFlags.Ephemeral,
    });

    return;
  }

  const group =
    interaction.options.getSubcommandGroup();

  const subcommand =
    interaction.options.getSubcommand();

  if (
    group !== 'whitelist'
  ) {
    return;
  }

  const user =
    interaction.options.getUser(
      'utente'
    );

  const role =
    interaction.options.getRole(
      'ruolo'
    );

  if (!user && !role) {
    await interaction.reply({
      content:
        '❌ Devi specificare un **utente** oppure un **ruolo**.',
      flags:
        MessageFlags.Ephemeral,
    });

    return;
  }

  if (user && role) {
    await interaction.reply({
      content:
        '❌ Devi specificare solamente un **utente** oppure un **ruolo**, non entrambi.',
      flags:
        MessageFlags.Ephemeral,
    });

    return;
  }

  if (
    subcommand === 'add'
  ) {
    if (user) {
      const added =
        addWhitelistedUser(
          interaction.guild.id,
          user.id
        );

      if (!added) {
        await interaction.reply({
          content:
            `⚠️ ${user} è già presente nella whitelist AntiLink.`,
          flags:
            MessageFlags.Ephemeral,
        });

        return;
      }

      await interaction.reply({
        content:
          `✅ ${user} è stato aggiunto alla whitelist AntiLink.`,
        flags:
          MessageFlags.Ephemeral,
      });

      return;
    }

    if (role) {
      const added =
        addWhitelistedRole(
          interaction.guild.id,
          role.id
        );

      if (!added) {
        await interaction.reply({
          content:
            `⚠️ Il ruolo ${role} è già presente nella whitelist AntiLink.`,
          flags:
            MessageFlags.Ephemeral,
        });

        return;
      }

      await interaction.reply({
        content:
          `✅ Il ruolo ${role} è stato aggiunto alla whitelist AntiLink.`,
        flags:
          MessageFlags.Ephemeral,
      });

      return;
    }
  }

  if (
    subcommand === 'remove'
  ) {
    if (user) {
      const removed =
        removeWhitelistedUser(
          interaction.guild.id,
          user.id
        );

      if (!removed) {
        await interaction.reply({
          content:
            `⚠️ ${user} non è presente nella whitelist AntiLink.`,
          flags:
            MessageFlags.Ephemeral,
        });

        return;
      }

      await interaction.reply({
        content:
          `✅ ${user} è stato rimosso dalla whitelist AntiLink.`,
        flags:
          MessageFlags.Ephemeral,
      });

      return;
    }

    if (role) {
      const removed =
        removeWhitelistedRole(
          interaction.guild.id,
          role.id
        );

      if (!removed) {
        await interaction.reply({
          content:
            `⚠️ Il ruolo ${role} non è presente nella whitelist AntiLink.`,
          flags:
            MessageFlags.Ephemeral,
        });

        return;
      }

      await interaction.reply({
        content:
          `✅ Il ruolo ${role} è stato rimosso dalla whitelist AntiLink.`,
        flags:
          MessageFlags.Ephemeral,
      });
    }
  }
}