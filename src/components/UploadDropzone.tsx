import { useRef, useState } from 'react';

export function UploadDropzone({ onFile, error }: { onFile: (f: File) => void; error: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      className={`dropzone${over ? ' over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
    >
      <h2>Drop your csTimer export here</h2>
      <p>
        In csTimer, open <b>Export</b> (the arrow icon) and choose <b>Export to file</b>. Then drop the <code>.txt</code> file here.
      </p>
      <button type="button" className="primary" onClick={() => input.current?.click()}>
        Choose file
      </button>
      <input
        ref={input}
        type="file"
        accept=".txt,.json,application/json,text/plain"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="privacy">Your file never leaves this device. Everything is processed in your browser.</p>
    </div>
  );
}
