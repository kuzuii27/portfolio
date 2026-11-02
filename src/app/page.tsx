import { CaseStudies } from '@/components/CaseStudies';
import { MenuButton, ThemeToggle } from '@/components/ThemeToggle';

const GITHUB = 'https://github.com/kuzuii27';
const Arrow = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
);

const SKILLS = [
  { level: 'Primary', note: 'My strongest side', items: ['C#', 'ASP.NET MVC', 'ASP.NET Core', 'SQL Server', 'CQRS'], text: 'Backend work: APIs, data, and the structure around them.' },
  { level: 'Also', note: 'Shipped real work with it', items: ['React', 'HTML', 'CSS', 'JavaScript', 'Flutter', 'Dart'], text: 'Built a full admin dashboard in plain JavaScript, and an offline-first Android app in Flutter.' },
  { level: 'Familiar', note: 'Basics only', items: ['PHP (basic)', 'MySQL / XAMPP'], text: 'Basic PHP syntax with MySQL. No PHP frameworks.' },
  { level: 'Way of working', note: 'How the work gets done', items: ['AI-assisted development with human review', 'Smallest working solution', 'Verify before shipping'], text: 'I use AI coding assistants daily and review their output myself before anything ships.' },
];

export default function Home() {
  return (
    <>
      <header className="nav">
        <div className="wrap">
          <a className="brand" href="#top"><span className="mark" aria-hidden="true">K</span>kuzuii27</a>
          <nav id="nav-links" aria-label="Main">
            <a href="#work">Work</a><a href="#skills">Skills</a><a href="#about">About</a><a href="#contact">Contact</a>
          </nav>
          <ThemeToggle />
          <a className="btn btn-primary" href="#contact" data-inquire="job">Hire me</a>
          <MenuButton />
        </div>
      </header>

      <main id="top" className="page">
        <section className="hero" aria-labelledby="hero-title">
          <div className="wrap">
            <div>
              <div className="who">
                <span className="avatar" aria-hidden="true">K</span>
                <div><strong>kuzuii27</strong><span>Based in the Philippines</span></div>
              </div>
              <h1 id="hero-title">Full-stack .NET developer. <span>I build small, practical apps that solve real problems.</span></h1>
              <p className="lede">Backend first with C#, ASP.NET and SQL Server, plus React, plain JavaScript or Flutter when the job needs a front end or a phone app.</p>
              <div className="ctas">
                <a className="btn btn-primary" href="#contact" data-inquire="project">Start a project<Arrow /></a>
                <a className="btn btn-ghost" href="#contact" data-inquire="job">Hiring? Let&apos;s talk</a>
              </div>
              <p className="avail"><span className="pill blue"><span className="dot" />Open to freelance &amp; full-time</span></p>
            </div>
            <dl className="facts" aria-label="At a glance">
              <div><dt>Now</dt><dd>Developer at a GPS fleet-telematics company</dd></div>
              <div><dt>Backend</dt><dd>C#, ASP.NET MVC &amp; Core, SQL Server, CQRS</dd></div>
              <div><dt>Frontend</dt><dd>React, HTML/CSS/JavaScript</dd></div>
              <div><dt>Mobile</dt><dd>Flutter / Dart</dd></div>
              <div><dt>Works</dt><dd>AI-assisted, every change reviewed by me</dd></div>
            </dl>
          </div>
        </section>

        <section className="sec" id="work" aria-labelledby="work-title">
          <div className="wrap">
            <div className="sec-head">
              <h2 id="work-title">Selected work</h2>
              <p>Five projects, described plainly. Client and employer names are left out on purpose.</p>
            </div>
            <CaseStudies />
          </div>
        </section>

        <section className="sec" id="skills" aria-labelledby="skills-title">
          <div className="wrap">
            <div className="sec-head">
              <h2 id="skills-title">Skills, with honest levels</h2>
              <p>What I use every day, what I have shipped with, and what I only know the basics of.</p>
            </div>
            <div className="skills">
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
              <p>I&apos;m kuzuii27, a full-stack developer based in the Philippines. I currently work at <strong>a GPS fleet-telematics company</strong>, and before that I worked on a payments platform at a fintech company.</p>
              <p>My strongest side is the backend: <strong>C#, ASP.NET MVC and Core, SQL Server and the CQRS pattern</strong>. I also build frontends in React or plain HTML, CSS and JavaScript, and Android apps in Flutter.</p>
              <p>I like small, practical apps that solve a real problem. I start with the smallest solution that works and check it before it ships. I use AI coding assistants every day and review what they write myself.</p>
            </div>
          </div>
        </section>

        <section className="sec" id="contact" aria-labelledby="contact-title">
          <div className="wrap contact">
            <div className="contact-intro">
              <h2 id="contact-title">Start a conversation</h2>
              <p>Planning a project or hiring for a role? Pick the one that fits. The form only asks what I need to reply properly.</p>
              <ul className="next">
                <li><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="10" cy="10" r="7.5" /><path d="M10 6v4l2.5 2" /></svg>I reply by email, usually within a few days.</li>
                <li><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h12v9H8l-4 3z" /></svg>Prefer a call or Viber? Choose it under preferred contact.</li>
              </ul>
            </div>
            <div className="panel"><div id="inquiry-slot" /></div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <ul className="contacts" aria-label="Links">
            <li><a href={GITHUB} rel="me noopener">github.com/kuzuii27</a></li>
          </ul>
          <div className="foot-r"><span>kuzuii27</span></div>
        </div>
      </footer>
    </>
  );
}
