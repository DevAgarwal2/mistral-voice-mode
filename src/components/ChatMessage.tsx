"use client";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  index: number;
}

export default function ChatMessage({ role, content, index }: ChatMessageProps) {
  return (
    <div
      className={`animate-fade-in-up flex w-full ${
        role === "user" ? "justify-end" : "justify-start"
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div
        className={`max-w-[80%] px-5 py-3 rounded-2xl text-[15px] leading-relaxed ${
          role === "user"
            ? "bg-[#fa500f] text-white rounded-br-md shadow-sm"
            : "bg-white text-[#333333] rounded-bl-md shadow-sm border border-[#edeae6]"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
