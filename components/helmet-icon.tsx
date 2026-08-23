export default function HelmetIcon({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10.6 2.8 12 1.3l1.4 1.5-.4 1.6h-2z" />
      <path d="M12 4.4v.9" />
      <path d="M12 5.3c-3.7 0-5.7 3-5.7 7.8s2 7.8 5.7 7.8 5.7-3 5.7-7.8-2-7.8-5.7-7.8z" />
      <path d="M6.6 11.2h10.8v3.3l-5.4 2.3-5.4-2.3z" />
      <path d="M9.5 12v2.4" />
      <path d="M12 12v3.2" />
      <path d="M14.5 12v2.4" />
    </svg>
  );
}
