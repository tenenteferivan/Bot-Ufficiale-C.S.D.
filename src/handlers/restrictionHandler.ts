import {
  GuildMember,
} from 'discord.js';

import {
  getRestriction,
} from '../utils/restrictionManager';

export async function handleRestrictionJoin(
  member: GuildMember
): Promise<void> {

  /*
   * ==========================================================
   * SERVIDOR PRINCIPAL — GUILD_ID
   * ==========================================================
   *
   * El servidor configurado en GUILD_ID está completamente
   * excluido del sistema de restricciones.
   *
   * Un usuario restringido podrá entrar y permanecer
   * normalmente en este servidor.
   *
   * La restricción seguirá activa para los demás servidores.
   *
   * ==========================================================
   */

  const GUILD_ID =
    process.env.GUILD_ID;

  if (
    GUILD_ID &&
    member.guild.id === GUILD_ID
  ) {
    console.log(
      `[RESTRICTION] ${member.user.tag} (${member.id}) è entrato nel server principale ${member.guild.name} (${member.guild.id}). Restrizione ignorata.`
    );

    return;
  }


  /*
   * ==========================================================
   * CONTROLLO RESTRIZIONE
   * ==========================================================
   */

  const restriction =
    getRestriction(
      member.user.id
    );

  /*
   * L'utente non è ristretto.
   */

  if (!restriction) {
    return;
  }


  /*
   * ==========================================================
   * CONTROLLO KICK
   * ==========================================================
   */

  if (
    !member.kickable
  ) {

    console.error(
      `[RESTRICTION] Impossibile espellere ${member.user.tag} (${member.id}) dal server ${member.guild.name} (${member.guild.id}). Il bot non è kickable.`
    );

    return;
  }


  /*
   * ==========================================================
   * KICK
   * ==========================================================
   */

  try {

    await member.kick(
      `[RESTRICTION] ${restriction.motivo} | Durata: ${restriction.durata} | Operatore: ${restriction.operatorTag}`
    );

    console.log(
      `[RESTRICTION] ${member.user.tag} (${member.id}) espulso da ${member.guild.name} (${member.guild.id}). Motivo: ${restriction.motivo}`
    );

  } catch (error) {

    console.error(
      `[RESTRICTION] Errore durante l'espulsione di ${member.user.tag} (${member.id}) dal server ${member.guild.name} (${member.guild.id}):`,
      error
    );
  }
}