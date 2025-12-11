import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface FeatureItem {
  icon: ReactNode;
  title: string;
  description: string;
  iconBg?: string;
}

export interface ContactInfoItem {
  icon: ReactNode;
  text: string;
}

export interface ContactSectionProps {
  title: string;
  description: string;
  contactInfo?: {
    title: string;
    items: ContactInfoItem[];
  };
  formComponent?: ReactNode;
  titleClassName?: string;
  descriptionClassName?: string;
  className?: string;
}

export function ContactSection({
  title,
  description,
  contactInfo,
  formComponent,
  titleClassName,
  descriptionClassName,
  className,
}: ContactSectionProps) {
  return (
    <div className={cn("flex flex-col lg:flex-row gap-8 lg:gap-16", className)}>
      {/* Left Side - Features & Contact Info - 1/3 */}
      <div className="w-full lg:w-1/3">
        <div className="mb-6 sm:mb-8">
          <h3
            className={cn(
              "text-md sm:text-lg md:text-xl lg:text-2xl font-bold text-foreground mb-3 sm:mb-4",
              titleClassName
            )}
          >
            {title}
          </h3>
          <p
            className={cn(
              "text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed",
              descriptionClassName
            )}
          >
            {description}
          </p>
        </div>
        <div className="space-y-4 sm:space-y-6">
          {/* Contact Info */}
          {contactInfo && (
            <Card className="bg-muted/50 dark:bg-muted rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border">
              <CardHeader className="px-0">
                <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold text-card-foreground">
                  {contactInfo.title}
                </CardTitle>
              </CardHeader>
              <div className="space-y-2 sm:space-y-3">
                {contactInfo.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 sm:gap-3">
                    <div className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0">{item.icon}</div>
                    <span className="text-xs sm:text-sm text-foreground break-words">{item.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Right Side - Form - 2/3 */}
      {formComponent && <div className="w-full lg:w-2/3">{formComponent}</div>}
    </div>
  );
}

