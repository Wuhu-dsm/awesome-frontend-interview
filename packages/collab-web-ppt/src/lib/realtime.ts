export type Presence = {
  userId: string;
  cursor?: { x: number; y: number };
};

export function connectRealtime(): { disconnect: () => void } {
  // 预留实时协作连接逻辑（WebSocket/WebRTC等）。当前为占位实现。
  return {
    disconnect() {
      // no-op
    },
  };
}