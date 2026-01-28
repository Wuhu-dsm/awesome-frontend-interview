/** @format */

import React, { memo, useDeferredValue, useState } from 'react';
import WaterFall from './components/WaterFall';


const App = () => {
  return (
    <div>
      <WaterFall
        columnGap={10}
        rowGap={10}
        columns={3}
      >
        
      </WaterFall>
    </div>
  );
};

export default App;
