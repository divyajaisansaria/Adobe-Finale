"use client";

import React from "react";
import Lottie from "lottie-react";
import loadingAnimation from "@/assets/animations/loadingfiles.json";

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen bg-white">
      <Lottie
        animationData={loadingAnimation}
        loop={true}
        className="w-40 h-40"
      />
    </div>
  );
}
