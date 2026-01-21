interface ThrottleOptions {
    leading?: boolean;  // 是否在开始时立即执行
    trailing?: boolean; // 是否在结束后执行最后一次调用
}

interface ThrottledFunction<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): ReturnType<T> | undefined;
    cancel: () => void;
    flush: () => ReturnType<T> | undefined;
}

/**
 * 节流函数 - 在 wait 时间内最多执行一次
 * @param func 要节流的函数
 * @param wait 节流等待时间（毫秒）
 * @param options 配置项
 */
function throttle<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    options: ThrottleOptions = {}
): ThrottledFunction<T> {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let context: any = null;
    let args: any[] | null = null;
    let result: ReturnType<T> | undefined;
    let previous = 0;

    // 默认配置：两者都为 true
    const { leading = true, trailing = true } = options;

    // 定时器回调函数
    const later = function () {
        // 如果禁用了 leading，则重置 previous 为 0，
        // 这样下次调用时 remaining = wait，不会立即触发
        previous = leading ? Date.now() : 0;
        timeout = null;
        result = func.apply(context, args!);
        // 清理引用，防止内存泄漏
        context = args = null;
    };

    const throttled = function (this: any, ...funcArgs: Parameters<T>) {
        const now = Date.now();

        // 第一次进入时，如果禁用 leading，则将 previous 设为当前时间
        // 这样 remaining = wait，就不会立即触发
        if (!previous && !leading) {
            previous = now;
        }

        // 计算剩余时间
        const remaining = wait - (now - previous);
        context = this;
        args = funcArgs;

        // 情况 1: 到了执行时间（remaining <= 0），或者系统时间被调整（remaining > wait）
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            previous = now;
            result = func.apply(context, args);
            // 清理引用
            context = args = null;
        }
        // 情况 2: 还没到时间，但配置了 trailing 且当前没有定时器在排队
        else if (!timeout && trailing) {
            timeout = setTimeout(later, remaining);
        }

        return result;
    } as ThrottledFunction<T>;

    // 取消功能 - 清除定时器和重置状态
    throttled.cancel = function () {
        if (timeout) {
            clearTimeout(timeout);
        }
        previous = 0;
        timeout = null;
        context = args = null;
    };

    // 立即执行功能 - 如果有待执行的调用，立即执行
    throttled.flush = function () {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
            previous = leading ? Date.now() : 0;
            result = func.apply(context, args!);
            context = args = null;
        }
        return result;
    };

    return throttled;
}

export default throttle;
// 假设你已经定义了之前的 throttle 函数
const log = (query, start) => {
    const diff = Date.now() - start;
    console.log(`[${diff}ms] 执行搜索: ${query}`);
};

const runTest = () => {
    const startTime = Date.now();
    console.log("--- 开始测试 (leading: false, trailing: true) ---");

    // 1. 创建节流函数
    const handleSearch = throttle(
        (query) => log(query, startTime),
        1000,
        { leading: false, trailing: true }
    );

    // 2. 模拟用户输入过程
    // 0ms: 输入 "a" -> 此时应该无输出（leading: false）
    handleSearch("a");
    console.log("[0ms] 触发 'a'");

    // 300ms: 输入 "ab" -> 此时应该无输出，但 trailing 计时中
    setTimeout(() => {
        handleSearch("ab");
        console.log("[300ms] 触发 'ab'");
    }, 300);

    // 600ms: 输入 "abc" -> 此时应该无输出，更新最后一次参数
    setTimeout(() => {
        handleSearch("abc");
        console.log("[600ms] 触发 'abc'");
    }, 600);

    // 1000ms 左右: 预期此时会输出 "abc" (trailing 执行)

    // 3. 模拟第二轮触发
    // 1500ms: 距离上次执行过了 500ms，处于冷却期
    setTimeout(() => {
        handleSearch("abcd");
        console.log("[1500ms] 触发 'abcd'");
    }, 1500);

    // 2500ms 左右: 预期此时会输出 "abcd" (因为 1500ms 触发的那次在 2500ms 到期)
};

runTest();