
"use client";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import React, { useRef } from "react";
import { cn } from "@/lib/utils";

export const CursorCardsContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("h-full w-full", className)}>
      {children}
    </div>
  );
};

export const CursorCard = ({
  children,
  className,
  borderColor = "#e5e5e5",
}: {
  children: React.ReactNode;
  className?: string;
  borderColor?: string;
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const { left, top } = cardRef.current.getBoundingClientRect();
    mouseX.set(event.clientX - left);
    mouseY.set(event.clientY - top);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const mouseXSpring = useSpring(mouseX, {
    stiffness: 300,
    damping: 40,
    mass: 0.5,
  });

  const mouseYSpring = useSpring(mouseY, {
    stiffness: 300,
    damping: 40,
    mass: 0.5,
  });

  const width = cardRef.current?.getBoundingClientRect().width ?? 0;
  const height = cardRef.current?.getBoundingClientRect().height ?? 0;

  const rotateX = useTransform(
    mouseYSpring,
    [0, height],
    [-7, 7]
  );
  const rotateY = useTransform(
    mouseXSpring,
    [0, width],
    [-7, 7]
  );

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: "preserve-3d",
        rotateX,
        rotateY,
      }}
      className="relative flex h-full w-full items-center justify-center"
    >
      <div
        style={{
          transform: "translateZ(50px)",
          transformStyle: "preserve-3d",
          borderColor: borderColor,
        }}
        className={cn(
          "h-full w-full rounded-2xl border-[1px] bg-card text-card-foreground",
          className
        )}
      >
        {children}
      </div>
    </motion.div>
  );
};