/**
 * 1. Omit<T, K>
难度： 中等
题目： 实现内置的 Omit < T, K > 类型，它从类型 T 中移除 K 属性。
实现：
    示例
    interface Person {
    name: string;
    age: number;
    address: string;
    }
    type OmittedPerson = MyOmit<Person, 'age' | 'address'>;
    // 期望结果: { name: string; }
```
 */
type MyOmit<T, K extends keyof T> = {
    [P in keyof T as P extends K ? never : P]: T[P]
}
interface Person {
    name: string;
    age: number;
    address: string;
}
type OmittedPerson = MyOmit<Person, 'age' | 'address'>;
/***
 * 
 * type PickedPerson = MyPick<Person, 'name' | 'age'>;
// 期望结果: { name: string; age: number; }
 */
type MyPick<T, K extends keyof T> = {
    [p in K]: T[p]
}
type PickedPerson = MyPick<Person, 'name' | 'age'>;
/**
 * . Trim<S>
    难度： 中等
    题目： 实现一个 Trim<S> 类型，用于移除字符串字面量类型 S 两侧的空白字符（包括空格 ' '、换行符 \n、制表符 \t）。
    实现：
    // 示例
    type T1 = Trim<' Hello World '>; // 'Hello World'
    type T2 = Trim<'\n\tfoo bar \n'>; // 'foo bar'
 */
type flag = ' ' | '\n' | '\t'
type TrimLeft<S extends string> = S extends `${flag}${infer R}` ? TrimLeft<R> : S
type TrimRight<S extends string> = S extends `${infer R}${flag}` ? TrimRight<R> : S
type Trim<S extends string> = TrimRight<TrimLeft<S>>
type T1 = Trim<' Hello World '>; // 'Hello World'
/***
 * ReplaceAll<S, From, To>
难度： 中等
题目： 实现一个 ReplaceAll<S, From, To> 类型，将字符串 S 中所有出现的子字符串 From 替换为 To。
 * 
 */
type ReplaceAll<S extends string, From extends string, To extends string> =

