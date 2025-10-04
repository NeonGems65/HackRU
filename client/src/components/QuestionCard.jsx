import React from "react";
import { MathComponent } from "mathjax-react"; // or react-katex if you’re using that

export default function QuestionCard({ question }) {
  return (
    <div className="p-4 border rounded-lg bg-white shadow">
      <MathComponent tex={question} />
    </div>
  );
}