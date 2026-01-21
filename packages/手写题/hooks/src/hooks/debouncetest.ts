const debounce = (fn, wait, options = {}) => {
    let lastargs = null, lastThis = null, timer, result
    const { trailing = true, leading = false } = options
    
    const invokeFunc = () => {
        if (lastargs !== null) {
            result = fn.apply(lastThis, lastargs);
            lastargs = lastThis = null;
        }
    }
    
    return function (...args) {
        lastargs = args
        lastThis = this

        const isFirstCall = !timer
        if (leading && isFirstCall) {
            invokeFunc()
        }
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
            timer = null;
            if (trailing && lastargs) {
                invokeFunc()
            } else {
                lastargs = lastThis = null
            }
        }, wait);
        return result
    }
}

// ========== 测试用例 ==========
const delay = (ms) => new Promise(r => setTimeout(r, ms));

// 测试1: trailing 模式（默认）- 连续调用只执行最后一次
async function test1() {
    console.log('--- 测试1: trailing only ---');
    let count = 0;
    const fn = debounce((x) => {
        count++;
        console.log(`执行: ${x}, 次数: ${count}`);
    }, 500);
    
    fn(1); fn(2); fn(3);  // 快速连续调用
    await delay(600);
    console.log(`结果: 执行${count}次 (预期1次，参数3)\n`);
}

// 测试2: leading 模式 - 立即执行第一次
async function test2() {
    console.log('--- 测试2: leading only ---');
    let count = 0;
    const fn = debounce((x) => {
        count++;
        console.log(`执行: ${x}, 次数: ${count}`);
    }, 500, { leading: true, trailing: false });
    
    fn(1); fn(2); fn(3);  // 快速连续调用
    await delay(600);
    console.log(`结果: 执行${count}次 (预期1次，参数1)\n`);
}

// 测试3: leading + trailing - 第一次和最后一次都执行
async function test3() {
    console.log('--- 测试3: leading + trailing ---');
    let count = 0;
    const fn = debounce((x) => {
        count++;
        console.log(`执行: ${x}, 次数: ${count}`);
    }, 500, { leading: true, trailing: true });
    
    fn(1); fn(2); fn(3);  // 快速连续调用
    await delay(600);
    console.log(`结果: 执行${count}次 (预期2次，参数1和3)\n`);
}

// 运行测试
(async () => {
    await test1();
    await test2();
    await test3();
    console.log('✅ 测试完成');
})();