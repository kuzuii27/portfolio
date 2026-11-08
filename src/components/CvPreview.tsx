'use client';

import { useRef, useState } from 'react';

const CV = '/Kuzui-Santillan-CV.pdf';

/** "View CV" button + modal PDF preview. The PDF only loads once opened. */
export function CvPreview() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={() => { setLoaded(true); dialog.current?.showModal(); }}>View CV</button>
      <dialog ref={dialog} className="cv-dlg" aria-label="Curriculum vitae" onClick={(e) => { if (e.target === dialog.current) dialog.current.close(); }}>
        <div className="cv-bar">
          <a className="btn btn-ghost" href={CV} download>Download PDF</a>
          <button type="button" className="btn btn-ghost" onClick={() => dialog.current?.close()}>Close</button>
        </div>
        {loaded && <iframe title="Kuzui R. Santillan, CV (PDF)" src={`${CV}#view=FitH`} />}
      </dialog>
    </>
  );
}
