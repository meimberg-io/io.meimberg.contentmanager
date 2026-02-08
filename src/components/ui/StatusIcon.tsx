import { Check, Circle, X, AlertCircle } from "lucide-react";
import { StatusCheck } from "@/types";
import { cn } from "@/lib/utils";
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
    publishedPubler: StatusCheck;
  };
  size?: "sm" | "md" | "lg";
}

export function StatusRow({ status, size = "sm" }: StatusRowProps) {
  return (
    <div className="flex items-center gap-1.5">
      <StatusIcon status={status.contentComplete} label="Content Complete" size={size} />
      <StatusIcon status={status.published} label="Published" size={size} />
      <StatusIcon status={status.publishedPubler} label="Published to Publer" size={size} />
    </div>
  );
}
