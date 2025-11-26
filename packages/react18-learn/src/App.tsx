/** @format */

import React, { memo, useDeferredValue, useState } from 'react';

const List = memo(({ value }: { value: string }) => {
  return (
    <ul style={{ height: '300px', overflowY: 'auto' }}>
      {Array.from({ length: 50000 }).map((_, index) => (
        <li key={index}>
          {index} - {value}
        </li>
      ))}
    </ul>
  );
});

const App = () => {
  const [value, setValue] = useState('');
  const defervalue = useDeferredValue(value);
  const isStale = defervalue !== value;

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 12 }}>
      <label>
        输入：
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="快速输入以观察延迟效果"
          style={{ marginLeft: 8 }}
        />
      </label>
      <div style={{ marginTop: 8, color: '#555' }}>
        {isStale ? '列表正在按延迟值渲染…' : '列表已与输入同步'}
      </div>
      <List value={defervalue} />
    </div>
  );
};

export default App;
