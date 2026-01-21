import { useEffect, useRef } from "react"


const useLatest = <T>(val: T) => {
    const ref = useRef(val)
    useEffect(() => {
        ref.current = val
    }, [val])
    return ref
}
export default useLatest