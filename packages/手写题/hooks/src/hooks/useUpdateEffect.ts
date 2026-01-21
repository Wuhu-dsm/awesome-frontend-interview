import { useEffect, useRef } from "react"

const useUpdateEffect = (fn: () => void, deps: any[]) => {
    const isMounted = useRef(false)
    // for react-refresh
    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
        } else {
            return fn();   
        }
    }, deps);
}
export default useUpdateEffect