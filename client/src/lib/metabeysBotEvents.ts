export const METABEYS_BOT_OPEN_EVENT = "metabeys-bot:open"

export function openMetabeysBot() {
  window.dispatchEvent(new CustomEvent(METABEYS_BOT_OPEN_EVENT))
}
