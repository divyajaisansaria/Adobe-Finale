// "use client"

// import * as React from "react"
// import Lottie from "lottie-react";
// // This must point to the .json file
// import animationData from "@/assets/animations/loadingfiles.json"

// type LoaderProps = {
//   size?: number; 
//   label?: string;
//   className?: string; 
// };

// export function Loader({ size = 80, label, className }: LoaderProps) {
//   return (
//     <div
//       role="status"
//       className={`flex flex-col items-center justify-center gap-2 ${className}`}
//     >
//       {/* This must use the 'animationData' prop */}
//       <Lottie 
//         animationData={animationData} 
//         loop={true} 
//         style={{ width: size, height: size }} 
//       />
      
//       {label && <p className="text-sm font-medium text-muted-foreground">{label}</p>}
//     </div>
//   );
// }