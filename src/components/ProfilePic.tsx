"use client";
import { useState } from "react";

export function ProfilePic({
  src,
  className = "",
  onClick,
}: {
  src: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  return (
    <>
      <img
        src={src}
        alt=""
        className={`rounded-full object-cover cursor-zoom-in ${className}`}
        onMouseEnter={(e) => setPos({ x: e.clientX, y: e.clientY })}
        onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setPos(null)}
        onClick={onClick}
      />
      {pos && (
        <div
          className="pointer-events-none fixed z-[9999]"
          style={{ left: pos.x + 14, top: pos.y - 80 }}
        >
          <img
            src={src}
            alt=""
            className="w-32 h-32 rounded-full object-cover shadow-2xl border-4 border-white ring-2 ring-gray-100"
          />
        </div>
      )}
    </>
  );
}
