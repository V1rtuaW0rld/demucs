import { useCallback, useMemo } from "react";
import {
  AudioLinesIcon,
  CheckIcon,
  CircleAlertIcon,
  ClockIcon,
  DrumIcon,
  GuitarIcon,
  MicVocalIcon,
  Trash2Icon,
} from "lucide-react";

import type { ResultType } from "~/db/schema";
import DeleteItem from "~/components/delete-item";
import { labelVariants } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import { useResult } from "~/hooks/use-result";
import ResultLink from "./result-link";

interface ResultItemProps {
  initialData: ResultType;
}

export default function ResultItem({ initialData }: ResultItemProps) {
  const { id, name, status, twoStems, createdAt, model } = useResult(initialData);

  const timeSinceCreation = useMemo(() => {
    if (!createdAt) {
      // Fallback for old records without createdAt
      return "long ago";
    }

    try {
      const created =
        typeof createdAt === "object"
          ? (createdAt as Date).getTime()
          : new Date(createdAt).getTime();

      if (isNaN(created)) return "unknown";

      const now = Date.now();
      const diff = now - created;

      if (diff < 60000) return "just now";

      const minutes = Math.floor(diff / (1000 * 60));
      if (minutes < 60) return `${minutes}m ago`;

      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours < 24) return `${hours}h ago`;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      return `${days}d ago`;
    } catch (e) {
      return "unknown";
    }
  }, [createdAt]);

  const goToResult = useCallback(() => {
    if (window.innerWidth < 640) {
      window.location.href = `/result/${id}`;
    }
  }, [id]);

  return (
    <div
      className="group flex w-full items-center justify-between border-x border-t p-4 transition-colors first:rounded-t-lg last:rounded-b-lg last:border-b"
      onClick={goToResult}
    >
      <div className="flex items-center space-x-3">
        <div className="flex h-9 w-9 items-center justify-center">
          <AudioLinesIcon size={24} />
        </div>
        <div className="space-y-1.5">
          <p className={labelVariants()}>{name}</p>
            <div className="flex items-center gap-1.5 text-muted-foreground">
            <div className="flex items-center gap-1 text-[0.8rem]">
              <ClockIcon className="h-[0.8rem] w-[0.8rem]" />
              {timeSinceCreation}
            </div>
            <span className="text-[0.7rem] bg-muted px-1 rounded opacity-70 truncate max-w-[100px]" title={model}>
              {model}
            </span>
            <div className="flex gap-1 *:h-[0.8rem] *:w-[0.8rem]">
              {twoStems ? (
                <>
                  <MicVocalIcon /> <AudioLinesIcon />
                </>
              ) : (
                <>
                  <MicVocalIcon /> <DrumIcon /> <GuitarIcon />
                  <AudioLinesIcon />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex h-9 w-9 items-center justify-center sm:group-hover:hidden">
        {status === "success" ? (
          <CheckIcon size={16} />
        ) : status === "processing" ? (
          <Spinner size={16} />
        ) : (
          <CircleAlertIcon size={16} />
        )}
      </div>
      <div className="hidden space-x-1 sm:group-hover:flex">
        <DeleteItem id={id} name={name} withTooltip size="icon" variant="ghost">
          <Trash2Icon size={16} />
          <span className="sr-only">Delete</span>
        </DeleteItem>
        <ResultLink href={`/result/${id}`} />
      </div>
    </div>
  );
}
