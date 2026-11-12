/** The words for one step: its number and icon, a headline, and what happens. */
export default function StepCopy({ number, icon: Icon, title, body, points }) {
  return (
    <div className="step-copy">
      <div className="step-number"><span><Icon size={17} /></span>Step {number}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      <ul className="step-points">
        {points.map(([PointIcon, text]) => (
          <li key={text}><PointIcon size={19} />{text}</li>
        ))}
      </ul>
    </div>
  );
}