import React, { useRef } from "react"
import { motion, MotionValue, useScroll, useTransform } from "framer-motion"

export function ContainerScroll({
  titleComponent,
  children,
}: {
  titleComponent: React.ReactNode
  children: React.ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
  })

  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  const scaleDimensions = () => {
    return isMobile ? [0.92, 1] : [1.06, 1]
  }

  const rotate = useTransform(scrollYProgress, [0, 1], [18, 0])
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions())
  const translate = useTransform(scrollYProgress, [0, 1], [0, -80])

  return (
    <div
      ref={containerRef}
      className="relative flex h-[52rem] items-center justify-center px-4 py-10 md:h-[72rem] md:px-8 md:py-20"
    >
      <div
        className="relative w-full max-w-7xl py-10 md:py-24"
        style={{ perspective: "1100px" }}
      >
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  )
}

function Header({
  translate,
  titleComponent,
}: {
  translate: MotionValue<number>
  titleComponent: React.ReactNode
}) {
  return (
    <motion.div
      style={{ translateY: translate }}
      className="mx-auto max-w-4xl text-center"
    >
      {titleComponent}
    </motion.div>
  )
}

function Card({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>
  scale: MotionValue<number>
  children: React.ReactNode
}) {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
      }}
      className="mx-auto -mt-10 h-[20rem] w-full max-w-6xl rounded-[30px] border border-white/10 bg-[#11131a] p-2 shadow-2xl md:-mt-16 md:h-[42rem] md:p-4"
    >
      <div className="h-full w-full overflow-hidden rounded-[22px] bg-[#0b0d12]">
        {children}
      </div>
    </motion.div>
  )
}