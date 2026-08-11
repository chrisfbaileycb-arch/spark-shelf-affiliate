interface Props {
  className?: string;
}

/** Echo Your Influence mark: a play head with two echo ripples. */
export function BrandMark({ className = "h-9 w-9" }: Props) {
  return (
    <span
      className={`grid place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-pop ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" className="h-[70%] w-[70%]" fill="none">
        <path d="M40 32 L68 50 L40 68 Z" fill="currentColor" />
        <path
          d="M26 34 a22 22 0 0 0 0 32"
          stroke="currentColor"
          strokeOpacity="0.8"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M13 24 a36 36 0 0 0 0 52"
          stroke="currentColor"
          strokeOpacity="0.4"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
