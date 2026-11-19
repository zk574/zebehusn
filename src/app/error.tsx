"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useEffect } from "react";
import { site } from "@/config/site";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-lux py-32 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="h-display mt-4 text-5xl md:text-6xl">We couldn&apos;t load this page.</h1>
      <p className="mx-auto mt-4 max-w-md text-sm text-mist">Please try again in a moment. If it keeps happening, message us on WhatsApp at {site.contact.phone}.</p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <button onClick={() => retry()} className="btn-gold">Try again</button>
        <Link href="/" className="btn-ghost">Go to the homepage</Link>
      </div>
    </div>
  );
}
