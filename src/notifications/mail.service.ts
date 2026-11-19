import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
@Injectable()
export class MailService {
 private readonly transport = nodemailer.createTransport({ host: process.env.SMTP_HOST || '127.0.0.1', port: Number(process.env.SMTP_PORT || 1025), ignoreTLS: true, connectionTimeout: 5000, socketTimeout: 5000 });
 async sendNotificationEmail(to: string, subject: string, htmlContent: string) {
  const result = await this.transport.sendMail({ from: '"MODA Store" <no-reply@moda.local>', to, subject, html: htmlContent });
  return result.messageId as string;
 }
 collectionTemplate(id: number, title: string) {
  return `<!doctype html><html lang="uk"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;background:#f2eee8;font-family:Arial,sans-serif;color:#242622"><table role="presentation" width="100%"><tr><td align="center" style="padding:24px"><table role="presentation" width="100%" style="max-width:560px;background:white"><tr><td style="padding:32px"><p style="letter-spacing:5px;color:#6d775d">MODA / НОВИЙ СЕЗОН</p><h1>Колекція вже у продажу</h1><p>Відкрийте нові образи сезону. Ви підписалися на початок продажів цієї колекції.</p><table width="100%" cellpadding="12" style="background:#f2eee8"><tr><th align="left">Колекція</th><td>${escapeHtml(title)}</td></tr><tr><th align="left">Номер</th><td>${id}</td></tr><tr><th align="left">Статус</th><td>Продажі відкрито</td></tr></table><p style="padding-top:20px"><a href="${(process.env.APP_URL || 'http://localhost:3010').replace(/\/$/,'')}/client.html?collection=${id}" style="background:#344b3a;color:white;padding:14px 22px;text-decoration:none;display:inline-block">Переглянути колекцію</a></p><p style="font-size:12px;color:#666">Навчальна нотифікація MODA Store · Варіант 3</p></td></tr></table></td></tr></table></body></html>`;
 }
}
