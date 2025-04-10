

import type React from "react"

import { useState, useRef } from "react"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Send, Upload, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

export default function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [messages, setMessages] = useState<Array<{ text: string; sender: "user" | "bot" | "system" | "error" }>>([])
  const [input, setInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0])
    }
  }

  const uploadPdf = async () => {
    if (!pdfFile) return

    setIsProcessing(true)
    const formData = new FormData()
    formData.append("pdf", pdfFile)

    try {
      await axios.post("http://localhost:3001/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      setMessages((prev) => [
        ...prev,
        {
          text: `PDF "${pdfFile.name}" uploaded and processed successfully!`,
          sender: "system",
        },
      ])

      // Scroll to bottom after adding message
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100)
    } catch (error) {
      console.error(error)
      setMessages((prev) => [
        ...prev,
        {
          text: "Error processing PDF. Please try again.",
          sender: "error",
        },
      ])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = { text: input, sender: "user" as const }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsSending(true)

    try {
      const response = await axios.post("http://localhost:3001/api/chat", {
        question: input,
      })

      setMessages((prev) => [
        ...prev,
        {
          text: response.data.answer,
          sender: "bot",
        },
      ])
    } catch (error) {
      console.error(error)
      setMessages((prev) => [
        ...prev,
        {
          text: "Error getting response. Please try again.",
          sender: "error",
        },
      ])
    } finally {
      setIsSending(false)

      // Scroll to bottom after adding message
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 md:p-8 flex items-center justify-center">
      <Card className="w-full max-w-4xl shadow-xl border-0">
        <CardHeader className="bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FileText className="h-6 w-6" />
            PDF Chat Assistant
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* PDF Upload Section */}
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
            <h3 className="text-sm font-medium text-purple-800 mb-3">Upload Document</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="cursor-pointer"
                  disabled={isProcessing}
                />
              </div>
              <Button
                onClick={uploadPdf}
                disabled={!pdfFile || isProcessing}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload PDF
                  </>
                )}
              </Button>
            </div>
            {pdfFile && !isProcessing && (
              <p className="mt-2 text-sm text-purple-600">Ready to upload: {pdfFile.name}</p>
            )}
          </div>

          {/* Chat Messages */}
          <div className="bg-white rounded-lg border">
            <ScrollArea className="h-[400px] p-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                  <FileText className="h-12 w-12 mb-3 text-purple-200" />
                  <h3 className="text-lg font-medium text-gray-500">No conversations yet</h3>
                  <p className="text-sm max-w-md mt-1">
                    Upload a PDF document and ask questions about its content to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, index) => (
                    <div key={index} className={cn("flex", msg.sender === "user" ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "px-4 py-2 rounded-lg max-w-[80%]",
                          msg.sender === "user" && "bg-purple-600 text-white rounded-tr-none",
                          msg.sender === "bot" && "bg-gray-100 text-gray-800 rounded-tl-none",
                          msg.sender === "system" && "bg-green-100 text-green-800 mx-auto",
                          msg.sender === "error" && "bg-red-100 text-red-800 mx-auto",
                        )}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0">
          {/* Chat Input */}
          <form onSubmit={handleSubmit} className="flex w-full gap-2">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about the PDF..."
              disabled={isSending}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={isSending || !input.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
