import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "github-markdown-css/github-markdown.css";
import "../app/globals.css"; // Ensure to import your global styles

const MarkdownViewer = ({ content }) => {
  return (
    <div
      className="markdown-body"
      style={{
        backgroundColor: "#fff",
        color: "#000",
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
};

export default MarkdownViewer;
