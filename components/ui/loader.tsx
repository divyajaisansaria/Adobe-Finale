"use client"
import Lottie from "lottie-react"
import animationData from "@/public/assets/loader.json"

export  function Loader() {
  return (
    <div className="flex justify-center items-center h-screen">
      <Lottie animationData={animationData} loop autoplay />
    </div>
  )
}
