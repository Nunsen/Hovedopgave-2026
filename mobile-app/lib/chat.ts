import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';

import { API_BASE_URL, ChatMessageDto } from '@/lib/api';

function resolveChatWsUrl() {
  const baseUrl = API_BASE_URL.replace(/\/api$/, '');

  if (baseUrl.startsWith('https://')) {
    return `${baseUrl.replace('https://', 'wss://')}/ws-chat`;
  }

  return `${baseUrl.replace('http://', 'ws://')}/ws-chat`;
}

export const CHAT_WS_URL = resolveChatWsUrl();

function logChatEvent(label: string, payload?: unknown) {
  if (payload === undefined) {
    console.log(`[chat] ${label}`);
    return;
  }

  console.log(`[chat] ${label}`, payload);
}

const STOMP_PROTOCOLS = ['v12.stomp', 'v11.stomp', 'v10.stomp'];
const STOMP_HOST = CHAT_WS_URL.replace(/^wss?:\/\//, '').split('/')[0];

type ChatClientOptions = {
  groupIds: number[];
  onMessage: (message: ChatMessageDto) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (message: string) => void;
};

export function createChatClient({
  groupIds,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
}: ChatClientOptions) {
  const subscriptions: StompSubscription[] = [];

  const client = new Client({
    webSocketFactory: () => new WebSocket(CHAT_WS_URL, STOMP_PROTOCOLS),
    connectHeaders: {
      host: STOMP_HOST,
    },
    forceBinaryWSFrames: true,
    appendMissingNULLonIncoming: true,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    connectionTimeout: 8000,
    reconnectDelay: 5000,
    debug: (message) => {
      logChatEvent('stomp-debug', message);
    },
    beforeConnect: async () => {
      logChatEvent('before-connect', {
        wsUrl: CHAT_WS_URL,
        groupIds,
      });
    },
    onConnect: () => {
      logChatEvent('connected', { groupIds });
      onConnect?.();

      groupIds.forEach((groupId) => {
        logChatEvent('subscribing', { topic: `/topic/groups/${groupId}` });
        const subscription = client.subscribe(`/topic/groups/${groupId}`, (frame: IMessage) => {
          logChatEvent('message-frame', frame.body);
          const parsedMessage = JSON.parse(frame.body) as ChatMessageDto;
          logChatEvent('message-parsed', parsedMessage);
          onMessage(parsedMessage);
        });

        subscriptions.push(subscription);
      });
    },
    onStompError: (frame) => {
      logChatEvent('stomp-error', {
        headers: frame.headers,
        body: frame.body,
      });
      onError?.(frame.headers.message ?? 'STOMP-forbindelsen fejlede.');
    },
    onWebSocketError: (event) => {
      logChatEvent('websocket-error', event);
      onError?.('WebSocket-forbindelsen til chatten fejlede.');
    },
    onWebSocketClose: (event) => {
      logChatEvent('websocket-close', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
      onDisconnect?.();
    },
    onDisconnect: () => {
      logChatEvent('disconnected');
      onDisconnect?.();
    },
  });

  return {
    client,
    disconnect: async () => {
      logChatEvent('deactivate-start');
      subscriptions.forEach((subscription) => subscription.unsubscribe());
      await client.deactivate();
      logChatEvent('deactivate-done');
    },
  };
}

export type ChatStompClient = Client;
