import Image from "next/image";

// Shared photoreal mine background + legibility overlay, used on every page
// (not baked into the image itself, so it stays a separate layer).
export default function HeroBackground() {
  return (
    <>
      <Image
        src="/mine-hero.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(11,9,6,0.75) 0%, rgba(11,9,6,0.55) 40%, rgba(11,9,6,0.85) 100%)",
        }}
      />
    </>
  );
}
