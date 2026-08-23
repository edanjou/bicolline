export default function BannerIcon({
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
      <rect x="10.5" y="1" width="3" height="2" rx="0.4" />
      <rect x="5" y="3" width="14" height="2.5" rx="1.25" />
      <path d="M7 5.5h10v10.5l-2.5 4-2.5-4.5-2.5 4.5-2.5-4z" />
      <path d="M12 15v7" />
      <path d="M9.3 12.5 10.3 10 11.3 11.5 12 9.5 12.7 11.5 13.7 10 14.7 12.5" />
      <path d="M9.7 12.5h4.6v1.3h-4.6z" />
    </svg>
  );
}
