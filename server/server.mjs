import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { Blob } from 'blob-polyfill';

global.Blob = Blob;

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

let vectorStore;

// PDF Upload Endpoint
app.post('/api/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // Verify PDF mimetype
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    const loader = new PDFLoader(blob);
    const docs = await loader.load();

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const splitDocs = await splitter.splitDocuments(docs);

    vectorStore = await MemoryVectorStore.fromDocuments(
      splitDocs,
      new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY,
        modelName: "embedding-001"
      })
    );

    res.json({ message: 'PDF processed successfully' });
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ error: 'Error processing PDF: ' + error.message });
  }
});

// Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    if (!vectorStore) {
      return res.status(400).json({ error: 'No PDF loaded. Please upload a PDF first.' });
    }
    console.log("hello 1")
    const { question } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Invalid question format' });
    }
    console.log("hello 1")
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash",  // Changed from 'gemini-pro'
      maxOutputTokens: 2048,
      apiKey: process.env.GOOGLE_API_KEY,
      apiVersion: "v1",  // Explicitly set API version
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE",
        }
      ]
    });
    console.log("hello 1",model)
    const prompt = PromptTemplate.fromTemplate(`
      Answer the user's question based only on the following context:
      {context}

      Question: {input}

      Provide a clear, concise answer in the same language as the question.
      If the answer isn't in the context, say "I couldn't find that information in the document."
    `);
    console.log("hello 1",prompt);
    const combineDocsChain = await createStuffDocumentsChain({
      llm: model,
      prompt,
    });

    const retriever = vectorStore.asRetriever();
    const retrievalChain = await createRetrievalChain({
      combineDocsChain,
      retriever,
    });
    console.log("hello 1")
    const result = await retrievalChain.invoke({
      input: question,
    });
    console.log("hello 1")
    res.json({ 
      answer: result.answer,
      sources: result.context.map(doc => doc.metadata.source)
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Error processing chat request',
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  if (!process.env.GOOGLE_API_KEY) {
    console.warn('⚠️ Warning: GOOGLE_API_KEY not found in environment variables');
  }
  console.log(`✅ Server running on http://localhost:${PORT}`);
});