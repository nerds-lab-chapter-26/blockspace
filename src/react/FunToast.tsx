export interface FunToastProps {
  message: string;
  onDismiss: () => void;
}

/** A small, dismissible, non-blocking corner banner. Never covers editor content and never
 * appears unless the app explicitly opts in via BlockEditor's `funMode` prop. */
export function FunToast({ message, onDismiss }: FunToastProps) {
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 40,
        maxWidth: 280,
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        background: "#111",
        color: "white",
        padding: "10px 12px",
        borderRadius: 8,
        fontSize: "0.85em",
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
      }}
    >
      <span aria-hidden="true">✨</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          background: "transparent",
          border: "none",
          color: "rgba(255,255,255,0.7)",
          cursor: "pointer",
          fontSize: "1em",
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
