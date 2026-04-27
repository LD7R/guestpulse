interface Props {
  title?: string;
  message: string;
  onRetry?: () => void;
  details?: string;
}

export default function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  details,
}: Props) {
  return (
    <div
      style={{
        background: "#1a0a0a",
        border: "1px solid #2a1a1a",
        borderRadius: 8,
        padding: "32px",
        textAlign: "center",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      <div style={{ color: "#f87171", fontSize: 28, marginBottom: 12 }}>⚠</div>
      <h3
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: "#f0f0f0",
          margin: "0 0 6px",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 13,
          color: "#888",
          margin: "0 0 16px",
          lineHeight: 1.5,
        }}
      >
        {message}
      </p>
      {details && (
        <details style={{ marginBottom: 16 }}>
          <summary
            style={{ fontSize: 11, color: "#555", cursor: "pointer" }}
          >
            Show details
          </summary>
          <pre
            style={{
              background: "#0a0a0a",
              border: "1px solid #1e1e1e",
              borderRadius: 4,
              padding: 8,
              fontSize: 11,
              color: "#666",
              textAlign: "left",
              marginTop: 8,
              overflow: "auto",
            }}
          >
            {details}
          </pre>
        </details>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            background: "#f0f0f0",
            color: "#0d0d0d",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Try again
        </button>
      )}
    </div>
  );
}
