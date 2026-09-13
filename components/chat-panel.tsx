"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ChatPanel() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const isBusy = status === "submitted" || status === "streaming";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isBusy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <Card className="flex h-[80vh] w-full max-w-2xl flex-col">
      <CardHeader>
        <CardTitle>Arya</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div
            role="log"
            aria-live="polite"
            aria-atomic="false"
            className="flex flex-col gap-4"
          >
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Send a message to start the conversation.
              </p>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-2 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <Avatar size="sm">
                  <AvatarFallback>
                    {message.role === "user" ? "U" : "AI"}
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-wrap">
                  {message.parts
                    .filter((part) => part.type === "text")
                    .map((part, index) => (
                      <span key={index}>{part.text}</span>
                    ))}
                </div>
              </div>
            ))}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-2">
        {error && (
          <p className="text-sm text-destructive" role="alert">
            Something went wrong. Please try again.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <Input
            id="chat-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask a physics question..."
            disabled={isBusy}
            autoComplete="off"
          />
          <Button type="submit" disabled={isBusy || !input.trim()}>
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
