import { cn } from "@/lib/utils";
import Image from "next/image";
import { ReactNode } from "react";
import { ContentCard } from "./content-card";

// Cấu hình mặc định cho text - chuẩn từ Guide Section
const DEFAULT_TITLE_CLASSES = "text-md sm:text-lg md:text-xl lg:text-2xl text-primary";
const DEFAULT_DESCRIPTION_CLASSES = "text-xs sm:text-sm md:text-base text-card-foreground";
const DEFAULT_IMAGE_HEIGHT = "h-[200px] sm:h-[250px] lg:h-[300px] xl:h-[350px]";

export interface SectionWithImageProps {
  title: string;
  description: string;
  image: {
    src: string;
    alt: string;
  };
  button?: {
    href: string;
    text: string;
    variant?: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
  };
  reverse?: boolean;
  titleClassName?: string;
  descriptionClassName?: string;
  imageHeight?: string;
  className?: string;
  children?: ReactNode;
}

export function SectionWithImage({
  title,
  description,
  image,
  button,
  reverse = false,
  titleClassName,
  descriptionClassName,
  imageHeight = DEFAULT_IMAGE_HEIGHT,
  className,
  children,
}: SectionWithImageProps) {
  return (
    <div
      className={cn(
        "flex flex-col lg:flex-row gap-8 lg:gap-16 items-center",
        reverse && "lg:flex-row-reverse",
        className
      )}
    >
      {/* Content */}
      <div className="flex-1 w-full lg:max-w-lg xl:max-w-xl">
        <ContentCard
          title={title}
          description={description}
          button={button ? {
            ...button,
            showArrowRight: true,
          } : undefined}
          titleClassName={titleClassName || DEFAULT_TITLE_CLASSES}
          descriptionClassName={descriptionClassName || DEFAULT_DESCRIPTION_CLASSES}
          titleDefaultClasses={DEFAULT_TITLE_CLASSES}
          descriptionDefaultClasses={DEFAULT_DESCRIPTION_CLASSES}
        >
          {children}
        </ContentCard>
      </div>

      {/* Image */}
      <div
        className={cn(
          "relative overflow-hidden w-full lg:flex-1 rounded-lg",
          imageHeight
        )}
      >
        <Image
          src={image.src}
          alt={image.alt}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
          fetchPriority="high"
        />
      </div>
    </div>
  );
}

