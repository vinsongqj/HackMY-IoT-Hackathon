import type { ButtonHTMLAttributes } from "react";

type Variant = "default" | "primary" | "danger" | "ghost";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "default", className = "", ...rest }: Props) {
  const cls = ["btn", variant !== "default" ? variant : "", className]
    .filter(Boolean)
    .join(" ");
  return <button className={cls} {...rest} />;
}