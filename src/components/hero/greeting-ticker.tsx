"use client";

import { useEffect, useState } from "react";

const GREETINGS = [
  { word: "नमस्ते", roman: "namaste", lang: "Hindi" },
  { word: "مرحبا", roman: "marhaba", lang: "Arabic" },
  { word: "こんにちは", roman: "konnichiwa", lang: "Japanese" },
  { word: "Olá", roman: "olá", lang: "Portuguese" },
  { word: "Velkommen", roman: "velkommen", lang: "Danish" },
  { word: "안녕하세요", roman: "annyeong", lang: "Korean" },
  { word: "Habari", roman: "habari", lang: "Swahili" },
  { word: "Xin chào", roman: "xin chào", lang: "Vietnamese" },
  { word: "สวัสดี", roman: "sawasdee", lang: "Thai" },
];

export default function GreetingTicker() {
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setI((prev) => (prev + 1) % GREETINGS.length);
        setVisible(true);
      }, 500);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const g = GREETINGS[i];

  return (
    <div
      className={`flex items-baseline gap-2 text-xs text-apricot/80 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <span className="text-sm text-cream">{g.word}</span>
      <span className="font-serif italic text-apricot/60">{g.roman}</span>
      <span className="text-cream/40">· {g.lang}</span>
    </div>
  );
}
