"use client";

import dynamic from "next/dynamic";

// The hero thread card is the heaviest client island on the page (scripted
// autoplay loop + motion). It never needs to block first paint or hydration,
// so it loads as its own chunk with a static pulse placeholder that matches
// the card's geometry (header + 420px transcript + input row).
const ChatThreadDemo = dynamic(
  () => import("./chat-thread-demo").then((m) => m.ChatThreadDemo),
  {
    ssr: false,
    loading: () => (
      <div className="h-[535px] w-full animate-pulse rounded-2xl border bg-card" />
    ),
  }
);

export function ChatThreadLazy() {
  return <ChatThreadDemo />;
}
