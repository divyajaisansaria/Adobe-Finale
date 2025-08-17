"use client"

import * as React from "react"
import Lottie from "lottie-react";
// This import now correctly provides a URL string
import animationPath from "@/assets/animations/loadingfiles.lottie";

type LoaderProps = {
  size?: number;
  label?: string;
  className?: string;
};

export function Loader({ size = 80, label, className }: LoaderProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-2 ${className}`}
    >
      {/* Change 'animationData' to 'path' */}
      <Lottie 
        path={animationPath} 
        loop={true} 
        style={{ width: size, height: size }} 
      />
      
      {label && <p className="text-sm font-medium text-muted-foreground">{label}</p>}
      <span className="sr-only">Loading...</span>
    </div>
  );
}