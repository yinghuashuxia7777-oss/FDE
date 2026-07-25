interface CaseTickerProps {
  titles: readonly string[];
}

/**
 * BLACK BOX 事故走马灯（V4 定稿动效）。
 * 滚动内容为内容库真实案例标题，纯装饰，案例本体从 /cases 进入。
 */
export function CaseTicker({ titles }: CaseTickerProps) {
  if (titles.length === 0) return null;
  const loop = [...titles, ...titles];
  const durationSeconds = Math.max(24, titles.length * 3.4);
  return (
    <div aria-hidden="true" className="bb-ticker">
      <div
        className="bb-ticker__track"
        style={{ animationDuration: `${durationSeconds}s` }}
      >
        {loop.map((title, index) => (
          <span className="bb-ticker__item" key={`${title}-${index}`}>
            <b>⚠</b>
            {title}
          </span>
        ))}
      </div>
    </div>
  );
}
