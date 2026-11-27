"use client";

import { Fragment, useEffect, useRef, type ReactNode } from "react";
import type { ChatMessage } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";

export function Conversation({
  messages,
  advisorTyping,
  aside,
  asideAfterId,
  asideKey,
}: {
  messages: ChatMessage[];
  advisorTyping: boolean;
  /** Cards shown in the thread right after the message `asideAfterId`. */
  aside?: ReactNode;
  asideAfterId?: string | null;
  /** Changes whenever `aside` grows, so the thread follows it into view. */
  asideKey?: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastAdvisorId = [...messages].reverse().find((m) => m.role === "advisor")?.id;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, advisorTyping, asideKey]);

  return (
    <div className="flex flex-col gap-5">
      {messages.map((m) => (
        <Fragment key={m.id}>
          <MessageBubble message={m} typing={advisorTyping && m.id === lastAdvisorId} />
          {aside && m.id === asideAfterId && <div className="flex flex-col gap-5">{aside}</div>}
        </Fragment>
      ))}
      {/* The composer floats over the bottom of the page; stop short of it. */}
      <div ref={endRef} className="scroll-mb-28" />
    </div>
  );
}
