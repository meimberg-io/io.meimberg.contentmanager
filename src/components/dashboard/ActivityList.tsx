import { ActivityItem } from "@/types";
import { Check, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface ActivityListProps {
  activities: ActivityItem[];
}

export function ActivityList({ activities }: ActivityListProps) {
  const getStatusIcon = (status: ActivityItem["status"]) => {
    switch (status) {
      case "success":
        return <Check className="h-4 w-4 text-status-green" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-status-yellow" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-status-red" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getStatusBg = (status: ActivityItem["status"]) => {
    switch (status) {
      case "success":
        return "bg-status-green/10";
      case "warning":
        return "bg-status-yellow/10";
      case "error":
        return "bg-status-red/10";
      default:
        return "bg-primary/10";
    }
  };

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => (
        <Link
          key={activity.id}
          href={`/posts/${activity.postId}`}
          className={cn(
            "w-full max-w-full overflow-hidden flex items-center gap-4 rounded-lg border border-border/50 bg-card p-4 transition-all hover:border-primary/30 hover:bg-card/80 cursor-pointer",
            "animate-slide-up"
          )}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{activity.postTitle}</p>
            <p className="text-sm text-muted-foreground">{activity.action}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
            </span>
            <div className={cn("rounded-full p-1.5", getStatusBg(activity.status))}>
              {getStatusIcon(activity.status)}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
