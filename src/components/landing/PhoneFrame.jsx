/**
 * A phone showing one of Notch's real screens. Static screens are announced as
 * a single picture; pass `interactive` when the screen has something to tap.
 */
export default function PhoneFrame({ label, interactive = false, className = "", children }) {
  return (
    <div
      className={`phone-frame ${className}`}
      role={interactive ? "group" : "img"}
      aria-label={label}
    >
      <span className="phone-island" aria-hidden="true" />
      {children}
    </div>
  );
}