import { Nav } from '@/components/sections/Nav'
import { Hero } from '@/components/sections/Hero'
import { HowItWorks } from '@/components/sections/HowItWorks'
import { Features } from '@/components/sections/Features'
import { WhyFree } from '@/components/sections/WhyFree'
import { Footer } from '@/components/sections/Footer'

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main-content">
        <Hero />
        <HowItWorks />
        <Features />
        <WhyFree />
      </main>
      <Footer />
    </>
  )
}
