const deepClone = (obj, weakMap = new WeakMap()) => {
    // 处理基本类型和 null
    if (obj === null || typeof obj !== "object") {
        return obj;
    }

    // 处理特殊内置对象
    if (obj instanceof RegExp) return new RegExp(obj);
    if (obj instanceof Date) return new Date(obj);

    // 检查循环引用
    if (weakMap.has(obj)) {
        return weakMap.get(obj);
    }

    // 保持原型链，并初始化新对象
    const cloneObj = Array.isArray(obj)
        ? []
        : Object.create(Object.getPrototypeOf(obj));

    weakMap.set(obj, cloneObj);

    // 递归克隆所有键（包括 Symbol）
    Reflect.ownKeys(obj).forEach((key) => {
        cloneObj[key] = deepClone(obj[key], weakMap);
    });

    return cloneObj;
};