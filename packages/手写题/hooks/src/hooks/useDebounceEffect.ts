/**
 * effect防抖
 */

import { DependencyList, EffectCallback, useEffect, useState } from "react"
import useDebounceFn from "./useDebounceFn"
import useUpdateEffect from "./useUpdateEffect"

const useDebounceEffect = (effect: EffectCallback, deps: DependencyList, options: any) => {
    const [flag, setFlag] = useState({})
    const { run } = useDebounceFn(() => {
        setFlag({})
    }, options)
    useEffect(() => {
        return run()
    }, deps)
    useUpdateEffect(effect, [flag])
}
export default useDebounceEffect