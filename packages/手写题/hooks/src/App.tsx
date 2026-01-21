import { useEffect, useState } from 'react'
import './App.css'
import useUpdateEffect from './hooks/useUpdateEffect'
import useDebounceFn from './hooks/useDebounceFn'
import useLatest from './hooks/uselatest'
import useDebounceEffect from './hooks/useDebounceEffect'

function App() {
  const [count, setCount] = useState(0)
  const [count2, setCount2] = useState(0)
  useDebounceEffect(() => {
    console.log("count", count)
  }, [count], {
    leading: true,
    wait: 1000
  })

  return (
    <>
      <button onClick={() => setCount(count + 1)}>count: {count}</button>
    </>
  )
}

export default App

