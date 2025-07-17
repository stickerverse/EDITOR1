
import React from 'react';

interface AnimatedIconContainerProps {
  children: React.ReactNode;
}

export function AnimatedIconContainer({ children }: AnimatedIconContainerProps) {
  return (
    <div className="group relative dark:bg-neutral-800 bg-neutral-200 rounded-full p-px overflow-hidden h-8 w-8 flex items-center justify-center">
      <span className="absolute inset-0 rounded-full overflow-hidden">
        <span className="inset-0 absolute pointer-events-none select-none">
          <span className="block -translate-x-1/2 -translate-y-1/3 size-24 blur-xl" style={{background: 'linear-gradient(135deg, rgb(122, 105, 249), rgb(242, 99, 120), rgb(245, 131, 63))'}} />
        </span>
      </span>
      <span className="inset-0 absolute pointer-events-none select-none" style={{animation: '10s ease-in-out 0s infinite alternate none running border-glow-translate'}}>
        <span className="block z-0 h-full w-12 blur-xl -translate-x-1/2 rounded-full" style={{animation: '10s ease-in-out 0s infinite alternate none running border-glow-scale', background: 'linear-gradient(135deg, rgb(122, 105, 249), rgb(242, 99, 120), rgb(245, 131, 63))'}} />
      </span>
      <span className="flex items-center justify-center relative z-[1] dark:bg-neutral-950/90 bg-neutral-900/90 rounded-full w-full h-full">
        {children}
      </span>
    </div>
  );
}
