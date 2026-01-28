module.exports = function (babel) {
    const { types: t } = babel;

    return {
        name: "remove-console-log",
        visitor: {
            CallExpression(path) {
                // 判断是否为 console.log(...)
                if (
                    t.isMemberExpression(path.node.callee) &&
                    t.isIdentifier(path.node.callee.object, { name: "console" }) &&
                    t.isIdentifier(path.node.callee.property, { name: "log" })
                ) {
                    path.remove();
                }
            }
        }·
};
