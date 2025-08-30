type ChallongeEmbedProps = {
  slugOrUrl: string;
  height?: number;
};

export default function ChallongeEmbed({ slugOrUrl, height = 900 }: ChallongeEmbedProps) {
  const src = /^https?:\/\//i.test(slugOrUrl)
    ? slugOrUrl
    : `https://challonge.com/${encodeURIComponent(slugOrUrl)}/module`;

  return (
    <iframe
      title="Challonge Bracket"
      src={src}
      width="100%"
      height={height}
      style={{ border: 0, background: "transparent" }}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allow="fullscreen"
    />
  );
}
