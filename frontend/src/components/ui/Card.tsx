interface Props {
  title?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}

export function Card({ title, right, children }: Props) {
  return (
    <div className="tile">
      {(title || right) && (
        <div className="tile-title">
          <span>{title}</span>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}