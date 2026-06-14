'use client'

/**
 * Global error boundary — replaces the entire document (including <html>/<body>)
 * so it must render its own shell. Fires for errors that escape the root layout.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '24px',
          background: '#0E0B16',
          color: '#F5F3FF',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '56px' }}>💥</div>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
          The app hit a critical error
        </h1>
        <p style={{ margin: 0, maxWidth: '420px', opacity: 0.85, fontSize: '14px' }}>
          We logged the issue. You can try reloading — your account and data are unaffected.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: '8px',
            background: '#7C3AED',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '999px',
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
        <p style={{ marginTop: '16px', fontSize: '12px', opacity: 0.5 }}>
          {error?.digest ? `Reference: ${error.digest}` : ''}
        </p>
      </body>
    </html>
  )
}
