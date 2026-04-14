import React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

const Sparkline = ({ data, isPositive }) => {
  // Ensure we have data and it's in the right format for recharts
  const chartData = data?.map((val, i) => ({ value: val, index: i })) || [];

  return (
    <div className="w-16 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Line
            type="monotone"
            dataKey="value"
            stroke={isPositive ? '#00FF9D' : '#FF3E3E'}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Sparkline;
