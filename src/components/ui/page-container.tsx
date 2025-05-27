import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

export function PageContainer({ 
  children, 
  className,
  size = "lg" 
}: PageContainerProps) {
  const sizeClasses = {
    sm: "max-w-2xl",      // 672px - for forms and simple content
    md: "max-w-3xl",      // 768px - for medium content
    lg: "max-w-4xl",      // 896px - default, good for most content
    xl: "max-w-5xl",      // 1024px - for wide content like tables
    full: "max-w-none"    // no constraint
  };

  return (
    <div className={cn(
      "mx-auto w-full px-4 sm:px-6 lg:px-8",
      sizeClasses[size],
      className
    )}>
      {children}
    </div>
  );
} 