import type React from "react"
import { useState, useRef } from "react"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Upload, Loader2, Send } from "lucide-react"
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
    if (e.target.files && e.target.files[0]) setPdfFile(e.target.files[0])
  }

  const uploadPdf = async () => {
    if (!pdfFile) return
    setIsProcessing(true)

    const formData = new FormData()
    formData.append("pdf", pdfFile)

    try {
      await axios.post("http://localhost:3001/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      setMessages(prev => [...prev, { text: `📄 "${pdfFile.name}" uploaded successfully!`, sender: "system" }])
    } catch {
      setMessages(prev => [...prev, { text: "⚠️ Error processing PDF. Please try again.", sender: "error" }])
    } finally {
      setIsProcessing(false)
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    setMessages(prev => [...prev, { text: input, sender: "user" }])
    setInput("")
    setIsSending(true)

    try {
      const res = await axios.post("http://localhost:3001/api/chat", { question: input })
      setMessages(prev => [...prev, { text: res.data.answer, sender: "bot" }])
    } catch {
      setMessages(prev => [...prev, { text: "❌ Error getting response.", sender: "error" }])
    } finally {
      setIsSending(false)
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
    }
  }

  return (
    <div className=" min-h-screen bg-gradient-to-tr from-white to-purple-100 p-4 md:p-8 flex justify-center items-center">
      <Card className="relative w-full max-w-3xl shadow-xl rounded-xl overflow-hidden border-0 pt-16">
  <CardHeader className="absolute top-0 left-0 w-full bg-purple-600 text-white py-4 px-6 z-10">
    <CardTitle className="text-3xl flex items-center gap-2">
      <FileText className="w-5 h-5" />
      PDF Chat Assistant
    </CardTitle>
  </CardHeader>

  <CardContent className="space-y-6 bg-white p-6 pt-8">
          {/* Upload Section */}
          <div className="rounded-lg border p-4 bg-purple-50 space-y-3">
            <div className="text-sm text-purple-900 font-medium">Upload your PDF</div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="cursor-pointer"
                disabled={isProcessing}
              />
              <Button
                onClick={uploadPdf}
                disabled={!pdfFile || isProcessing}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {isProcessing ? "Processing..." : "Upload PDF"}
              </Button>
            </div>
            {pdfFile && !isProcessing && (
              <p className="text-xs text-purple-700">Ready to upload: {pdfFile.name}</p>
            )}
          </div>

          {/* Chat Area */}
          <div className="rounded-lg border bg-white">
            <ScrollArea className="h-[400px] p-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center px-4">
                  <FileText className="w-12 h-12 mb-2 text-purple-200" />
                  <p className="font-medium text-gray-500 font-semibold">No conversations yet</p>
                  <span className="text-sm mt-1">Upload a PDF and ask something about it.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <div key={i} className={cn("flex", msg.sender === "user" ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "px-4 py-2 text-sm rounded-lg max-w-[80%]",
                          msg.sender === "user" && "bg-purple-600 text-white rounded-tr-none",
                          msg.sender === "bot" && "bg-gray-100 text-gray-800 rounded-tl-none",
                          msg.sender === "system" && "bg-green-100 text-green-800 mx-auto",
                          msg.sender === "error" && "bg-red-100 text-red-800 mx-auto"
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

        <CardFooter className="bg-gray-50 p-4">
          <form onSubmit={handleSubmit} className="flex w-full gap-2">
            <Input
              placeholder="Ask a question about the PDF..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
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
