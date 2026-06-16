'use client';

import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      autoConnect: false,
      transports: ['websocket'],
      auth: (cb) =>
        cb({
          token:
            typeof window !== 'undefined'
              ? localStorage.getItem('accessToken')
              : null,
        }),
    });
  }
  return socket;
}

export function connectSocket(workspaceId: string) {
  const s = getSocket();
  if (!s.connected) s.connect();
  s.emit('workspace.join', workspaceId);
  return s;
}
