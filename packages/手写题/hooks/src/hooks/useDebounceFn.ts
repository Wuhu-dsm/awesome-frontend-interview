import { debounce } from 'lodash-es'
import { useMemo } from 'react'
import type { DebounceSettings } from 'lodash-es'
import useLatest from './uselatest'

type Options = DebounceSettings & {
    wait?: number
}
const useDebounceFn = (fn: (...args: any[]) => any, options: Options) => {
    const fnRef = useLatest(fn)
    const wait = options?.wait ?? 1000;

    const debounced = useMemo(() => {
        return debounce((...args: any[]) => fnRef.current(...args), wait, options)
    }, [])
    return {
        run: debounced,
        cancel: debounced.cancel,
        flush: debounced.flush,
    }
}
export default useDebounceFn