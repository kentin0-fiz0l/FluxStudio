import { motion } from 'framer-motion'
import Navigation from './components/Navigation'
import Hero from './components/Hero'
import Problem from './components/Problem'
import Vision from './components/Vision'
import ArcS2 from './components/ArcS2'
import Features from './components/Features'
import Specs from './components/Specs'
import NotWhat from './components/NotWhat'
import Future from './components/Future'
import Footer from './components/Footer'

function App() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen"
    >
      <Navigation />
      <main>
        <Hero />
        <Problem />
        <Vision />
        <ArcS2 />
        <Features />
        <Specs />
        <NotWhat />
        <Future />
      </main>
      <Footer />
    </motion.div>
  )
}

export default App
