interface DebounceOptions {
    leading?: boolean;
    trailing?: boolean;
}

interface DebouncedFunction<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): void;
    cancel: () => void;
    flush: () => void;
    pending: () => boolean;
}

function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    options: DebounceOptions = { leading: false, trailing: true }
): DebouncedFunction<T> {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let lastArgs: Parameters<T> | null = null;
    let lastThis: unknown = null;
    let result: ReturnType<T> | undefined;

    const { leading = false, trailing = true } = options;

    // 核心执行函数
    const invokeFunc = () => {
        if (lastArgs !== null) {
            result = func.apply(lastThis, lastArgs);
            lastArgs = lastThis = null;
        }
    };

    const debounced = function (this: unknown, ...args: Parameters<T>) {
        lastArgs = args;
        lastThis = this;

        const isFirstCall = !timeout;

        // 清除之前的定时器
        if (timeout) {
            clearTimeout(timeout);
        }

        // leading：首次调用时立即执行
        if (leading && isFirstCall) {
            invokeFunc();
        }

        // 设置新的定时器
        timeout = setTimeout(() => {
            timeout = null;
            // trailing：等待结束后执行（如果有待执行的参数）
            if (trailing && lastArgs) {
                invokeFunc();
            } else {
                // 清空引用，避免内存泄漏
                lastArgs = lastThis = null;
            }
        }, wait);

        return result;
    } as DebouncedFunction<T>;

    // 取消功能
    debounced.cancel = () => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = null;
        lastArgs = lastThis = null;
    };

    // 立即执行功能
    debounced.flush = () => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
        if (lastArgs) {
            invokeFunc();
        }
    };

    // 检查是否有待执行的调用
    debounced.pending = () => {
        return timeout !== null;
    };

    return debounced;
}

export default debounce;