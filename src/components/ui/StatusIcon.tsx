import { Check, Circle, X, AlertCircle, CalendarClock } from "lucide-react";
import { StatusCheck } from "@/types";
import { cn } from "@/lib/utils";
import { getContentPipelineColor } from "@/lib/transform-storyblok";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatusIconProps {
  status: StatusCheck;
  label: string;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

export function StatusIcon({ status, label, size = "sm", showTooltip = true }: StatusIconProps) {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const getIcon = () => {
    const iconClass = iconSizes[size];
    
    switch (status.color) {
      case "green":
        return <Check className={cn(iconClass, "text-white")} />;
      case "yellow":
        return <AlertCircle className={cn(iconClass, "text-black")} />;
      case "blue":
        return <CalendarClock className={cn(iconClass, "text-white")} />;
      case "red":
        return <X className={cn(iconClass, "text-white")} />;
      default:
        return <Circle className={cn(iconClass, "text-muted-foreground")} />;
    }
  };

  const getStatusClass = () => {
    switch (status.color) {
      case "green":
        return "status-green";
      case "yellow":
        return "status-yellow";
      case "blue":
        return "status-blue";
      case "red":
        return "status-red";
      default:
        return "status-gray";
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "Not started";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const icon = (
    <div
      className={cn(
        "status-icon flex items-center justify-center",
        sizeClasses[size],
        getStatusClass()
      )}
    >
      {getIcon()}
    </div>
  );

  if (!showTooltip) {
    return icon;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {icon}
      </TooltipTrigger>
      <TooltipContent className="bg-popover">
        <div className="text-sm">
          <p className="font-medium">{label}</p>
          <p className="text-muted-foreground">{formatTimestamp(status.timestamp)}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface StatusRowProps {
  status: {
    contentComplete: StatusCheck;
    published: StatusCheck;
  };
  /**
   * Status of the LinkedIn post attached to this blog (join-derived, not intrinsic
   * to the blog story): gray = none attached, yellow = in progress, blue = scheduled,
   * green = published to LinkedIn.
   */
  linkedin: StatusCheck;
  size?: "sm" | "md" | "lg";
  /** Scheduler slot date if this post is queued — drives the blue "eingeplant" phase of the Content pipeline. */
  scheduledAt?: string;
}

const CONTENT_PHASE_LABEL: Record<"red" | "yellow" | "blue" | "green", string> = {
  red: "Content – Pflichtfelder fehlen",
  yellow: "Content – in Arbeit",
  blue: "Content – eingeplant",
  green: "Content – veröffentlicht",
};

/**
 * Two-pipeline status (MICM-37): the Content axis (fields → scheduled → published,
 * folded into one color via getContentPipelineColor) and the LinkedIn axis. Replaces
 * the former three separate dots (content-complete · published/scheduled · linkedin).
 */
export function StatusRow({ status, linkedin, size = "sm", scheduledAt }: StatusRowProps) {
  const contentColor = getContentPipelineColor({
    contentColor: status.contentComplete.color,
    published: status.published.completed,
    scheduled: !!scheduledAt,
  });
  const contentTimestamp =
    contentColor === "green"
      ? status.published.timestamp
      : contentColor === "blue"
        ? scheduledAt
        : status.contentComplete.timestamp;
  return (
    <div className="flex items-center gap-1.5">
      <StatusIcon
        status={{ color: contentColor, completed: contentColor === "green", timestamp: contentTimestamp }}
        label={CONTENT_PHASE_LABEL[contentColor]}
        size={size}
      />
      <StatusIcon status={linkedin} label="LinkedIn" size={size} />
    </div>
  );
}
