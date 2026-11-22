export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  items: readonly TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}

export function Tabs({ items, value, onChange, label }: TabsProps) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          id={`tab-${item.id}`}
          aria-selected={value === item.id}
          aria-controls={`panel-${item.id}`}
          className={value === item.id ? 'tab tab--active' : 'tab'}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          {item.count === undefined ? null : (
            <span className="tab__count" aria-hidden="true">
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
