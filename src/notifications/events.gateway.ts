import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer, WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
 @WebSocketServer() server!: Server;
 private readonly logger = new Logger(EventsGateway.name);
 get connections() { return this.server?.engine.clientsCount ?? 0; }
 handleConnection(client: Socket) { this.logger.log(`Connected: ${client.id}`); }
 handleDisconnect(client: Socket) { this.logger.log(`Disconnected: ${client.id}`); }
 @SubscribeMessage('ping') ping(@ConnectedSocket() client: Socket) { client.emit('pong', { timestamp: new Date().toISOString() }); }
 @SubscribeMessage('broadcastNotification') broadcast(@MessageBody() data: unknown) {
  if (typeof data !== 'string' || !data.trim() || data.length > 500) throw new WsException('Message must contain 1–500 characters');
  this.server.emit('globalAlert', { message: data.trim(), timestamp: new Date().toISOString() });
 }
 private room(data: unknown): string {
  if (typeof data !== 'string' || !/^drop_[1-9]\d{0,8}$/.test(data)) throw new WsException('Expected drop_<collectionId>');
  return data;
 }
 @SubscribeMessage('joinRoom') async join(@MessageBody() data: unknown, @ConnectedSocket() client: Socket) {
  const roomId = this.room(data); await client.join(roomId); client.emit('joined', { roomId }); return { roomId };
 }
 @SubscribeMessage('leaveRoom') async leave(@MessageBody() data: unknown, @ConnectedSocket() client: Socket) {
  const roomId = this.room(data); await client.leave(roomId); client.emit('left', { roomId }); return { roomId };
 }
 emitToRoom(roomId: string, event: string, data: unknown) { this.server.to(this.room(roomId)).emit(event, data); }
}
