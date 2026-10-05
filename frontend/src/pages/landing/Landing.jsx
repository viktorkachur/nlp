import { Cta, Faq, Features, Footer, HowItWorks, Marquee, Navbar, SectionTitle, Showcase, Reveal } from './Sections'
import Hero from './Hero'
import LiveDemo from './LiveDemo'
import styles from './Landing.module.css'

/** Головна (лендінг) сторінка: презентує систему та веде користувача до демо. */
export default function Landing() {
  return (
    <>
      <Navbar />
      <Hero />
      <Marquee />
      <Features />
      <HowItWorks />
      <Showcase />
      <section id="demo" className={styles.section}>
        <div className="container">
          <SectionTitle hand="спробуйте прямо зараз" title="Перевірте власний відгук" text="Введіть текст — і побачите, як система визначає тональність, тему та ключові слова." />
          <Reveal><LiveDemo /></Reveal>
        </div>
      </section>
      <Faq />
      <Cta />
      <Footer />
    </>
  )
}
