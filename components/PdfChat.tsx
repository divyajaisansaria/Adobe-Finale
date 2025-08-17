"use client"

import React, { useState, useRef, useEffect } from "react"
import { Send } from "lucide-react"

type Message = {
  type: "user" | "bot"
  content: string
}

export default function PdfChat({ pdfUrl }: { pdfUrl: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-scroll to bottom when messages update
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || !pdfUrl) return

    const userMessage = input
    setMessages((prev) => [...prev, { type: "user", content: userMessage }])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/pdfchat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl, question: userMessage }),
      })

      const data = await res.json()

      if (data.answer) {
        setMessages((prev) => [...prev, { type: "bot", content: data.answer }])
      } else {
        setMessages((prev) => [
          ...prev,
          { type: "bot", content: "❌ No response from backend." },
        ])
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { type: "bot", content: "❌ Error sending request." },
      ])
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) sendMessage()
  }

  return (
    <div className="flex flex-col h-full w-full rounded-lg bg-black border border-gray-800 p-3">
      {/* Chat messages */}
      <div
        ref={scrollRef}
        className="flex flex-col-reverse overflow-y-auto mb-2 space-y-3 p-2 scroll-smooth"
        style={{ flexGrow: 1 }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`relative max-w-[75%] px-4 py-2 rounded-2xl break-words
                ${msg.type === "user"
                  ? "bg-gray-700 text-white rounded-br-none"
                  : "bg-gray-800 text-gray-300 rounded-bl-none"
                }`}
            >
              {msg.content}
              <span
                className={`absolute bottom-0 w-3 h-3 ${
                  msg.type === "user"
                    ? "right-0 translate-x-1/2 bg-gray-700 rounded-bl-full"
                    : "left-0 -translate-x-1/2 bg-gray-800 rounded-br-full"
                }`}
              />
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-gray-300 px-4 py-2 rounded-2xl rounded-bl-none animate-pulse">
              Typing...
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          className="flex-1 bg-gray-700 border border-gray-600 text-gray-200 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 placeholder:text-gray-400"
          placeholder="Ask a question about this PDF..."
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="flex items-center justify-center px-4 py-2 bg-gray-700 text-gray-200 rounded-full hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
