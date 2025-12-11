import { cn } from "@/lib/utils";
import Image from "next/image";
import { ReactNode } from "react";
import { ContentCard } from "./content-card";
import type { ContentCardButton } from "./content-card";

// Cấu hình mặc định
const DEFAULT_MIN_HEIGHT = "min-h-[300px] sm:min-h-[350px] lg:min-h-[400px]";
const DEFAULT_TITLE_CLASSES = "text-md sm:text-lg md:text-xl lg:text-2xl font-bold text-slate-900";
const DEFAULT_DESCRIPTION_CLASSES = "text-xs sm:text-sm md:text-base text-slate-700 leading-relaxed";

export type HeroButton = ContentCardButton;

export interface HeroSectionProps {
  title: string;
  description: string;
  backgroundImage: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
  };
  buttons?: HeroButton[];
  minHeight?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  overlayClassName?: string;
  className?: string;
  children?: ReactNode;
}

export function HeroSection({
  title,
  description,
  backgroundImage,
  buttons,
  minHeight = DEFAULT_MIN_HEIGHT,
  titleClassName,
  descriptionClassName,
  overlayClassName,
  className,
  children,
}: HeroSectionProps) {
  return (
    <section
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        minHeight,
        className
      )}
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={backgroundImage.src}
          alt={backgroundImage.alt}
          width={backgroundImage.width || 1920}
          height={backgroundImage.height || 1080}
          className="w-full h-full object-cover"
          priority
          fetchPriority="high"
          sizes="100vw"
        />
      </div>

      {/* Text Overlay Box */}
      <div className="container mx-auto relative z-30 px-4 sm:px-6 lg:px-8">
        <ContentCard
          title={title}
          description={description}
          buttons={buttons}
          cardClassName={cn(
            "gap-0 bg-white/90 backdrop-blur-md rounded-xl p-4 sm:p-6 lg:p-8 max-w-sm md:max-w-md lg:max-w-lg shadow-xl border border-white/20",
            overlayClassName
          )}
          headerClassName="px-0 pb-3 sm:pb-4 gap-0"
          titleClassName={cn("mb-3 sm:mb-4", titleClassName || DEFAULT_TITLE_CLASSES)}
          descriptionClassName={cn("mb-4 sm:mb-6", descriptionClassName || DEFAULT_DESCRIPTION_CLASSES)}
          contentClassName="px-0"
          titleDefaultClasses={DEFAULT_TITLE_CLASSES}
          descriptionDefaultClasses={DEFAULT_DESCRIPTION_CLASSES}
        >
          {children}
        </ContentCard>
      </div>
    </section>
  );
}

