import { useEffect, useState } from 'react'
import './App.css'

import useInterval from './hooks/useInterval'

function App() {
  const [count, setCount] = useState(0)

  useInterval(() => {
    console.log(count)
  }, 1000)
  return (
    <>
      <button onClick={() => setCount(count + 1)}>c1ount: {count}</button>
    </>
  )
}

export default App

