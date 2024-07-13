import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Set the worker source to the local path in the public folder
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pdfBytes = await pdfDoc.save();

  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
  const pdf = await loadingTask.promise;
  let text = "";

  const numPages = pdf.numPages;
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    text += pageText + " ";
  }

  return text;
}

export function preprocessText(text) {
  return text.replace(/\n/g, " ").replace(/\s+/g, " ").toLowerCase();
}

export function splitTextIntoChunks(text, maxChunkSize) {
  if (typeof text !== "string") {
    console.error("Text is not a string:", text);
    return [];
  }
  const words = text.split(" ");
  const chunks = [];
  let currentChunk = [];

  for (const word of words) {
    if (
      Buffer.byteLength(currentChunk.join(" ") + " " + word, "utf8") <=
      maxChunkSize
    ) {
      currentChunk.push(word);
    } else {
      chunks.push(currentChunk.join(" "));
      currentChunk = [word];
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
}

export async function getVectorRepresentation(text) {
  const chunks = splitTextIntoChunks(text, 500);
  const embeddings = [];

  for (const chunk of chunks) {
    const result = await embeddingModel.embedContent(chunk);
    embeddings.push(result.embedding.values);
  }

  const averagedEmbedding = embeddings[0].map(
    (_, i) =>
      embeddings.reduce((sum, embedding) => sum + embedding[i], 0) /
      embeddings.length
  );

  return averagedEmbedding;
}

export function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export async function handleUserQuery(query, pdfText, chatHistory) {
  const queryVector = await getVectorRepresentation(query);

  // Ensure pdfText is a string before chunking
  if (typeof pdfText[0] !== "string") {
    throw new Error("pdfText must be a string");
  }

  // Chunk the PDF text into smaller parts
  const textChunks = splitTextIntoChunks(pdfText[0], 500); // Adjust chunk size as needed

  // Calculate embeddings for each chunk
  const chunkEmbeddings = await Promise.all(
    textChunks.map(async (chunk) => {
      const chunkEmbedding = await getVectorRepresentation(chunk);
      return { chunk, embedding: chunkEmbedding };
    })
  );

  // Calculate similarity for each chunk embedding with the query embedding
  const similarities = chunkEmbeddings.map(({ chunk, embedding }) => ({
    chunk,
    similarity: cosineSimilarity(queryVector, embedding),
  }));

  // Sort chunks by similarity and select the top chunks
  const topSimilarChunks = similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 15) // Adjust the number of top chunks as needed
    .map(({ chunk }) => chunk);

  // Construct the prompt with the selected top similar chunks
  const prompt = `We want an answer for the user query from the given text:\n\n${topSimilarChunks.join(
    "\n\n"
  )}\n\n${query}`;

  const history = [
    {
      role: "user",
      parts: [
        {
          text: "Hey, You are the best Storyteller and Research Scientist who helps readers understand research papers for anyone without a background. I want to know anything about these papers in the research board. Please help me.\n",
        },
      ],
    },
    {
      role: "model",
      parts: [
        {
          text: "I can answer any question regarding these papers. How can I help you?",
        },
      ],
    },
    ...chatHistory,
  ];

  const chat = model.startChat({
    history,
    generationConfig: {
      maxOutputTokens: 1000,
    },
  });

  let finalResponse = "";

  try {
    const result = await chat.sendMessageStream(prompt);
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      finalResponse += chunkText;
    }
  } catch (e) {
    console.log("Error getting response from Gemini:", e);
  }

  return {
    response: finalResponse,
    topChunks: topSimilarChunks,
    prompt: prompt,
  };
}
