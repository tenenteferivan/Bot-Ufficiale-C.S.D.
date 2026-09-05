import { AttachmentBuilder, Message, TextChannel, User } from 'discord.js';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { TicketRecord, ticketCategories } from './ticketManager';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function fetchAllMessages(channel: TextChannel): Promise<Message[]> {
  const messages: Message[] = [];
  let before: string | undefined;

  while (true) {
    const batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
    if (!batch.size) break;
    messages.push(...batch.values());
    if (batch.size < 100) break;
    before = batch.last()?.id;
    if (!before) break;
  }

  return messages.sort((first, second) => first.createdTimestamp - second.createdTimestamp);
}

function messageHtml(message: Message): string {
  const authorName = escapeHtml(message.author.tag || message.author.username);
  const avatar = escapeHtml(message.author.displayAvatarURL({ extension: 'png', size: 64 }));
  const content = escapeHtml(message.content || '');
  const attachments = [...message.attachments.values()].map((attachment) => (
    `<li><a href="${escapeHtml(attachment.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(attachment.name ?? 'Allegato')}</a></li>`
  )).join('');
  const embeds = message.embeds.length ? `<div class="embed-note">${message.embeds.length} embed allegato/i</div>` : '';

  return `<article class="message">
    <img class="avatar" src="${avatar}" alt="">
    <div class="message-body">
      <div class="message-head"><strong>${authorName}</strong><time>${escapeHtml(message.createdAt.toLocaleString('it-IT'))}</time></div>
      ${content ? `<div class="content">${content}</div>` : ''}
      ${attachments ? `<ul class="attachments">${attachments}</ul>` : ''}
      ${embeds}
    </div>
  </article>`;
}

function buildHtml(channel: TextChannel, ticket: TicketRecord, closer: User, reason: string, messages: Message[]): string {
  const category = ticketCategories[ticket.category];
  const messageMarkup = messages.length
    ? messages.map(messageHtml).join('\n')
    : '<p class="empty">Nessun messaggio disponibile.</p>';

  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Transcript ticket #${ticket.ticketNumber}</title>
<style>
:root { color-scheme: light; --ink:#17202a; --muted:#687684; --line:#e4e9ee; --accent:#3b5ccc; --paper:#ffffff; --wash:#f3f6fa; }
* { box-sizing:border-box; }
body { margin:0; background:var(--wash); color:var(--ink); font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
.wrapper { max-width:980px; margin:0 auto; padding:42px 24px 56px; }
.header { background:linear-gradient(135deg,#202a44,#3b5ccc); color:#fff; border-radius:18px; padding:30px 34px; box-shadow:0 16px 38px rgba(34,52,92,.18); }
.kicker { margin:0 0 8px; opacity:.76; text-transform:uppercase; letter-spacing:.12em; font-size:11px; font-weight:700; }
h1 { margin:0; font-size:30px; line-height:1.15; }
.subtitle { margin:10px 0 0; opacity:.88; }
.meta { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:12px; margin:22px 0; }
.meta-card { background:var(--paper); border:1px solid var(--line); border-radius:12px; padding:15px 16px; }
.label { display:block; color:var(--muted); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; margin-bottom:5px; }
.value { font-size:14px; overflow-wrap:anywhere; }
.reason { background:#fff8e7; border-left:4px solid #f0ad2c; border-radius:10px; padding:15px 17px; margin-bottom:24px; }
.reason strong { display:block; margin-bottom:5px; }
.messages { background:var(--paper); border:1px solid var(--line); border-radius:16px; padding:20px; }
.message { display:flex; gap:12px; padding:15px 4px; border-bottom:1px solid var(--line); }
.message:last-child { border-bottom:0; }
.avatar { width:38px; height:38px; border-radius:50%; background:#dfe5ee; flex:none; }
.message-body { min-width:0; flex:1; }
.message-head { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; }
.message-head strong { color:var(--accent); }
time { color:var(--muted); font-size:12px; }
.content { white-space:pre-wrap; overflow-wrap:anywhere; margin-top:6px; line-height:1.5; }
.attachments { margin:8px 0 0; padding-left:18px; }
a { color:var(--accent); }
.embed-note { color:var(--muted); font-size:12px; margin-top:8px; font-style:italic; }
.empty { color:var(--muted); text-align:center; padding:25px; }
.footer { color:var(--muted); text-align:center; font-size:12px; margin-top:18px; }
</style>
</head>
<body><main class="wrapper">
<header class="header"><p class="kicker">C.S.D. Supporto</p><h1>Transcript ticket #${ticket.ticketNumber.toString().padStart(4, '0')}</h1><p class="subtitle">${escapeHtml(category.emoji)} ${escapeHtml(category.label)} · #${escapeHtml(channel.name)}</p></header>
<section class="meta">
<div class="meta-card"><span class="label">Richiedente</span><span class="value">${escapeHtml(ticket.openerId)}</span></div>
<div class="meta-card"><span class="label">Chiuso da</span><span class="value">${escapeHtml(closer.tag)} (${escapeHtml(closer.id)})</span></div>
<div class="meta-card"><span class="label">Aperto il</span><span class="value">${escapeHtml(new Date(ticket.createdAt).toLocaleString('it-IT'))}</span></div>
<div class="meta-card"><span class="label">Messaggi</span><span class="value">${messages.length}</span></div>
</section>
<section class="reason"><strong>Motivazione chiusura</strong><span>${escapeHtml(reason)}</span></section>
<section class="messages">${messageMarkup}</section>
<p class="footer">Transcript generato il ${escapeHtml(new Date().toLocaleString('it-IT'))}</p>
</main></body></html>`;
}

export async function sendTicketTranscript(channel: TextChannel, ticket: TicketRecord, closer: User, reason: string): Promise<void> {
  const messages = await fetchAllMessages(channel);
  const html = buildHtml(channel, ticket, closer, reason, messages);
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'csd-ticket-transcript-'));
  const filePath = path.join(tempDir, `ticket-${String(ticket.ticketNumber).padStart(4, '0')}.html`);

  try {
    await writeFile(filePath, html, 'utf8');
    const attachmentName = path.basename(filePath);
    const dmAttachment = new AttachmentBuilder(filePath, { name: attachmentName });
    await closer.send({ content: `📁 Il transcript del ticket **#${String(ticket.ticketNumber).padStart(4, '0')}** è allegato a questo messaggio.`, files: [dmAttachment] }).catch((error) => {
      console.error('Impossibile inviare il transcript in DM:', error);
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
