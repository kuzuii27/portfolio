import { CaseStudies } from '@/components/CaseStudies';
import { SpaceScene } from '@/components/space/SpaceScene';
import { ScrollJourney } from '@/components/space/ScrollJourney';
import { MenuButton } from '@/components/ThemeToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Cursor } from '@/components/ui/Cursor';
import { NavAutoHide } from '@/components/ui/NavAutoHide';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ProgressTrack } from '@/components/ui/ProgressTrack';
import { Motion } from '@/components/ui/Motion';
import { CvPreview } from '@/components/CvPreview';
import { MessageForm } from '@/components/MessageForm';
import { Meteor } from '@/components/space/Meteor';
import { CONTACT_NUMBER, viberUrl } from '@/lib/contact';
import '@/components/ui/ui.css';

const ViberMark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6l-4 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="M9 8.5c0 3.5 2.5 5.5 5.5 5.5M12 7.5c1.7.3 2.7 1.3 3 3" /></svg>
);

const GITHUB = 'https://github.com/kuzuii27';
const Arrow = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
);

const VIBER = viberUrl(CONTACT_NUMBER);
const GhMark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 19c-4 1.3-4-2-6-2.5M15 21v-3.2a2.8 2.8 0 0 0-.8-2.2c2.7-.3 5.5-1.3 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.3 1.3a11.3 11.3 0 0 0-6 0C6.7 2.900 5.7 3.2 5.7 3.2a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4.3 9.600c0 4.6 2.800 5.7 5.5 6A2.800 2.800 0 0 0 9 17.800V21" /></svg>
);

const SKILLS = [
  { level: 'Primary', note: 'My strongest side', items: ['C#', 'ASP.NET MVC', 'ASP.NET Core', 'SQL Server', 'CQRS'], text: 'Backend work: APIs, data, and the structure around them.' },
  { level: 'Also', note: 'Shipped real work with it', items: ['React', 'HTML', 'CSS', 'JavaScript', 'Flutter', 'Dart'], text: 'Built a full admin dashboard in plain JavaScript, and an offline-first Android app in Flutter.' },
  { level: 'Familiar', note: 'Basics only', items: ['PHP (basic)', 'MySQL / XAMPP'], text: 'Basic PHP syntax with MySQL.' },
  { level: 'Way of working', note: 'How the work gets done', items: ['AI-assisted development with human review', 'Smallest working solution', 'Verify before shipping'], text: 'I use AI coding assistants daily and review their output myself before anything ships.' },
];

export default function Home() {
  return (
    <>
      <LoadingScreen />
      <Motion />
      <Cursor />
      <NavAutoHide />
      <ProgressTrack />
      <header className="nav">
        <div className="wrap">
          <span className="nav-side" aria-hidden="true" />
          <nav id="nav-links" aria-label="Main">
            <a href="#work">Work</a><a href="#skills">Skills</a><a href="#about">About</a><a href="#contact">Contact</a>
          </nav>
          <div className="nav-actions">
            <ThemeToggle />
            
            <a className="btn btn-primary" data-magnetic href="#contact">Contact me</a>
            <MenuButton />
          </div>
        </div>
      </header>

      <main id="top" className="page">
        <SpaceScene />
        <Meteor />
        <ScrollJourney />
        <section className="hero" aria-labelledby="hero-title">
          <div className="wrap">
            <div>
              <div className="who">
                <span className="avatar" aria-hidden="true">K</span>
                <div><strong>Kuzuii</strong><span>Based in the Philippines</span></div>
              </div>
              <h1 id="hero-title">Full-stack developer. <span>I build high-impact, practical apps that solve real problems.</span></h1>
              <p className="lede">Strongest in C#, ASP.NET and SQL Server, and always growing: React, Next.js, Flutter and Python when the job needs them, learned by building.</p>
              <div className="ctas">
                <a className="btn btn-primary" data-magnetic href="#contact">Get in touch<Arrow /></a>
                <CvPreview />
              </div>
              <p className="avail"><span className="pill blue"><span className="dot" />Open to freelance &amp; full-time</span></p>
            </div>
            <div className="hero-side">
            <dl className="facts" aria-label="At a glance">
              <div><dt>Backend</dt><dd>C#, ASP.NET MVC &amp; Core, SQL Server, CQRS</dd></div>
              <div><dt>Frontend</dt><dd>React, HTML/CSS/JavaScript</dd></div>
              <div><dt>Mobile</dt><dd>Flutter / Dart</dd></div>
              <div><dt>Works</dt><dd>AI-assisted, every change reviewed by me</dd></div>
            </dl>
            </div>
          </div>
        </section>

        <section className="sec" id="work" aria-labelledby="work-title">
          <div className="wrap">
            <div className="sec-head" data-reveal="up">
              <h2 id="work-title">Selected work</h2>
              <p></p>
            </div>
            <div data-reveal="up"><CaseStudies /></div>
          </div>
        </section>

        <section className="sec" id="skills" aria-labelledby="skills-title">
          <div className="wrap">
            <div className="sec-head" data-reveal="up">
              <h2 id="skills-title">Skills, with honest levels</h2>
            </div>
            <div className="skills" data-reveal="up">
              {SKILLS.map((s) => (
                <div className="skill-row" key={s.level}>
                  <h3>{s.level}<small>{s.note}</small></h3>
                  <ul className="chips">{s.items.map((i) => <li key={i}>{i}</li>)}</ul>
                  <p>{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="sec" id="about" aria-labelledby="about-title">
          <div className="wrap about">
            <h2 id="about-title">About me</h2>
            <div>
              <p data-reveal="lines">I&apos;m Kuzuii, a full-stack developer based in the Philippines. I&apos;ve worked as IT support and in-house developer at <strong>a GPS fleet-telematics company</strong>, building internal tools and a field technicians&apos; app, and as a software developer intern at a fintech company, building quotation and cost-calculation tools in C#, ASP.NET, Azure and SQL Server. I finished my BS in Information Technology in 2026.</p>
              <p data-reveal="lines">My strongest side is the backend: <strong>C#, ASP.NET MVC and Core, SQL Server and the CQRS pattern</strong>. But I&apos;m still learning and don&apos;t stay in one lane: I&apos;ve picked up React, Next.js, Flutter and Python automation by shipping real projects with them, and each new project is a chance to learn the next tool well.</p>
              <p data-reveal="lines">I like high-impact, practical apps that solve a real problem. I start with the smallest solution that works and check it before it ships. I use AI coding assistants every day and review what they write myself.</p>
            </div>
          </div>
        </section>

        <section className="sec" id="contact" aria-labelledby="contact-title">
          <div className="wrap">
            <div className="sec-head" data-reveal="up">
              <h2 id="contact-title">Let&apos;s talk</h2>
              
            </div>
            <div className="contacts-cta">
              {VIBER && <a className="btn btn-primary" data-magnetic href={VIBER} rel="noopener" aria-label="Chat on Viber"><ViberMark />Viber</a>}
              <a className="btn btn-ghost" href={GITHUB} target="_blank" rel="me noopener"><GhMark />GitHub</a>
            </div>
            <MessageForm />
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <ul className="contacts" aria-label="Links">
            <li><a href={GITHUB} rel="me noopener">github.com/kuzuii27</a></li>
          </ul>
          <div className="foot-r"><span>Kuzuii</span></div>
        </div>
      </footer>
    </>
  );
}
