import Lottie from 'lottie-react'
import animationData from './assets/cube-loader.json'

export function LottieLoader({ size = 96 }: { size?: number }) {
  return (
    <Lottie
      animationData={animationData}
      loop
      style={{ width: size, height: size }}
    />
  )
}
