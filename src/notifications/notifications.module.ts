import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { MailService } from './mail.service';
import { CollectionsService } from './collections.service';
import { NotificationsController } from './notifications.controller';
@Module({ controllers: [NotificationsController], providers: [EventsGateway, MailService, CollectionsService] })
export class NotificationsModule {}
