import type { ChatMessage } from "@/lib/types";

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-typing rounded-full bg-ember"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  );
}

export function MessageBubble({ message, typing }: { message: ChatMessage; typing?: boolean }) {
  const isAdvisor = message.role === "advisor";
  const showTyping = isAdvisor && typing && message.content.length === 0;

  return (
    <div className={`flex gap-3 ${isAdvisor ? "" : "flex-row-reverse"}`}>
      <div
        className={[
          "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg font-display text-sm font-bold",
          isAdvisor
            ? "bg-gradient-to-br from-ember-soft to-ember-deep text-base shadow-glow"
            : "border border-line bg-panel2 text-steel",
        ].join(" ")}
        aria-hidden
      >
        {isAdvisor ? "W" : "You"[0]}
      </div>

      <div className={`flex min-w-0 max-w-[80%] flex-col gap-2 ${isAdvisor ? "items-start" : "items-end"}`}>
        {message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.images.map((img, i) => (
              <img
                key={i}
                src={`data:${img.mediaType};base64,${img.data}`}
                alt={img.name ?? "shared image"}
                className="max-h-44 rounded-xl border border-line object-cover"
              />
            ))}
          </div>
        )}

        {(message.content.length > 0 || showTyping) && (
          <div
            className={[
              "whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
              isAdvisor
                ? "rounded-tl-sm border border-line bg-panel text-ink"
                : "rounded-tr-sm bg-steel/15 text-ink ring-1 ring-steel/25",
            ].join(" ")}
          >
            {showTyping ? <TypingDots /> : message.content}
          </div>
        )}
      </div>
    </div>
  );
}
