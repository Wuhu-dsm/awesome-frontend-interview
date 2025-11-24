/** @format */

// components/CountdownDisplay.tsx
import React from 'react';
import useCountdown from '../src/hooks/usecountdown';

interface CountdownDisplayProps {
  targetDate: Date;
  render?: (time: { isRunning: boolean }) => React.ReactNode;
}

const CountdownDisplay: React.FC<CountdownDisplayProps> = ({
  targetDate,
  render,
}) => {
  const { timeLeft, isRunning, start, pause, reset } = useCountdown({
    leftTime: 1111121332131,
  });
  const defaultRender = () => (
    <div
      style={{ textAlign: 'center', fontSize: '2rem', fontFamily: 'monospace' }}
    >
      <div>
        {timeLeft.days} 天 :{timeLeft.minutes || '00'}:
        {timeLeft.seconds || '00'}
      </div>
      <div style={{ marginTop: '1rem' }}>
        <button onClick={start} style={{ marginRight: '0.5rem' }}>
          {isRunning ? '暂停' : '开始'}
        </button>
        {/* <button onClick={reset}>重置</button> */}
      </div>
    </div>
  );

  return defaultRender();
};

export default CountdownDisplay;
