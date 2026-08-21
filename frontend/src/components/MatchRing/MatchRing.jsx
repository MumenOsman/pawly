/**
 * MatchRing
 *
 * Circular SVG progress indicator showing compatibility percentage.
 * Gradient from Playful Amber → Dog Pine Green.
 */
import './MatchRing.css';

export default function MatchRing({ percentage = 0, size = 'sm' }) {
  const dimensions = size === 'lg' ? 80 : 44;
  const strokeWidth = size === 'lg' ? 5 : 3.5;
  const radius = (dimensions - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const uniqueId = `match-ring-gradient-${size}-${percentage}`;

  return (
    <div className={`match-ring match-ring--${size}`} title={`${percentage}% match`}>
      <svg
        width={dimensions}
        height={dimensions}
        viewBox={`0 0 ${dimensions} ${dimensions}`}
        className="match-ring__svg"
      >
        <defs>
          <linearGradient id={uniqueId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-match-start)" />
            <stop offset="100%" stopColor="var(--color-match-end)" />
          </linearGradient>
        </defs>

        {/* Background track */}
        <circle
          cx={dimensions / 2}
          cy={dimensions / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
          className="match-ring__track"
        />

        {/* Progress arc */}
        <circle
          cx={dimensions / 2}
          cy={dimensions / 2}
          r={radius}
          fill="none"
          stroke={`url(#${uniqueId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="match-ring__progress"
          transform={`rotate(-90 ${dimensions / 2} ${dimensions / 2})`}
        />
      </svg>

      {/* Percentage text */}
      <span className="match-ring__label">
        {percentage}%
      </span>
    </div>
  );
}
