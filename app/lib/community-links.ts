// Keep HTTPS in public HTML and structured data; user clicks can launch the app.
export const DISCORD_INVITE = 'https://discord.gg/tHugXVFrDn';
export const DISCORD_APP_INVITE = `discord://-/invite/${new URL(DISCORD_INVITE).pathname.slice(1)}`;
