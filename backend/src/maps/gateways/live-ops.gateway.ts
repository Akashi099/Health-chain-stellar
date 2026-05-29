import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';

export interface LiveRiderPosition {
  riderId: string;
  lat: number;
  lng: number;
  orderId?: string;
  status: string;
  timestamp: Date;
}

export interface LiveIncidentUpdate {
  orderId: string;
  status: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  hospitalId: string;
  bloodType: string;
  region: string;
  timestamp: Date;
}

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/ops' })
export class LiveOpsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(LiveOpsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Ops client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Ops client disconnected: ${client.id}`);
  }

  /** Operators subscribe to a region filter */
  @SubscribeMessage('ops.subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { region?: string },
  ) {
    const room = data.region ? `ops:region:${data.region}` : 'ops:global';
    client.join(room);
    client.emit('ops.subscribed', { room });
  }

  /** Riders push location updates via this event */
  @SubscribeMessage('ops.rider.location')
  handleRiderLocation(
    @MessageBody() payload: LiveRiderPosition,
  ) {
    this.broadcastRiderPosition(payload);
  }

  /** Broadcast rider position to all ops subscribers */
  broadcastRiderPosition(payload: LiveRiderPosition) {
    this.server.to('ops:global').emit('ops.rider.moved', payload);
  }

  /** Called by order/incident services when status changes */
  @OnEvent('order.status.updated')
  handleOrderStatusUpdated(payload: LiveIncidentUpdate) {
    this.server.to('ops:global').emit('ops.incident.updated', payload);
    if (payload.region) {
      this.server
        .to(`ops:region:${payload.region}`)
        .emit('ops.incident.updated', payload);
    }
  }

  /** Emit current snapshot to a newly connected operator */
  emitSnapshot(client: Socket, snapshot: { riders: LiveRiderPosition[]; incidents: LiveIncidentUpdate[] }) {
    client.emit('ops.snapshot', snapshot);
  }
}
