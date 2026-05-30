"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";

export function Conversation({
  messages,
  advisorTyping,
}: {
  messages: ChatMessage[];
  advisorTyping: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastAdvisorId = [...messages].reverse().find((m) => m.role === "advisor")?.id;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, advisorTyping]);

  return (
    <div className="flex flex-col gap-5">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} typing={advisorTyping && m.id === lastAdvisorId} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
