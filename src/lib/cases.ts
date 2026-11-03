// Case studies: facts from docs/BRIEF.txt only. svg is static, trusted markup.
export interface CaseStudy { title: string; status: 'Built' | 'Delivered' | 'In progress'; note?: string; summary: string; brag: string; stack: string[]; problem: string; built: string[]; lesson: string; svg: string }

export const CASES: CaseStudy[] = [
  {
    "title": "Field Photo Capture System",
    "status": "Built",
    "summary": "An offline-first Android app that queues photos on the phone and syncs them to a small .NET host once it is back online.",
    "brag": "No signal? No problem. Photos wait on the phone and sync later!",
    "stack": [
      "Flutter",
      "Dart",
      "SQLite",
      "ASP.NET Core",
      "SQL Server LocalDB",
      "Tailscale"
    ],
    "problem": "Photos taken in the field have to end up in one central record, but the phone is not always online when the photo is taken.",
    "built": [
      "A Flutter Android app that works offline first: each photo goes into a local SQLite queue and syncs when the connection is back.",
      "Uploads travel over Tailscale HTTPS with a bearer token.",
      "An ASP.NET Core desktop host receives them, stores the records in SQL Server LocalDB and serves an admin web page."
    ],
    "lesson": "The camera preview went black on MediaTek phones when it was wrapped for cropping. I fixed it by leaving the preview alone and drawing crop guides as an overlay on top.",
    "svg": "<svg viewBox=\"0 0 400 225\" role=\"img\" aria-label=\"Diagram: phone with an offline photo queue syncing over HTTPS to a .NET server\">\n      <rect class=\"s-box\" x=\"44\" y=\"22\" width=\"92\" height=\"178\" rx=\"14\"/>\n      <rect class=\"s-soft\" x=\"52\" y=\"38\" width=\"76\" height=\"132\" rx=\"4\"/>\n      <path class=\"s-acc\" d=\"M60 52v-6h8M120 52v-6h-8M60 112v6h8M120 112v6h-8\"/>\n      <rect class=\"s-mute\" x=\"60\" y=\"128\" width=\"60\" height=\"8\" rx=\"2\"/><rect class=\"s-mute\" x=\"60\" y=\"140\" width=\"60\" height=\"8\" rx=\"2\"/><rect class=\"s-mute\" x=\"60\" y=\"152\" width=\"44\" height=\"8\" rx=\"2\"/>\n      <rect class=\"s-mute\" x=\"78\" y=\"182\" width=\"24\" height=\"5\" rx=\"2.5\"/>\n      <text class=\"s-t\" x=\"90\" y=\"216\" text-anchor=\"middle\">SQLite queue</text>\n      <path class=\"s-acc\" d=\"M146 104h108\" stroke-dasharray=\"5 5\"/><path class=\"s-acc\" d=\"M256 100l6 4-6 4\"/>\n      <circle class=\"s-accf\" cx=\"176\" cy=\"104\" r=\"4\"/><circle class=\"s-accf\" cx=\"206\" cy=\"104\" r=\"4\"/>\n      <text class=\"s-t\" x=\"204\" y=\"90\" text-anchor=\"middle\">HTTPS + token</text>\n      <text class=\"s-t\" x=\"204\" y=\"126\" text-anchor=\"middle\">over Tailscale</text>\n      <rect class=\"s-box\" x=\"270\" y=\"50\" width=\"96\" height=\"112\" rx=\"8\"/>\n      <rect class=\"s-soft\" x=\"280\" y=\"62\" width=\"76\" height=\"22\" rx=\"3\"/><rect class=\"s-soft\" x=\"280\" y=\"92\" width=\"76\" height=\"22\" rx=\"3\"/><rect class=\"s-soft\" x=\"280\" y=\"122\" width=\"76\" height=\"22\" rx=\"3\"/>\n      <circle class=\"s-accf\" cx=\"290\" cy=\"73\" r=\"3\"/><circle class=\"s-accf\" cx=\"290\" cy=\"103\" r=\"3\"/>\n      <text class=\"s-t\" x=\"318\" y=\"182\" text-anchor=\"middle\">ASP.NET Core</text>\n      <text class=\"s-t\" x=\"318\" y=\"198\" text-anchor=\"middle\">+ LocalDB</text></svg>"
  },
  {
    "title": "Fleet Tracking Admin Dashboard",
    "status": "Built",
    "summary": "A full admin dashboard for a GPS fleet-telematics company, written from scratch without a framework.",
    "brag": "A whole admin dashboard, built from scratch. No framework!",
    "stack": [
      "HTML",
      "CSS",
      "JavaScript"
    ],
    "problem": "A GPS fleet-telematics company needed an admin dashboard.",
    "built": [
      "The complete admin dashboard, built from scratch in plain HTML, CSS and JavaScript.",
      "No framework."
    ],
    "lesson": "A full admin dashboard does not need a framework. Plain HTML, CSS and JavaScript did the job.",
    "svg": "<svg viewBox=\"0 0 400 225\" role=\"img\" aria-label=\"Mock admin dashboard with a sidebar, a map with a route, and a vehicle list\">\n      <rect class=\"s-box\" x=\"20\" y=\"16\" width=\"360\" height=\"194\" rx=\"8\"/>\n      <path class=\"s-line\" d=\"M20 36h360\"/><circle class=\"s-mute\" cx=\"33\" cy=\"26\" r=\"3.5\"/><circle class=\"s-mute\" cx=\"45\" cy=\"26\" r=\"3.5\"/><circle class=\"s-mute\" cx=\"57\" cy=\"26\" r=\"3.5\"/>\n      <path class=\"s-line\" d=\"M96 36v174\"/>\n      <rect class=\"s-ink\" x=\"30\" y=\"48\" width=\"56\" height=\"8\" rx=\"2\"/><rect class=\"s-mute\" x=\"30\" y=\"66\" width=\"48\" height=\"6\" rx=\"2\"/><rect class=\"s-mute\" x=\"30\" y=\"80\" width=\"52\" height=\"6\" rx=\"2\"/><rect class=\"s-mute\" x=\"30\" y=\"94\" width=\"40\" height=\"6\" rx=\"2\"/><rect class=\"s-mute\" x=\"30\" y=\"108\" width=\"46\" height=\"6\" rx=\"2\"/>\n      <rect class=\"s-soft\" x=\"108\" y=\"48\" width=\"160\" height=\"150\" rx=\"4\"/>\n      <path class=\"s-line\" d=\"M108 98h160M108 148h160M161 48v150M215 48v150\" stroke-dasharray=\"2 4\" opacity=\".6\"/>\n      <path class=\"s-acc\" d=\"M124 182 C150 160 150 130 176 122 S210 92 232 84 252 64 256 60\"/>\n      <circle class=\"s-accf\" cx=\"124\" cy=\"182\" r=\"4\"/><circle class=\"s-accf\" cx=\"256\" cy=\"60\" r=\"5\"/><circle class=\"s-ink\" cx=\"200\" cy=\"168\" r=\"4\"/><circle class=\"s-ink\" cx=\"150\" cy=\"72\" r=\"4\"/>\n      <rect class=\"s-soft\" x=\"280\" y=\"48\" width=\"88\" height=\"30\" rx=\"4\"/><rect class=\"s-soft\" x=\"280\" y=\"84\" width=\"88\" height=\"30\" rx=\"4\"/><rect class=\"s-soft\" x=\"280\" y=\"120\" width=\"88\" height=\"30\" rx=\"4\"/><rect class=\"s-soft\" x=\"280\" y=\"156\" width=\"88\" height=\"30\" rx=\"4\"/>\n      <circle class=\"s-accf\" cx=\"292\" cy=\"63\" r=\"3\"/><rect class=\"s-mute\" x=\"300\" y=\"60\" width=\"56\" height=\"6\" rx=\"2\"/>\n      <circle class=\"s-ink\" cx=\"292\" cy=\"99\" r=\"3\"/><rect class=\"s-mute\" x=\"300\" y=\"96\" width=\"44\" height=\"6\" rx=\"2\"/>\n      <circle class=\"s-ink\" cx=\"292\" cy=\"135\" r=\"3\"/><rect class=\"s-mute\" x=\"300\" y=\"132\" width=\"50\" height=\"6\" rx=\"2\"/>\n      <circle class=\"s-ink\" cx=\"292\" cy=\"171\" r=\"3\"/><rect class=\"s-mute\" x=\"300\" y=\"168\" width=\"38\" height=\"6\" rx=\"2\"/></svg>"
  },
  {
    "title": "Payments Platform",
    "status": "Built",
    "note": "Contributed · previous employer (fintech)",
    "summary": "Work on a fintech payments platform: a C# ASP.NET MVC backend built with CQRS, and a React frontend.",
    "brag": "Commands and queries kept apart with CQRS. Neat, right?",
    "stack": [
      "C#",
      "ASP.NET MVC",
      "CQRS",
      "React"
    ],
    "problem": "A payments platform at my previous employer, a fintech company, needed backend and frontend work.",
    "built": [
      "Backend in C# ASP.NET MVC, structured with the CQRS pattern: commands that change data are handled apart from queries that read it.",
      "Frontend in React."
    ],
    "lesson": "Keeping commands and queries apart makes each side of a payments backend easier to follow and change on its own.",
    "svg": "<svg viewBox=\"0 0 400 225\" role=\"img\" aria-label=\"Diagram: React UI calling an ASP.NET MVC backend that splits into commands and queries\">\n      <rect class=\"s-box\" x=\"20\" y=\"82\" width=\"96\" height=\"60\" rx=\"8\"/><text class=\"s-tb\" x=\"68\" y=\"110\" text-anchor=\"middle\">React UI</text><text class=\"s-t\" x=\"68\" y=\"126\" text-anchor=\"middle\">frontend</text>\n      <path class=\"s-acc\" d=\"M116 112h40\"/><path class=\"s-acc\" d=\"M156 108l6 4-6 4\"/>\n      <rect class=\"s-box\" x=\"164\" y=\"82\" width=\"104\" height=\"60\" rx=\"8\"/><text class=\"s-tb\" x=\"216\" y=\"110\" text-anchor=\"middle\">ASP.NET MVC</text><text class=\"s-t\" x=\"216\" y=\"126\" text-anchor=\"middle\">C#</text>\n      <path class=\"s-acc\" d=\"M268 102 C284 102 284 62 302 62\"/><path class=\"s-acc\" d=\"M300 58l6 4-6 4\"/>\n      <path class=\"s-line\" d=\"M268 122 C284 122 284 162 302 162\"/><path class=\"s-line\" d=\"M300 158l6 4-6 4\"/>\n      <rect class=\"s-box\" x=\"306\" y=\"38\" width=\"76\" height=\"48\" rx=\"8\"/><text class=\"s-tb\" x=\"344\" y=\"60\" text-anchor=\"middle\">Commands</text><text class=\"s-t\" x=\"344\" y=\"75\" text-anchor=\"middle\">write</text>\n      <rect class=\"s-box\" x=\"306\" y=\"138\" width=\"76\" height=\"48\" rx=\"8\"/><text class=\"s-tb\" x=\"344\" y=\"160\" text-anchor=\"middle\">Queries</text><text class=\"s-t\" x=\"344\" y=\"175\" text-anchor=\"middle\">read</text>\n      <text class=\"s-t\" x=\"216\" y=\"196\" text-anchor=\"middle\">CQRS</text></svg>"
  },
  {
    "title": "AI Dashcam Event-Video Receiver",
    "status": "In progress",
    "note": "R&D",
    "summary": "A .NET receiver for ADAS/DMS alarm videos sent by a 4G AI dashcam, turning them into playable MP4 files.",
    "brag": "Raw dashcam video in, playable MP4 out. Beep boop!",
    "stack": [
      ".NET",
      "TCP",
      "JT/T 808",
      "JT/T 1078",
      "T/JSATL12",
      "ffmpeg"
    ],
    "problem": "A 4G AI dashcam sends ADAS/DMS alarm videos, and they need to land on a server as files people can play.",
    "built": [
      "A .NET TCP receiver that speaks JT/T 808 and JT/T 1078, with binary message framing.",
      "Support for the T/JSATL12 attachment protocol, where the video arrives on a second attachment connection.",
      "An ffmpeg remux step that turns the raw .264 stream into .mp4."
    ],
    "lesson": "Still in progress. The alarm and its video arrive on two different connections, so the receiver has to handle both.",
    "svg": "<svg viewBox=\"0 0 400 225\" role=\"img\" aria-label=\"Diagram: dashcam sends an alarm and a video on two connections to a .NET receiver that outputs mp4\">\n      <rect class=\"s-box\" x=\"20\" y=\"78\" width=\"78\" height=\"56\" rx=\"10\"/><circle class=\"s-soft\" cx=\"46\" cy=\"106\" r=\"15\"/><circle class=\"s-ink\" cx=\"46\" cy=\"106\" r=\"7\"/><circle class=\"s-accf\" cx=\"84\" cy=\"90\" r=\"3.5\"/>\n      <text class=\"s-t\" x=\"59\" y=\"152\" text-anchor=\"middle\">4G dashcam</text>\n      <path class=\"s-acc\" d=\"M98 94h108\"/><path class=\"s-acc\" d=\"M206 90l6 4-6 4\"/><text class=\"s-t\" x=\"152\" y=\"84\" text-anchor=\"middle\">JT/T 808 alarm</text>\n      <path class=\"s-line\" d=\"M98 120h108\" stroke-dasharray=\"5 4\"/><path class=\"s-line\" d=\"M206 116l6 4-6 4\"/><text class=\"s-t\" x=\"152\" y=\"140\" text-anchor=\"middle\">T/JSATL12 video</text>\n      <rect class=\"s-box\" x=\"214\" y=\"66\" width=\"80\" height=\"80\" rx=\"8\"/><text class=\"s-tb\" x=\"254\" y=\"102\" text-anchor=\"middle\">.NET</text><text class=\"s-t\" x=\"254\" y=\"118\" text-anchor=\"middle\">receiver</text>\n      <path class=\"s-line\" d=\"M294 106h30\"/><path class=\"s-line\" d=\"M318 102l6 4-6 4\"/>\n      <path class=\"s-box\" d=\"M330 80h32l12 12v40h-44z\"/><text class=\"s-t\" x=\"352\" y=\"118\" text-anchor=\"middle\">.mp4</text>\n      <text class=\"s-t\" x=\"309\" y=\"168\" text-anchor=\"middle\">ffmpeg remux .264</text></svg>"
  },
  {
    "title": "Client Website Prototype Workflow",
    "status": "Delivered",
    "summary": "Throwaway offline demo sites that let a client react to a real page before development starts.",
    "brag": "Change your mind on the demo, not on the real code. Smart!",
    "stack": [
      "HTML",
      "CSS",
      "JavaScript",
      "git worktrees"
    ],
    "problem": "Clients change their minds. That is much cheaper on a demo than on production code.",
    "built": [
      "Offline demo sites sent to clients after an inquiry, before any development.",
      "For a GPS company: two design variants built in parallel using git worktrees."
    ],
    "lesson": "Two clear options made the decision easy. The client approved the dark \"live tracking\" variant.",
    "svg": "<svg viewBox=\"0 0 400 225\" role=\"img\" aria-label=\"Two browser mockups side by side; the dark live-tracking variant is marked approved\">\n      <rect class=\"s-box\" x=\"18\" y=\"34\" width=\"170\" height=\"140\" rx=\"8\"/><path class=\"s-line\" d=\"M18 52h170\"/><circle class=\"s-mute\" cx=\"30\" cy=\"43\" r=\"3\"/><circle class=\"s-mute\" cx=\"40\" cy=\"43\" r=\"3\"/>\n      <rect class=\"s-ink\" x=\"32\" y=\"68\" width=\"90\" height=\"10\" rx=\"2\"/><rect class=\"s-mute\" x=\"32\" y=\"86\" width=\"120\" height=\"6\" rx=\"2\"/><rect class=\"s-mute\" x=\"32\" y=\"98\" width=\"100\" height=\"6\" rx=\"2\"/>\n      <rect class=\"s-soft\" x=\"32\" y=\"116\" width=\"66\" height=\"44\" rx=\"4\"/><rect class=\"s-soft\" x=\"106\" y=\"116\" width=\"66\" height=\"44\" rx=\"4\"/>\n      <text class=\"s-t\" x=\"103\" y=\"198\" text-anchor=\"middle\">Variant A</text>\n      <rect x=\"212\" y=\"34\" width=\"170\" height=\"140\" rx=\"8\" fill=\"#0a0a0a\" stroke=\"#333\"/><path d=\"M212 52h170\" stroke=\"#333\"/><circle cx=\"224\" cy=\"43\" r=\"3\" fill=\"#333\"/><circle cx=\"234\" cy=\"43\" r=\"3\" fill=\"#333\"/>\n      <path d=\"M226 150 C250 120 270 132 292 104 S334 84 366 70\" stroke=\"#52a8ff\" stroke-width=\"2\" fill=\"none\"/>\n      <circle cx=\"226\" cy=\"150\" r=\"4\" fill=\"#52a8ff\"/><circle cx=\"366\" cy=\"70\" r=\"5\" fill=\"#52a8ff\"/><circle cx=\"300\" cy=\"140\" r=\"3.5\" fill=\"#ededed\"/><circle cx=\"250\" cy=\"80\" r=\"3.5\" fill=\"#ededed\"/>\n      <rect x=\"226\" y=\"62\" width=\"60\" height=\"8\" rx=\"2\" fill=\"#ededed\"/>\n      <circle class=\"s-accf\" cx=\"374\" cy=\"36\" r=\"13\"/><path d=\"M368 36l4 4 8-8\" stroke=\"#fff\" stroke-width=\"2\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      <text class=\"s-t\" x=\"297\" y=\"198\" text-anchor=\"middle\">Variant B · approved</text></svg>"
  },
  {
    "title": "Teltonika Device Provisioning Automation",
    "status": "Built",
    "summary": "A Windows desktop tool that configures GPS trackers on its own: plug a device in and it loads the right settings, writes them and records the device's IMEI and SIM number.",
    "brag": "Plug in a tracker and it sets itself up. No more clicking by hand!",
    "stack": [
      "Python",
      "tkinter",
      "pywinauto",
      "pywin32",
      "SQLite",
      "PyInstaller"
    ],
    "problem": "Every new GPS tracker had to be set up by hand in the vendor's configurator: open it, load the config file, save it to the device and copy the IMEI and SIM ICCID. Slow and easy to get wrong across many devices.",
    "built": [
      "A tkinter desktop app that waits for a tracker on USB, opens the vendor configurator and replays the setup steps.",
      "A macro recorder that stores clicks and keys as screen percentages, so one recording works on any screen size.",
      "Reads the IMEI and SIM ICCID after saving and keeps a device log in a local database.",
      "Packaged as a single .exe with PyInstaller, plus a setup script for the team's PCs."
    ],
    "lesson": "The automation sometimes clicked before the configurator had finished loading, so it opened and closed again. Waiting until the window is fully ready, not just visible, fixed it.",
    "svg": "<svg viewBox=\"0 0 400 225\" role=\"img\" aria-label=\"Diagram: GPS tracker plugged in by USB, a Python desktop app replays the configuration steps and saves IMEI and SIM ICCID\">\n      <rect class=\"s-box\" x=\"20\" y=\"78\" width=\"74\" height=\"70\" rx=\"10\"/><circle class=\"s-accf\" cx=\"57\" cy=\"100\" r=\"5\"/><text class=\"s-tb\" x=\"57\" y=\"126\" text-anchor=\"middle\">Tracker</text><text class=\"s-t\" x=\"57\" y=\"140\" text-anchor=\"middle\">USB / COM</text>\n      <path class=\"s-acc\" d=\"M94 113h36\"/><path class=\"s-acc\" d=\"M130 109l6 4-6 4\"/>\n      <rect class=\"s-box\" x=\"138\" y=\"40\" width=\"130\" height=\"146\" rx=\"8\"/><path class=\"s-line\" d=\"M138 60h130\"/><text class=\"s-tb\" x=\"203\" y=\"54\" text-anchor=\"middle\">Provisioner</text>\n      <rect class=\"s-soft\" x=\"150\" y=\"70\" width=\"106\" height=\"20\" rx=\"3\"/><text class=\"s-t\" x=\"203\" y=\"84\" text-anchor=\"middle\">1 open configurator</text>\n      <rect class=\"s-soft\" x=\"150\" y=\"96\" width=\"106\" height=\"20\" rx=\"3\"/><text class=\"s-t\" x=\"203\" y=\"110\" text-anchor=\"middle\">2 load .cfg file</text>\n      <rect class=\"s-soft\" x=\"150\" y=\"122\" width=\"106\" height=\"20\" rx=\"3\"/><text class=\"s-t\" x=\"203\" y=\"136\" text-anchor=\"middle\">3 save to device</text>\n      <rect class=\"s-soft\" x=\"150\" y=\"148\" width=\"106\" height=\"20\" rx=\"3\"/><text class=\"s-t\" x=\"203\" y=\"162\" text-anchor=\"middle\">4 read IMEI + ICCID</text>\n      <path class=\"s-acc\" d=\"M268 113h36\"/><path class=\"s-acc\" d=\"M304 109l6 4-6 4\"/>\n      <rect class=\"s-box\" x=\"312\" y=\"80\" width=\"70\" height=\"66\" rx=\"8\"/><path class=\"s-line\" d=\"M322 98h50M322 112h50M322 126h50\"/><text class=\"s-t\" x=\"347\" y=\"164\" text-anchor=\"middle\">device log</text></svg>"
  },
  {
    "title": "From Inquiry to Finished Website",
    "status": "Delivered",
    "summary": "How a client goes from a first message to a live site: a clickable demo first, then a tested build and a monitored launch.",
    "brag": "From first message to live site, with a demo first!",
    "stack": [
      "HTML/CSS/JS demos",
      "Next.js",
      "Vercel",
      "Gmail",
      "Maya"
    ],
    "problem": "Clients often only know what they want once they see it. Changing a finished site is slow and expensive; changing a demo is cheap.",
    "built": [
      "1. Inquiry: the form on this site emails me the project type, level, colour, font and sample images, so I start with real details.",
      "2. Demo: within days I send a throwaway offline demo (one zip, opens with a double click). Bigger clients get two design variants side by side.",
      "3. Approval: the client clicks through, asks for changes and picks a variant. Changes happen here, before any production code.",
      "4. Build: a written plan, then the real site in small tested steps (forms, payments, admin portal as the level needs).",
      "5. Test and launch: real emails and sandbox payments are tried end to end, then the site goes live on its own domain and every update redeploys automatically."
    ],
    "lesson": "Showing a clickable demo before writing production code turns 'I'll know it when I see it' into a quick yes or no, and saves both sides a rebuild.",
    "svg": "<svg viewBox=\"0 0 400 225\" role=\"img\" aria-label=\"Timeline: inquiry, offline demo, approval, build, test, launch\">\n      <path class=\"s-line\" d=\"M40 112h320\"/>\n      <circle class=\"s-accf\" cx=\"40\" cy=\"112\" r=\"8\"/><text class=\"s-tb\" x=\"40\" y=\"88\" text-anchor=\"middle\">Inquiry</text>\n      <circle class=\"s-ink\" cx=\"104\" cy=\"112\" r=\"8\"/><text class=\"s-tb\" x=\"104\" y=\"146\" text-anchor=\"middle\">Demo</text>\n      <circle class=\"s-ink\" cx=\"168\" cy=\"112\" r=\"8\"/><text class=\"s-tb\" x=\"168\" y=\"88\" text-anchor=\"middle\">Approval</text>\n      <circle class=\"s-ink\" cx=\"232\" cy=\"112\" r=\"8\"/><text class=\"s-tb\" x=\"232\" y=\"146\" text-anchor=\"middle\">Build</text>\n      <circle class=\"s-ink\" cx=\"296\" cy=\"112\" r=\"8\"/><text class=\"s-tb\" x=\"296\" y=\"88\" text-anchor=\"middle\">Test</text>\n      <circle class=\"s-accf\" cx=\"360\" cy=\"112\" r=\"8\"/><text class=\"s-tb\" x=\"360\" y=\"146\" text-anchor=\"middle\">Launch</text>\n      <text class=\"s-t\" x=\"200\" y=\"196\" text-anchor=\"middle\">changes happen on the demo, not on production code</text></svg>"
  }
];
