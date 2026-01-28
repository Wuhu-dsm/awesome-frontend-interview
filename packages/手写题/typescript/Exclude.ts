// 题目要求: 从联合类型 T 中排除可以赋值给 U 的类型，创建一个新类型。
// 简单例子:
// Exclude<'a' | 'b' | 'c', 'a'>
// 期望结果: 'b' | 'c'

type MyExclude<T, K> = T extends K ? never : T
type type1 = MyExclude<'a' | 'b' | 'c', 'a'>
/***\
* Flatten Flatten<[1, [2, 3], [4, [5]]]>
    期望结果: [1, 2, 3, 4, 5]
 */
type Flatten<T extends any[]> = T extends [infer first, ...infer Rest] ? first extends any[] ?
    [...Flatten<first>, ...Flatten<Rest>] : [first, ...Flatten<Rest>] : []

type type2 = Flatten<[1, [2, 3], [4, [5]]]>

/**
 *  shift 
 * 题目要求: 移除一个元组类型 T 的第一个元素，并返回一个包含剩余元素的新元组。
    简单例子:
    Shift<[1, 2, 3]>
    期望结果: [2, 3]
 */
type Shift<T extends any[]> = T extends [infer R, ...infer rest] ? rest : []
type type3 = Shift<[1, 2, 3]>

/**
 * 
 * replaceALl
 */
type replaceAll<T extends string, from extends string, to extends string> = T extends `${infer pre}${from}${infer suffix}` ? replaceAll<`${pre}${to}${suffix}`, from, to> : T

type type6 = replaceAll<"hello world,world love u", "world", "ts">

type myReturnType<T extends (...args: any) => any> = T extends () => infer R ? R : never
async function fn(a: number, b: number) {
    return 1
}
type type4 = myReturnType<typeof fn>

type MyParameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;
type type5 = Parameters<typeof fn>
