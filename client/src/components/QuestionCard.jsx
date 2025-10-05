import React, { useEffect, useRef } from "react";

export default function QuestionCard({ question }) {
  const containerRef = useRef(null);

  useEffect(() => {
    // socket.removeAllListeners();
    if (!question && question !== 0) return;

    if (window.MathJax && containerRef.current) {
      containerRef.current.innerHTML = `$$${question}$$`; // ensure LaTeX delimiters
      window.MathJax.typesetPromise([containerRef.current]).catch((err) =>
        console.error("MathJax typeset error:", err)
      );
    } else if (containerRef.current) {
      containerRef.current.textContent = question;
    }
  }, [question]);

  return (
    <div className="p-4 border rounded-lg bg-white shadow">
      <div
        ref={containerRef}
        style={{ fontSize: "2rem", color: "rgba(255, 255, 255, 1)fffff" }}
      />
    </div>
  );
}