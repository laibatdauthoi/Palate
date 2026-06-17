import { useLiveCountdown } from "@/hooks/use_live_countdown";

type CountdownTimerProps =
  | { value: string; targetTimestamp?: never; endedLabel?: never }
  | { value?: never; targetTimestamp: number | string; endedLabel?: string };

export function CountdownTimer(props: CountdownTimerProps) {
  const isLiveTimer = "targetTimestamp" in props;
  const countdown = useLiveCountdown(
    isLiveTimer ? Number(props.targetTimestamp) : 0,
    { endedLabel: isLiveTimer ? props.endedLabel : undefined }
  );
  const value = isLiveTimer ? countdown.label : props.value;

  return (
    <span className="countdown_timer" aria-label={`Time remaining ${value}`}>
      {value}
    </span>
  );
}
