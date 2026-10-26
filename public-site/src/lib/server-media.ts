// Add only genuine CobbleStar recordings, never concept art.
export type ServerMedia = {kind:'image'|'video';src:string;title:string;caption:string;poster?:string};
export const serverMedia: ServerMedia[] = [];
