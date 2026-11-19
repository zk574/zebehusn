"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { site } from "@/config/site";

/**
 * Full-width brand film. The source is admin-managed (Stage 5); it is only
 * fetched when the section scrolls into view, and pauses when it leaves.
 */
export function AdVideo({ src = site.adVideo.src, poster = site.adVideo.poster }: { src?: string; poster?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (!src || !wrap.current) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { video.current?.play().then(() => setPlaying(true)).catch(() => {}); }
      else { video.current?.pause(); setPlaying(false); }
    }, { threshold: 0.35 });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, [src]);

  const toggle = () => {
    const v = video.current; if (!v) return;
    if (v.paused) { v.play().then(() => setPlaying(true)).catch(() => {}); } else { v.pause(); setPlaying(false); }
  };

  return (
    <section ref={wrap} aria-label="Brand film" className="relative h-[70svh] min-h-[420px] w-full overflow-hidden md:h-[90svh] grain">
      {src ? (
        <video
          ref={video} src={src} poster={poster || undefined}
          muted={muted} loop playsInline preload="none"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,#3a2a12_0%,#0a0806_55%,#050505_100%)]">
          <div className="absolute inset-0 animate-[pulse_8s_ease-in-out_infinite] bg-[radial-gradient(circle_at_70%_60%,rgba(201,164,92,0.18),transparent_45%)]" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-ink/40" />
      <div className="container-lux relative flex h-full flex-col justify-end pb-16">
        <p className="eyebrow">The Film</p>
        <h2 className="h-display mt-4 max-w-3xl text-5xl md:text-8xl">{site.adVideo.headline}</h2>
        {src && (
          <div className="mt-8 flex gap-3">
            <button onClick={toggle} className="btn-ghost !px-4" aria-label={playing ? "Pause film" : "Play film"}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
            <button onClick={() => setMuted((m) => !m)} className="btn-ghost !px-4" aria-label={muted ? "Unmute" : "Mute"}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
          </div>
        )}
      </div>
    </section>
  );
}
