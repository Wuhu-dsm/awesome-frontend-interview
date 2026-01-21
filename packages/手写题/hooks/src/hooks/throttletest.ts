const throttle = (fn, wait, options = {}) => {
    let argss = null, context = null
    let previous = 0
    let timer
    let result

    return function (args) {
        context = this
        argss = args
        let now = Date.now()
        const { trailing = true, leading = false } = options
        // 非leading 为date.now 防止执行
        if (!previous && !leading) {
            previous = Date.now()
        }
        const remain = wait - (now - previous)
        if (remain <= 0 || remain > wait) {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            result = fn.apply(context, argss)
            previous = now
            context = argss = null
        }
        else {
            // 时间没到，触发trailing
            if (trailing && !timer) {
                timer = setTimeout(() => {
                    previous = leading ? Date.now() : 0
                    timer = null
                    result = fn.apply(context, argss)
                    argss = context = null
                }, remain);
            }
        }


    }
}

const onsearch = () => {
    console.log("search111")
}
const thro_s = throttle(onsearch, 1000, {
    leading: true
})
thro_s()
thro_s()
thro_s()
thro_s()