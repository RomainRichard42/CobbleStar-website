// Shared with browser regression tests: previews must enforce production CSP too.
export const siteSecurity = {
  contentSecurityPolicy: {
    directives: {
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https://pokeapi.co"],
      imgSrc: ["'self'", "data:", "https://mc-heads.net", "https://cdn.discordapp.com", "https://raw.githubusercontent.com/PokeAPI/sprites/"],
    },
  },
};
