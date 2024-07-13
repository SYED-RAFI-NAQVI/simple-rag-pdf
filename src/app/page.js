"use client";

import { useState, useRef } from "react";
import {
  extractTextFromPDF,
  preprocessText,
  handleUserQuery,
  getVectorRepresentation,
} from "../utils/helper";
import SkeletonLoader from "../components/SkeletonLoader";
import MarkdownViewer from "../components/MarkdownViewer";
import Accordion from "../components/Accordion";
import "../app/globals.css";

export default function Home() {
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [pdfText, setPdfText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [pdfTextEmbedding, setPdfTextEmbedding] = useState(null);
  const [userQueryEmbedding, setUserQueryEmbedding] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [topChunks, setTopChunks] = useState([]);
  const [showFullText, setShowFullText] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setFileUrl(URL.createObjectURL(selectedFile));
      const text = await extractTextFromPDF(selectedFile);
      setPdfText(preprocessText(text));
      const pdfEmbedding = await getVectorRepresentation(preprocessText(text));
      setPdfTextEmbedding(pdfEmbedding);
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!input || !pdfText) return;

    const userMessage = { user: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setRefreshing(true);

    const userQueryEmb = await getVectorRepresentation(input);
    setUserQueryEmbedding(userQueryEmb);

    const result = await handleUserQuery(input, [pdfText], []);
    const botMessage = { bot: result.response };
    setMessages((prevMessages) => [...prevMessages, botMessage]);
    setRefreshing(false);

    const combinedPrompt = `We have processed several papers. The following are the contents of the most relevant ones:\n\n${pdfText}\n\n${input}`;
    setPrompt(result.prompt);

    // Refresh debug information
    setPdfText(pdfText);
    setPdfTextEmbedding(pdfTextEmbedding);
    setUserQueryEmbedding(userQueryEmb);
    setPrompt(result.prompt);
    setTopChunks(result.topChunks);
  };

  const handleClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="min-h-screen p-6">
      <div className="bg-white p-4 rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Chat with your PDF</h1>

        <div className="mb-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="application/pdf"
            className="hidden"
          />
          <div
            onClick={handleClick}
            className="border-2 border-dotted border-gray-400 text-gray-700 p-4 rounded cursor-pointer text-center"
          >
            Upload PDF
          </div>
        </div>

        <div className="flex gap-4 w-full h-[700px]">
          {fileUrl && (
            <div className="mb-4 flex-grow overflow-auto">
              <h2 className="text-lg font-semibold mb-2">PDF Preview:</h2>
              <iframe
                src={fileUrl}
                style={{ width: "100%", height: "100%" }}
                className="w-full h-full border"
                title="PDF Preview"
              ></iframe>
            </div>
          )}

          {fileUrl && (
            <div className="w-1/2 h-[700px] overflow-y-scroll">
              <div className="flex-grow mb-4 p-4 shadow-md rounded">
                {messages.length === 0 && (
                  <div>
                    <p className="text-center text-lg font-bold">
                      Ask me anything about the PDF
                    </p>
                  </div>
                )}
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.user ? "justify-end" : "justify-start"
                    } mb-2`}
                  >
                    <div
                      className={`p-2 rounded-lg  ${
                        message.user
                          ? "bg-blue-500 text-white max-w-xs"
                          : "w-full"
                      }`}
                    >
                      {message.user ? (
                        message.user
                      ) : (
                        <MarkdownViewer content={message.bot} />
                      )}
                    </div>
                  </div>
                ))}
                {refreshing && <SkeletonLoader count={4} height={0.5} />}
              </div>

              <form onSubmit={handleChatSubmit} className="flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  className="flex-grow p-2 border border-gray-300 rounded-l"
                  placeholder="Ask a question..."
                />
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded-r"
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg mt-4">
        <h2 className="text-xl font-bold mb-2">Debug Information</h2>
        <Accordion title="Extracted Text">
          <p>Text Length: {pdfText.length}</p>
          <pre
            className="bg-gray-200 p-2 rounded whitespace-pre-wrap"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {showFullText ? pdfText : `${pdfText.slice(0, 500)}...`}
            {pdfText.length > 500 && (
              <button
                className="text-blue-500 ml-2"
                onClick={() => setShowFullText(!showFullText)}
              >
                {showFullText ? "Show Less" : "Show More"}
              </button>
            )}
          </pre>
        </Accordion>

        <Accordion title="PDF Text Embedding">
          <pre className="bg-gray-200 p-2 rounded whitespace-pre-wrap">
            {JSON.stringify(pdfTextEmbedding, null, 2)}
          </pre>
        </Accordion>

        <Accordion title="User Query">
          <pre className="bg-gray-200 p-2 rounded whitespace-pre-wrap">
            {messages[messages?.length - 2]?.user || ""}
          </pre>
        </Accordion>

        <Accordion title="User Query Embedding">
          <pre className="bg-gray-200 p-2 rounded whitespace-pre-wrap">
            {JSON.stringify(userQueryEmbedding, null, 2)}
          </pre>
        </Accordion>

        <Accordion title="Top Similar Chunks">
          <pre className="bg-gray-200 p-2 rounded whitespace-pre-wrap">
            {topChunks.map((chunk, index) => (
              <div key={index}>
                <h3>Chunk {index + 1}</h3>
                <p>{chunk}</p>
              </div>
            ))}
          </pre>
        </Accordion>

        <Accordion title="Prompt">
          <p>Prompt Length: {prompt.length}</p>
          <pre className="bg-gray-200 p-2 rounded whitespace-pre-wrap">
            {prompt}
          </pre>
        </Accordion>
      </div>
    </div>
  );
}
