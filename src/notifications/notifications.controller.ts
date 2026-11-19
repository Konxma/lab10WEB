import { Body, Controller, Get, MessageEvent, Param, ParseIntPipe, Post, Sse } from '@nestjs/common';
import { IsEmail } from 'class-validator';
import { interval, map, Observable } from 'rxjs';
import { CollectionsService } from './collections.service';
import { EventsGateway } from './events.gateway';
class StartDropDto { @IsEmail() customerEmail!: string; }
@Controller()
export class NotificationsController {
 constructor(private readonly collections: CollectionsService, private readonly gateway: EventsGateway) {}
 @Get('collections') list() { return this.collections.findAll(); }
 @Post('collections/:id/start') start(@Param('id', ParseIntPipe) id: number, @Body() dto: StartDropDto) { return this.collections.startDrop(id, dto.customerEmail); }
 @Sse('notifications/events/stream') stream(): Observable<MessageEvent> {
  return interval(5000).pipe(map(tick => ({ id: String(tick), data: { tick, timestamp: new Date().toISOString(), connections: this.gateway.connections, status: 'online' } })));
 }
}
