import { useEffect, useMemo, useRef } from "react"

const useInterval = <T extends (...args: any[]) => any>(fn: T, delay: number) => {

    const fnRef = useRef<T>(fn);
    fnRef.current = useMemo<T>(() => fn, [fn]);
    useEffect(() => {
        fnRef.current = fn
    }, [fn])
    useEffect(() => {
        let timer = setInterval(() => {
            fnRef.current()
        }, delay);
        return () => clearInterval(timer)
    }, [delay])
}
export default useInterval