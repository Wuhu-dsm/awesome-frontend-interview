/**
 * 自定义扁平化函数
 * @param {Array} arr - 原数组
 * @param {Number} d - 扁平化深度，默认为 1
 */
function customFlat(arr, d = 1) {
    // 如果深度 d <= 0，或者 arr 根本不是数组，直接返回原数组
    if (d <= 0 || !Array.isArray(arr)) {
        return arr;
    }

    return arr.reduce((pre, cur) => {
        // 核心判断：当前项是数组吗？
        // 如果是，递归调用 customFlat，同时深度减 1
        // 如果不是，直接合并当前项
        return pre.concat(Array.isArray(cur) ? customFlat(cur, d - 1) : cur)
    }, []);
}

// --- 测试 ---
const testArr = [1, [2, [3, [4, 5]]]];


console.log(customFlat(testArr, 1)); // [1, 2, [3, [4, 5]]]
console.log(customFlat(testArr, 2)); // [1, 2, 3, [4, 5]]
console.log(customFlat(testArr, Infinity)); // [1, 2, 3, 4, 5]