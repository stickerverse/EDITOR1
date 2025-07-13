import type { SVGProps } from 'react';

export function ContourCutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 14.22c.83 1.07 2.2 1.78 4 1.78 2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4c0 .83.26 1.59.69 2.22Z" />
      <path d="M10.02 16.5c.83.67 1.83 1.5 3 1.5s2.17-.83 3-1.5" />
      <path d="M19.31 9.78c1.43.63 2.69 2.26 2.69 2.26.1-2.21-1.79-4-4-4-1.8 0-3.17.71-3.17.71" />
      <path d="M14 6c0-1.66 1.34-3 3-3s3 1.34 3 3" />
    </svg>
  );
}

export function RoundedRectangleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="4" />
    </svg>
  );
}

export function VinylIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 12a9 9 0 1 1-9-9" />
        <path d="M12 21a9 9 0 0 0 9-9" />
        <circle cx="12" cy="12" r="3" />
        <path d="M3 12a9 9 0 0 1 9 9" />
    </svg>
  );
}
