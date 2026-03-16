export const PROTOCOL_DETAIL_COPY: Record<string, any> = {};
export const protocolContent: Record<string, any> = {};
export function getProtocolContent(id: string) { return protocolContent[id] || null; }
