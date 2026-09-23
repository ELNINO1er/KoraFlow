"use client";

/**
 * Erreur de dernier recours (remplace le layout racine si celui-ci échoue).
 * Doit rendre ses propres <html>/<body>. Style inline pour ne dépendre de rien.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          background: "#FAF7F2",
          color: "#12263A",
          margin: 0,
          padding: "1rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Une erreur est survenue</h1>
        <p style={{ color: "#667085", textAlign: "center" }}>
          Nous sommes désolés, quelque chose s’est mal passé. Réessayez.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            background: "#12263A",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.6rem 1.2rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
