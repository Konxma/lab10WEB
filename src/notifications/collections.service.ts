import { BadGatewayException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { MailService } from './mail.service';
@Injectable()
export class CollectionsService {
 private readonly collections = new Map([[101, { id: 101, title: 'Осінь / Зима 2026', status: 'DRAFT' }], [202, { id: 202, title: 'Міський мінімалізм', status: 'DRAFT' }]]);
 private readonly busy = new Set<number>();
 constructor(private readonly events: EventsGateway, private readonly mail: MailService) {}
 findAll() { return [...this.collections.values()].map(c => ({...c})); }
 async startDrop(id: number, customerEmail: string) {
  const collection = this.collections.get(id);
  if (!collection) throw new NotFoundException('Колекцію не знайдено');
  if (collection.status === 'LIVE' || this.busy.has(id)) throw new ConflictException('Продажі вже відкрито або відкриваються');
  this.busy.add(id);
  try {
   // SMTP acceptance precedes mutation so an unavailable SMTP server cannot report a successful drop.
   let messageId: string;
   try { messageId = await this.mail.sendNotificationEmail(customerEmail, `Старт продажів: ${collection.title}`, this.mail.collectionTemplate(id, collection.title)); }
   catch { throw new BadGatewayException('SMTP недоступний. Статус не змінено; запустіть Mailpit і повторіть.'); }
   collection.status = 'LIVE';
   const payload = { ...collection, timestamp: new Date().toISOString() };
   this.events.emitToRoom(`drop_${id}`, 'dropStarted', payload);
   return { success: true, ...payload, room: `drop_${id}`, event: 'dropStarted', email: { accepted: true, messageId } };
  } finally { this.busy.delete(id); }
 }
}
