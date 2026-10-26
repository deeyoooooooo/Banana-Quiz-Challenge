export default function Message({ type = "info", children }) {
  if (!children) {
    return null;
  }
  return (
    <div className={`message message-${type}`} role={type === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}
